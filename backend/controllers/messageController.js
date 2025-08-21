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
      include: [
        { model: User, as: 'Sender', attributes: ['login', 'firstName', 'lastName', 'avatar', 'role'] },
        { model: User, as: 'Recipient', attributes: ['login', 'firstName', 'lastName', 'avatar', 'role'] }
      ],
      // Сортируем по времени
      order: [['createdAt', 'ASC']] 
    });

    // Формируем ответ
    const result = messages.map(msg => ({
      id: msg.id,
      text: msg.text,
      created_at: msg.createdAt,
      sender: {
        login: msg.Sender.login,
        first_name: msg.Sender.firstName,
        last_name: msg.Sender.lastName,
        avatar: msg.Sender.avatar,
        role: msg.Sender.role
      },
      recipient: msg.Recipient
        ? {
            login: msg.Recipient.login,
            first_name: msg.Recipient.firstName,
            last_name: msg.Recipient.lastName,
            avatar: msg.Recipient.avatar,
            role: msg.Recipient.role
          }
        : null
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
    const { text, sender_login, recipient_login } = req.body;

    // Проверака отправителя на его существование
    if (!recipient_login) {
      return res.status(400).json({ detail: 'Получатель обязателен для сообщения' });
    }

    const user = await User.findOne({ where: { login: sender_login } });
    if (!user) return res.status(404).json({ detail: 'Отправитель не найден' });

    const recipient = await User.findOne({ where: { login: recipient_login } });
    if (!recipient) return res.status(404).json({ detail: 'Получатель не найден' });

    const message = await Message.create({
      text,
      senderLogin: sender_login,
      recipientLogin: recipient.login,
      requestId
    });

    // Отправляем подтверждение с данными отправителя
    res.status(201).json({
      id: message.id,
      text: message.text,
      created_at: message.createdAt,
      sender: {
        login: user.login,
        first_name: user.firstName,
        last_name: user.lastName,
        avatar: user.avatar,
        role: user.role
      },
      recipient: {
        login: recipient.login,
        first_name: recipient.firstName,
        last_name: recipient.lastName,
        avatar: recipient.avatar,
        role: recipient.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Ошибка при отправке сообщения' });
  }
};