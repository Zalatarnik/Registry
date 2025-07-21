// Главный файл сервера
// Здесь настраивается Express-приложение, подключаются роуты и запускается сервер
// Тут происходит подключение к базе данных через Sequelize

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { sequelize } = require('./models');

const app = express();
const PORT = 8000;
const path = require('path');

app.use(cors());
app.use(bodyParser.json());

//Роуты
app.use('/api', require('./routes/userRoutes'));
app.use('/api', require('./routes/requestRoutes'));

//Папки со статическими файлами
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/static', express.static(path.join(__dirname, 'static')));

//Синхранизация с БД и запуск сервера
sequelize.sync().then(() => {
  console.log('Database synced');
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Unable to connect to DB:', err);
});