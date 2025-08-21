// Контроллер для управления мероприятиями 

// Содержит :
//  - Создание нового мероприятия с прикреплёнными файлами
//  - Получение всех мероприятий
//  - Удаление мероприятия и связанных данных
//  - Регистрация пользователя (и его команды) на мероприятие
//  - Получение всех регистраций на конкретное мероприятие
//  - Получение списка мероприятий на которые записан пользователь
//  - Скачать все документы мероприятия в zip
//  - Получение количества записавшихся на мероприятие
//  - Удалить всю группу участников по eventId и submissionGroupId

const { Event, User, EventRegistration } = require('../models');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const transliterate = require('../utils/transliterate');
const { Sequelize } = require('sequelize');

// Создать мероприятие
exports.createEvent = async (req, res) => {
  try {
    const {
      eventName, leader, organizer, location, eventStatus,
      eventDate, maxParticipants, teamSize, description, user_login
    } = req.body;

    // Проверка существования пользователя
    const user = await User.findOne({ where: { login: user_login } });
    if (!user) return res.status(404).json({ detail: 'Пользователь не найден' });

    // Создание нового мероприятия 
    const newEvent = await Event.create({
      eventName,
      leader,
      organizer,
      location,
      eventStatus,
      eventDate: new Date(eventDate),
      maxParticipants: parseInt(maxParticipants),
      teamSize: parseInt(teamSize),
      description,
      userId: user.id
    });

    // Базовая папка для файлов мероприятия
    const baseDir = path.join(__dirname, '..', 'uploads', `event_${newEvent.id}`);
    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });

    // Обработка обложки
    if (req.files && req.files.image) {
      const imageFile = req.files.image[0];
      const imageDir = path.join(baseDir, 'image');
      if (!fs.existsSync(imageDir)) fs.mkdirSync(imageDir, { recursive: true });

      const imagePath = path.join(imageDir, imageFile.originalname);
      fs.writeFileSync(imagePath, imageFile.buffer);

      // сохраняем путь в БД
      newEvent.coverImage = `/uploads/event_${newEvent.id}/image/${imageFile.originalname}`;
      await newEvent.save();
    }

    // Обработка документов
    if (req.files && req.files.documents) {
      const docsDir = path.join(baseDir, 'documents');
      if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

      for (const doc of req.files.documents) {
        const filePath = path.join(docsDir, doc.originalname);
        fs.writeFileSync(filePath, doc.buffer);
      }
    }

    res.status(201).json({ detail: 'Мероприятие успешно создано', eventId: newEvent.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Ошибка при создании мероприятия' });
  }
};

// Получить все мероприятия
exports.getAllEvents = async (req, res) => {
  try {
    const events = await Event.findAll({
      attributes: [
        'id', 'eventName', 'leader', 'organizer', 'location',
        'eventStatus', 'eventDate', 'description',
        'maxParticipants', 'teamSize', 'coverImage', 'userId',
        [Sequelize.fn('COUNT', Sequelize.col('EventRegistrations.id')), 'currentCount']
      ],
      include: [
        { model: EventRegistration, attributes: [] }
      ],
      group: ['Event.id'],
      order: [['eventDate', 'DESC']]
    });

    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: 'Ошибка при получении мероприятий' });
  }
};

// Удалить мероприятие
exports.deleteEvent = async (req, res) => {
  const { id } = req.params;
  try {
    const event = await Event.findByPk(id);
    if (!event) return res.status(404).json({ detail: 'Мероприятие не найдено' });

    // проверяем: только создатель может удалить
    if (!req.user || req.user.id !== event.userId) {
      return res.status(403).json({ detail: 'Вы не являетесь создателем мероприятия' });
    }

    await event.destroy();

    const uploadsDir = path.join(__dirname, '..', 'uploads', `event_${id}`);
    if (fs.existsSync(uploadsDir)) {
      fs.rmSync(uploadsDir, { recursive: true, force: true });
    }

    await EventRegistration.destroy({ where: { eventId: id } });

    res.status(200).json({ detail: 'Мероприятие удалено' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Ошибка при удалении мероприятия' });
  }
};

// Запись на мероприятие
exports.registerForEvent = async (req, res) => {
  const { eventId } = req.params;
  const { user_login, participants } = req.body;

  try {
    const event = await Event.findByPk(eventId);
    if (!event) return res.status(404).json({ detail: 'Мероприятие не найдено' });

    const existing = await EventRegistration.findOne({
      where: { eventId, userLogin: user_login }
    });

    if (existing) {
      return res.status(400).json({ detail: 'Вы уже зарегистрированы' });
    }

    const submissionGroupId = uuidv4(); // для объединения участников команды

    const entries = participants.map(p => ({
      eventId,
      userLogin: user_login,
      fullName: p.fullName,
      group: p.group,
      submissionGroupId
    }));

    await EventRegistration.bulkCreate(entries);

    res.status(201).json({ message: 'Регистрация прошла успешно' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Ошибка при регистрации' });
  }
};

// Получить список записавшихся на мероприятие
exports.getEventRegistrations = async (req, res) => {
  const { eventId } = req.params;
  try {
    // Поиск всех регистраций
    const regs = await EventRegistration.findAll({
      where: { eventId },
      order: [['submissionGroupId', 'ASC']]
    });

    // Возврат упращенной структуры
    res.json(regs.map(reg => ({
      id: reg.id,
      full_name: reg.fullName,
      group: reg.group,
      submission_group_id: reg.submissionGroupId,
      userLogin: reg.userLogin
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Ошибка получения регистраций' });
  }
};

// Получить список мероприятий на которые записан определенный пользователь
exports.getUserRegistrations = async (req, res) => {
  const { login } = req.params;

  try {
    // Получение всех регистраций пользователя + инфа о мероприятии
    const registrations = await EventRegistration.findAll({
      where: { userLogin: login },
      include: [{ model: Event }],
    });

    // Извлечение id мероприятия
    const eventIds = registrations.map(reg => reg.eventId);

    res.json(eventIds); 
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Ошибка получения регистраций пользователя' });
  }
};

// Скачать все документы мероприятия в zip
exports.downloadEventDocuments = async (req, res) => {
  const { eventId } = req.params;

  try {
    const event = await Event.findByPk(eventId);
    if (!event) return res.status(404).json({ detail: 'Мероприятие не найдено' });

    const docsDir = path.join(__dirname, '..', 'uploads', `event_${eventId}`, 'documents');
    if (!fs.existsSync(docsDir)) {
      return res.status(404).json({ detail: 'Файлы не найдены' });
    }

    // транслитерация + замена пробелов
    const safeName = transliterate(event.eventName).replace(/\s+/g, '_');
    const zipName = `${safeName || 'event'}_documents.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);
    archive.directory(docsDir, false);
    await archive.finalize();
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Ошибка при формировании архива' });
  }
};

// Получение количества записавшихся н мероприятие
exports.getRegistrationCounts = async (req, res) => {
  try {
    const counts = await EventRegistration.findAll({
      attributes: ['eventId', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
      group: ['eventId'],
      raw: true,
    });

    const map = {};
    for (const row of counts) {
      map[row.eventId] = Number(row.count);
    }
    res.json(map);
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Ошибка получения количества регистраций' });
  }
};

// Удалить всю группу участников по eventId и submissionGroupId
exports.removeGroupBySubmissionId = async (req, res) => {
  const { eventId, submissionGroupId } = req.params;

  try {
    const deleted = await EventRegistration.destroy({
      where: { eventId, submissionGroupId }
    });

    if (!deleted) {
      return res.status(404).json({ detail: 'Группа не найдена' });
    }

    return res.json({ detail: 'Группа участников удалена', deleted });
  } catch (error) {
    console.error('Ошибка при удалении группы:', error);
    return res.status(500).json({ detail: 'Ошибка при удалении группы' });
  }
};