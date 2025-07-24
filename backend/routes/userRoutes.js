// Роуты для работы с пользователями
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Регистрация
router.post('/register', userController.registerUser);
//Вход
router.post('/login', userController.loginUser); 
// Получение всех пользователей
router.get('/users/all', userController.getAllUsers);
// Получение профиля
router.get('/profile/:login', userController.getUserProfile);
module.exports = router;
