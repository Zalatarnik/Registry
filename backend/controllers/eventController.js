// Контроллер для управления мероприятиями 

// Содержит :
//  - Создание нового мероприятия с прикреплёнными файлами
//  - Получение всех мероприятий
//  - Удаление мероприятия и связанных данных
//  - Регистрация пользователя (и его команды) на мероприятие
//  - Получение всех регистраций на конкретное мероприятие
//  - Получение списка мероприятий на которые записан пользователь
 
const { Event, User, EventRegistration } = require('../models');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

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

    // Если файлы переданы, то сохранить
    if (req.files && req.files.length > 0) {
      const uploadsDir = path.join(__dirname, '..', 'uploads', `event_${newEvent.id}`);
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

      for (const file of req.files) {
        const filePath = path.join(uploadsDir, file.originalname);
        fs.writeFileSync(filePath, file.buffer);
      }
    }

    res.status(201).json({ detail: 'Мероприятие успешно создано' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Ошибка при создании мероприятия' });
  }
};

// Получить все мероприятия
exports.getAllEvents = async (req, res) => {
  try {
    const events = await Event.findAll({ order: [['eventDate', 'DESC']] });
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
      submission_group_id: reg.submissionGroupId
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