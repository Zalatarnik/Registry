// Роуты для уведомлений
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

// Создание уведомления для мероприятий
router.post('/notifications', authMiddleware, notificationController.createNotification);
// Получение уведомлений пользователя
router.get('/notifications/:login', authMiddleware, notificationController.getUserNotifications);

module.exports = router;