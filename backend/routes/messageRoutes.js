// Роуты для чата
const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

// Получить все сообщения по хаявке
router.get('/requests/:requestId/chat', messageController.getMessagesForRequest);
// Отправить сообщение по заявке
router.post('/requests/:requestId/chat', messageController.sendMessage);

module.exports = router;