// Контроллер уведомлений

// Содержит:
// - Создание уведомления для мероприятий
// - Получение уведомлений пользователя
// - Удаление всех уведомлений

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
      include: [
        Event,
        { model: User, as: 'Inviter', attributes: ['login','lastName','firstName','middleName','group'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(notifs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: 'Ошибка при получении уведомлений' });
  }
};

// Удаление всех уведомлений
exports.deleteAllUserNotifications = async (req, res) => {
  try {
    const { login } = req.params;
    await Notification.destroy({ where: { recipientLogin: login } });
    res.json({ message: 'Все уведомления удалены' });
  } catch (error) {
    console.error('Ошибка при удалении всех уведомлений:', error);
    res.status(500).json({ detail: 'Не удалось удалить уведомления' });
  }
};