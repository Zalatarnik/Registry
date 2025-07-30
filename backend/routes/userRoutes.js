// Роуты для работы с пользователями
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

/* -------- публичные -------- */
router.post('/register', userController.registerUser);
router.post('/login',    userController.loginUser);

/* -------- защищённые ------- */
router.get('/users/all',   authMiddleware, userController.getAllUsers);
router.get('/profile/:login', authMiddleware, userController.getUserProfile);

router.get('/profile/me', authMiddleware, (req, res) => {
  const { login, role } = req.user;
  res.json({ login, role });
});

module.exports = router;

