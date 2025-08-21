// Контроллер заявок на мероприятия

// Содержит:
// - Создание заявки 
// - Получение заявок по пользователю
// - Обновление заявки и файлов
// - Удаление заявки и очистка файлов
// - Получение всех заявок 
// - Подтверждение или отклонение заявки
// - Архивация и скачивание всех файлов заявки

const { Request, User } = require('../models');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const transliterate = require('../utils/transliterate');

// Создание заявки 
exports.createRequest = async (req, res) => {
  try {
    // Получаем данные из тела запроса
    const {
      eventName, leader, organizer,
      location, eventStatus, eventDate,
      user_login, link, description
    } = req.body;

     // Ищем пользователя по логину
    const user = await User.findOne({ where: { login: user_login } });
    if (!user) return res.status(404).json({ detail: 'Пользователь не найден' });

     // Создаём заявку в базе данных
    const newRequest = await Request.create({
      eventName, leader, organizer,
      location, eventStatus,
      eventDate: new Date(eventDate),
      link, description,
      userId: user.id
    });

     // Если есть прикреплённые файлы — сохраняем их
    if (req.files && req.files.length > 0) {
    const uploadsDir = path.join(__dirname, '..', 'uploads', `request_${newRequest.id}`);

    // Создаём папку для файлов заявки, если её нет
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const savedNames = new Set();

    for (const file of req.files) {
      // Пропускаем дубликат
      if (savedNames.has(file.originalname)) continue; 
      savedNames.add(file.originalname);

      const filePath = path.join(uploadsDir, file.originalname);
      fs.writeFileSync(filePath, file.buffer);
    }
  }

     // Отправляем ответ
    res.status(201).json({ detail: 'Заявка успешно создана' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Ошибка при создании заявки' });
  }
};

// Получение всех заявок по логину пользователя
exports.getRequestsByStudent = async (req, res) => {
  const { login } = req.params;
  try {
    const user = await User.findOne({ where: { login } });
    if (!user) return res.status(404).json({ detail: 'Пользователь не найден' });

    // Получаем все заявки этого пользователя
    const requests = await Request.findAll({
      where: { userId: user.id },
      order: [['createdAt', 'DESC']]
    });

    // Добавляем информацию о прикреплённых файлах
    const enrichedRequests = requests.map(req => {
      const requestDir = path.join(__dirname, '..', 'uploads', `request_${req.id}`);
      let files = [];
      if (fs.existsSync(requestDir)) {
        files = fs.readdirSync(requestDir).map(name => ({
          name,
          url: `/uploads/request_${req.id}/${name}`
        }));
      }
      return {
        id: req.id,
        eventName: req.eventName,
        leader: req.leader,
        organizer: req.organizer,
        location: req.location,
        eventStatus: req.eventStatus,
        eventDate: req.eventDate,
        description: req.description,
        link: req.link,
        status: req.status, 
        files
      };
    });

    // Ответ
    res.json(enrichedRequests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Ошибка при загрузке заявок' });
  }
};

// Обновление информации заявки и файлов
exports.updateRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      eventName, leader, organizer, location,
      eventStatus, eventDate, existingFiles
    } = req.body;

    // Находим заявку по её id
    const request = await Request.findByPk(id);
    if (!request) return res.status(404).json({ detail: 'Заявка не найдена' });

    // Обновляем поля в заявке
    await request.update({
      eventName,
      leader,
      organizer,
      location,
      eventStatus,
      eventDate: new Date(eventDate)
    });

    const uploadsDir = path.join(__dirname, '..', 'uploads', `request_${id}`);
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    // Оставляем только указанные файлы, удаляем лишние
    const keepFiles = JSON.parse(existingFiles || '[]').map(f => f.name);
    const currentFiles = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : [];
    const toDelete = currentFiles.filter(f => !keepFiles.includes(f));
    toDelete.forEach(f => fs.unlinkSync(path.join(uploadsDir, f)));

    // Добавляем новые файлы, если они есть
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const filePath = path.join(uploadsDir, file.originalname);
        fs.writeFileSync(filePath, file.buffer);
      }
    }

    // Возвращаем обновлённую информацию о заявке
    res.json({
      id: request.id,
      eventName: request.eventName,
      leader: request.leader,
      organizer: request.organizer,
      location: request.location,
      eventStatus: request.eventStatus,
      eventDate: request.eventDate,
      description: request.description,
      link: request.link,
      status: 'Pending',
      files: fs.existsSync(uploadsDir)
        ? fs.readdirSync(uploadsDir).map(name => ({ name, url: `/uploads/request_${id}/${name}` }))
        : []
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Ошибка при обновлении заявки' });
  }
};

// Удаление заявки и всех файлов с ней связанныъ
exports.deleteRequest = async (req, res) => {
  const { id } = req.params;
  try {
    const request = await Request.findByPk(id);
    if (!request) return res.status(404).json({ detail: 'Заявка не найдена' });

   // Удаляем заявку из базы
    await request.destroy();

    // Удаляем связанные файлы
    const uploadsDir = path.join(__dirname, '..', 'uploads', `request_${id}`);
    if (fs.existsSync(uploadsDir)) {
      fs.rmSync(uploadsDir, { recursive: true, force: true });
    }

    res.status(200).json({ detail: 'Заявка удалена' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Ошибка при удалении заявки' });
  }
};

// Получение списка всех заявок с данными владельца
exports.getAllRequests = async (req, res) => {
  try {
    const requests = await Request.findAll({
      include: [
        {
          model: User,
          attributes: ['firstName', 'lastName', 'login']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Добавляем файлы и информацию о владельце 
    const enrichedRequests = requests.map(req => {
      const requestDir = path.join(__dirname, '..', 'uploads', `request_${req.id}`);
      let files = [];

      if (fs.existsSync(requestDir)) {
        files = fs.readdirSync(requestDir).map(name => ({
          name,
          url: `/uploads/request_${req.id}/${name}`
        }));
      }

      return {
        id: req.id,
        eventName: req.eventName,
        leader: req.leader,
        organizer: req.organizer,
        location: req.location,
        eventStatus: req.eventStatus,
        eventDate: req.eventDate,
        description: req.description,
        link: req.link,
        files,
        status: req.status || 'На рассмотрении',
        created_at:req.createdAt,

        owner: req.User
          ? {
              firstName: req.User.firstName,
              lastName: req.User.lastName,
              login: req.User.login
            }
          : {
              firstName: 'Неизвестно',
              lastName: '',
              login: 'удалён'
            }
      };
    });

    res.json(enrichedRequests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Ошибка при получении заявок' });
  }
};

// Подтверждение заявки
exports.approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await Request.findByPk(id);
    if (!request) return res.status(404).json({ detail: 'Заявка не найдена' });

    request.status = 'Одобрено';
    await request.save();

    res.json({ status: request.status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Ошибка при одобрении заявки' });
  }
};

// Отклонение заявки
exports.rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await Request.findByPk(id);
    if (!request) return res.status(404).json({ detail: 'Заявка не найдена' });

    request.status = 'Отклонено';
    await request.save();

    res.json({ status: request.status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Ошибка при отклонении заявки' });
  }
};

// Скачивание всех файлов заявки одним архивом
exports.downloadRequestFilesAsZip = async (req, res) => {
  const { id } = req.params;

  // Получаем заявку с пользователем
  const request = await Request.findByPk(id, {
    include: {
      model: User,
      attributes: ['firstName', 'lastName', 'middleName']
    }
  });

  if (!request) return res.status(404).json({ detail: 'Заявка не найдена' });

  const requestDir = path.join(__dirname, '..', 'uploads', `request_${id}`);
  if (!fs.existsSync(requestDir)) {
    return res.status(404).json({ detail: 'Файлы не найдены' });
  }

  // Формируем имя файла с транслитерацией
  const fullName = `${request.User.lastName}_${request.User.firstName}_${request.User.middleName || ''}`;
  const event = request.eventName || 'event';

  const zipFileNameRaw = `${fullName}_${event}`;
  const zipFileNameTranslit = transliterate(zipFileNameRaw); // транслитерация
  const zipFileNameSanitized = zipFileNameTranslit
    .replace(/\s+/g, '_') // пробелы → _
    .replace(/[^a-zA-Z0-9_\-]/g, ''); // убираем всё лишнее

  const finalName = `${zipFileNameSanitized || 'files'}_${id}.zip`;

  // Заголовки для загрузки
  res.setHeader('Content-Disposition', `attachment; filename="${finalName}"`);
  res.setHeader('Content-Type', 'application/zip');

  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.on('error', err => res.status(500).send({ error: err.message }));

  archive.pipe(res);
  archive.directory(requestDir, false);
  archive.finalize();
};