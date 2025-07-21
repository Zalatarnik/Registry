// Роуты для работы с заявками

const express = require('express');
const router = express.Router();
const multer = require('multer');
const requestController = require('../controllers/requestController');

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Создание новой заявки
router.post('/requests', upload.array('files'), requestController.createRequest);
// Получение всех заявок
router.get('/requests', requestController.getAllRequests); 
// Получение заявок по логину студента
router.get('/requests/student/:login', requestController.getRequestsByStudent);
// Обновление заявки по id (с возможностью загрузки новых файлов)
router.put('/requests/:id', upload.array('files'), requestController.updateRequest);
// Удаление заявки по id
router.delete('/requests/:id', requestController.deleteRequest);
// Подтверждение заявки
router.put('/requests/:id/approve', requestController.approveRequest);
// Отклонение заявки
router.put('/requests/:id/reject', requestController.rejectRequest);

module.exports = router;