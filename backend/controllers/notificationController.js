// Контроллер уведомлений

// Содержит:
// - Создание уведомления для мероприятий
// - Получение уведомлений пользователя

const { Notification, Event, User } = require('../models');

// Создание уведомления для мероприятий
exports.createNotification = async (req, res) => {
  try {
    const { recipientLogin, inviter, eventId } = req.body;

    const event = await Event.findByPk(eventId);
    if (!event) return res.status(404).json({ detail: 'Мероприятие не найдено' });

    const notif = await Notification.create({
      recipientLogin,
      inviter,
      eventId,
      message: `Вас пригласили на мероприятие "${event.eventName}"`
    });

    res.status(201).json(notif);
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: 'Ошибка при создании уведомления' });
  }
};

// Получение уведомлений пользователя
exports.getUserNotifications = async (req, res) => {
  try {
    const { login } = req.params;
    const notifs = await Notification.findAll({
      where: { recipientLogin: login },
      include: [Event],
      order: [['createdAt', 'DESC']]
    });
    res.json(notifs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: 'Ошибка при получении уведомлений' });
  }
};