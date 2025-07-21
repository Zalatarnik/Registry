// Подключение к базе данных PostgreSQL с помощью Sequelize
// Все параметры берутся из .env файла (он находиться в .gitignore поэтому нужно создать его себе)

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('registry_app', 'postgres', 'postgre', {
  host: 'localhost',
  dialect: 'postgres',
  port: 5432
});

module.exports = sequelize;