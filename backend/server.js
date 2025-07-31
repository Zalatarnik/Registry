// Главный файл сервера
// Здесь настраивается Express-приложение, подключаются роуты и запускается сервер
// Тут происходит подключение к базе данных через Sequelize

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser'); 
const { sequelize } = require('./models');
const path = require('path');

const app = express();
const PORT = 8000;

// ───────── Middleware ─────────
app.use(cookieParser());
app.use(cors({
  origin: 'http://localhost:3000', // адрес фронта
  credentials: true               //  чтобы передавать куки
}));
app.use(bodyParser.json());
app.use(cookieParser()); 

// ───────── Роуты ─────────
app.use('/api', require('./routes/userRoutes'));
app.use('/api', require('./routes/requestRoutes'));
app.use('/api', require('./routes/eventRoutes'));

// ───────── Статика ─────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/static', express.static(path.join(__dirname, 'static')));

// ───────── Старт ─────────
sequelize.sync().then(() => {
  console.log('База данных синхронизирована');
  app.listen(PORT, () => {
    console.log(`Сервер работает на ${PORT}`);
  });
}).catch(err => {
  console.error('Невозможно подключиться к Базе данных:', err);
});
