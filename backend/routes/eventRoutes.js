const express = require('express');
const router = express.Router();
const multer = require('multer');
const eventController = require('../controllers/eventController');

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/events/create', upload.array('files'), eventController.createEvent);
router.get('/events', eventController.getAllEvents);
router.delete('/events/:id', eventController.deleteEvent);
router.post('/events/:eventId/register', eventController.registerForEvent);
router.get('/events/:eventId/registrations', eventController.getEventRegistrations);
router.get('/users/:login/registrations', eventController.getUserRegistrations);

module.exports = router;