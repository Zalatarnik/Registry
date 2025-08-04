// Контроллер сообщений чата

// Содержит:
// - Получени всех сообщений
// - Отправка нового сообщения

const { Message, User } = require('../models');

// Получить все сообщения по заявке, связанные с определенной заявкой
exports.getMessagesForRequest = async (req, res) => {
  try {
    const requestId = req.params.requestId;
    // Запрашиваем все сообщения с данными отправителя
    const messages = await Message.findAll({
      where: { requestId },
      include: [{
        model: User,
        attributes: ['login', 'firstName', 'lastName']
      }],
      // Сортируем по времени
      order: [['createdAt', 'ASC']] 
    });

    // Формируем ответ
    const result = messages.map(msg => ({
      id: msg.id,
      text: msg.text,
      created_at: msg.createdAt,
      sender: {
        login: msg.User.login,
        first_name: msg.User.firstName,
        last_name: msg.User.lastName
      }
    }));

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Ошибка при загрузке сообщений' });
  }
};

// Отправить сообщение
exports.sendMessage = async (req, res) => {
  try {
    const requestId = req.params.requestId;
    const { text, sender_login } = req.body;

    // Проверака отправителя на его существование
    const user = await User.findOne({ where: { login: sender_login } });
    if (!user) return res.status(404).json({ detail: 'Пользователь не найден' });
 
    // Новое сообщени в БД
    const message = await Message.create({ text, senderLogin: sender_login, requestId });

    // Отправляем подтверждение с данными отправителя
    res.status(201).json({
      id: message.id,
      text: message.text,
      created_at: message.createdAt,
      sender: {
        login: user.login,
        first_name: user.firstName,
        last_name: user.lastName
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Ошибка при отправке сообщения' });
  }
};