// Роуты для работы с пользователями
const express        = require('express');
const router         = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const uploadMiddleware = require('../middleware/uploadAvatar');

/* ---------- публичные ---------- */
router.post('/register', userController.registerUser);
router.post('/login',    userController.loginUser);
router.get('/check-email', userController.checkEmailExists);
router.get('/check-student-id', userController.checkStudentIdExists);

/* --------- защищённые ---------- */
router.get('/profile/me',      authMiddleware, userController.getMyProfile); // мой профиль
router.put('/profile/security',authMiddleware, userController.updateSecurity); // смена пароля/почты
router.post('/profile/avatar', authMiddleware, uploadMiddleware.single('file'), userController.uploadAvatar); // аватар

router.get('/profile/:login',  authMiddleware, userController.getUserProfile);   // любой профиль
router.put('/profile/:login',  authMiddleware, userController.updateProfile);    // обновление
router.get('/users/all',       authMiddleware, userController.getAllUsers);      // список
router.post('/logout', authMiddleware, userController.logoutUser);



module.exports = router;


