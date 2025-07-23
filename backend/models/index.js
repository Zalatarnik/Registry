// Главный файл моделей. Здесь собираются все модели в одно место
// Также описываются связи между пользователями и заявками

const Sequelize = require('sequelize');
const sequelize = require('../db');

const User = require('./user')(sequelize, Sequelize.DataTypes);
const Request = require('./request')(sequelize, Sequelize.DataTypes);

User.hasMany(Request, { foreignKey: 'userId' });
Request.belongsTo(User, { foreignKey: 'userId' });

module.exports = { sequelize, User, Request };