// Главный файл моделей. Здесь собираются все модели в одно место
// Также описываются связи между пользователями и заявками

const Sequelize = require('sequelize');
const sequelize = require('../db');

// Импортируем все модели и передаем в них подключение
const User = require('./user')(sequelize, Sequelize.DataTypes);
const Request = require('./request')(sequelize, Sequelize.DataTypes);
const Event = require('./event')(sequelize, Sequelize.DataTypes);
const EventRegistration = require('./eventRegistration')(sequelize, Sequelize.DataTypes);
const Message = require('./message')(sequelize, Sequelize.DataTypes);

// ОПИСАНИЕ СВЯЗЕЙ
// Пользователь может иметь много заявок
User.hasMany(Request, { foreignKey: 'userId' });
Request.belongsTo(User, { foreignKey: 'userId' });
// Пользователь может создавать мероприятия
User.hasMany(Event, { foreignKey: 'userId' });
Event.belongsTo(User, { foreignKey: 'userId' });
// Мероприятие может содержать много регистраций 
Event.hasMany(EventRegistration, { foreignKey: 'eventId' });
EventRegistration.belongsTo(Event, { foreignKey: 'eventId' });
// Заявка может иметь много сообщений
Request.hasMany(Message, { foreignKey: 'requestId' });
Message.belongsTo(Request, { foreignKey: 'requestId' });
// Пользователь может отправлять сообщения по логину
User.hasMany(Message, { foreignKey: 'senderLogin', sourceKey: 'login' });
Message.belongsTo(User, { foreignKey: 'senderLogin', targetKey: 'login' });

// Экспорт моделей и подключение к БД
module.exports = { sequelize, User, Request, Event, EventRegistration, Message };

