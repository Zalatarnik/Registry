// Роуты для работы с мероприятиями
const express = require('express');
const router = express.Router();
const multer = require('multer');
const eventController = require('../controllers/eventController');
const authMiddleware = require('../middleware/authMiddleware');

// Сохранение файлов в памяти (не на диск)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Создание нового мероприятия (с поддержкой загрузки файлов)
router.post(
  '/events/create',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'documents' }
  ]),
  eventController.createEvent
);
// Получить список всех мероприятий
router.get('/events', eventController.getAllEvents);
// Удалить мероприятие по id
router.delete('/events/:id', authMiddleware, eventController.deleteEvent);
// Записать пользователя (или команду) на мероприятие
router.post('/events/:eventId/register', eventController.registerForEvent);
// Получить список всех зарегистрированных участников по мероприятию
router.get('/events/:eventId/registrations', eventController.getEventRegistrations);
//Получить список id мероприятий, на которые записан пользователь
router.get('/users/:login/registrations', eventController.getUserRegistrations);
// Скачать все документы мероприятия в zip
router.get('/events/:eventId/download-documents', eventController.downloadEventDocuments);

module.exports = router;
