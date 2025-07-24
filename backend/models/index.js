// Главный файл моделей. Здесь собираются все модели в одно место
// Также описываются связи между пользователями и заявками

const Sequelize = require('sequelize');
const sequelize = require('../db');

const User = require('./user')(sequelize, Sequelize.DataTypes);
const Request = require('./request')(sequelize, Sequelize.DataTypes);
const Event = require('./event')(sequelize, Sequelize.DataTypes);
const EventRegistration = require('./eventRegistration')(sequelize, Sequelize.DataTypes);

User.hasMany(Request, { foreignKey: 'userId' });
Request.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Event, { foreignKey: 'userId' });
Event.belongsTo(User, { foreignKey: 'userId' });

Event.hasMany(EventRegistration, { foreignKey: 'eventId' });
EventRegistration.belongsTo(Event, { foreignKey: 'eventId' });

module.exports = { sequelize, User, Request, Event, EventRegistration };
