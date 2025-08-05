// Роуты для работы с пользователями
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const uploadMiddleware = require('../middleware/uploadAvatar');

// Регистрация пользователя
router.post('/register', userController.registerUser);
// Авторизация
router.post('/login', userController.loginUser);
// Проверка существующего email
router.post('/check-email', userController.checkEmailExists);
// Проверка существующего номера студенческого
router.get('/check-student-id', userController.checkStudentIdExists);
// Получение своего профиля
router.get('/profile/me', authMiddleware, userController.getMyProfile);
// Обновление email и пароля
router.put('/profile/security', authMiddleware, userController.updateSecurity);
// Загрузка аватара
router.post('/profile/avatar', authMiddleware, uploadMiddleware.single('file'), userController.uploadAvatar);
// Получение профиля по логину
router.get('/profile/:login', authMiddleware, userController.getUserProfile);
// Обновление профиля
router.put('/profile/:login', authMiddleware, userController.updateProfile);
// Получение всех пользователей
router.get('/users/all', authMiddleware, userController.getAllUsers);
// Выход из аккаунта
router.post('/logout', authMiddleware, userController.logoutUser);

module.exports = router;
