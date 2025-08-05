// Контроллер пользователей 

// Содержит:
// - Регистрация студента или куратора
// - Вход по логину и паролю
// - Получение списка всех пользователей
// - Получение основной информации для профиля о пользователе

const { User } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: './.env' });

// Регистрация студента или куратора
const registerUser = async (req, res) => {
  try {
    const { password, role, firstName, lastName, studentId, curatorLogin, email } = req.body;

    let login;

    if (role === 'student') {
      if (!studentId) return res.status(400).json({ detail: 'Номер студенческого билета обязателен' });
      login = studentId;
    } else if (role === 'curator') {
      if (!curatorLogin) return res.status(400).json({ detail: 'Логин обязателен для куратора' });
      login = curatorLogin;
    } else {
      return res.status(400).json({ detail: 'Некорректная роль пользователя' });
    }

    const existing = await User.findOne({ where: { login } });
    if (existing) return res.status(400).json({ detail: 'Такой логин уже существует' });

    if (email) {
      const existingEmail = await User.findOne({ where: { email: email.trim() } });
      if (existingEmail) return res.status(400).json({ detail: 'Такая почта уже используется' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      login,
      password: hashed,
      role,
      firstName,
      lastName,
      middleName: req.body.middleName || null,
      email: req.body.email ? req.body.email.trim().toLowerCase() : null,
      group: req.body.group || null,
      studentIdNumber: req.body.studentId || null,
      avatar: '/static/default-avatar.png'
    });

    res.status(201).json({ message: 'Пользователь зарегистрирован' });

  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ detail: 'Такая почта уже используется' });
    }
    console.error(e);
    return res.status(500).json({ detail: 'Ошибка регистрации' });
  }

};

// Вход по логину и паролю
const loginUser = async (req, res) => {
  const { login, password } = req.body;

  try {
    const user = await User.findOne({ where: { login } });
    if (!user) return res.status(401).json({ detail: 'Неверный логин или пароль' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ detail: 'Неверный логин или пароль' });

    const token = jwt.sign(
      { id: user.id, login: user.login, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 24 * 60 * 60 * 1000 // 1 день
    });

    res.json({
      login: user.login,
      role: user.role
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: 'Ошибка при входе' });
  }
};

// Получение всех пользователей
const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: [
        'id', 'login', 'firstName', 'lastName',
        'middleName', 'email', 'role',
        'group', 'studentIdNumber', 'avatar'
      ]
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Ошибка при получении пользователей' });
  }
};

// Получение профиля по логину
const getUserProfile = async (req, res) => {
  try {
    // 1. /profile/me 
    if (req.params.login === 'me') {
      return res.json({
        login : req.user.login,
        role  : req.user.role
      });
    }

    // 2. /profile/:login
    const user = await User.findOne({
      where: { login: req.params.login },
      attributes: [
        'login', 'firstName', 'lastName',
        'middleName', 'group', 'role', 'studentIdNumber'
      ]
    });

    if (!user) {
      return res.status(404).json({ detail: 'Пользователь не найден' });
    }

    return res.json({
      login           : user.login,
      firstName       : user.firstName,
      lastName        : user.lastName,
      patronymic      : user.middleName,
      group           : user.group,
      role            : user.role,
      studentIdNumber : user.studentIdNumber
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ detail: 'Ошибка при получении профиля' });
  }
};

const updateProfile = async (req, res) => {
  const { login } = req.params;

  // Поля, которые разрешаем менять
  const {
    firstName,
    lastName,
    patronymic,
    group,        // для студентов
    position      // для кураторов
  } = req.body;

  try {
    // ищем пользователя
    const user = await User.findOne({ where: { login } });
    if (!user) return res.status(404).json({ detail: 'Пользователь не найден' });

    // обновляем только то, что пришло
    if (firstName  !== undefined) user.firstName  = firstName;
    if (lastName   !== undefined) user.lastName   = lastName;
    if (patronymic !== undefined) user.middleName = patronymic;
    if (group      !== undefined) user.group      = group;
    if (position   !== undefined) user.position   = position;

    await user.save();     // сохраняем в бд

    // Отдаём обратно клиенту обновлённые данные
    res.json({
      login:       user.login,
      firstName:   user.firstName,
      lastName:    user.lastName,
      patronymic:  user.middleName,
      group:       user.group,
      position:    user.position,
      studentIdNumber: user.studentIdNumber,
      role:        user.role,
      avatar:      user.avatar
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ detail: 'Ошибка при обновлении профиля' });
  }
};

const getMyProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: [
        'login', 'firstName', 'lastName', 'middleName',
        'group', 'role', 'studentIdNumber', 'position', 'avatar'
      ]
    });
    if (!user)
      return res.status(404).json({ detail: 'Пользователь не найден' });

    res.json(user);                 // возвращаем профиль
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: 'Ошибка при получении профиля' });
  }
};

// загрузка аватара
const uploadAvatar = async (req, res) => {
  // файл уже лежит в req.file благодаря multer
  if (!req.file) return res.status(400).json({ detail: 'Файл не получен' });

  try {
    const user = await User.findOne({ where: { login: req.body.login } });
    if (!user) return res.status(404).json({ detail: 'Пользователь не найден' });

    // сохраняем относительный путь, чтобы потом отдавать статикой
    user.avatar = `/uploads/avatars/${req.file.filename}`;
    await user.save();

    return res.json({
      login          : user.login,
      avatar         : user.avatar,
      firstName      : user.firstName,
      lastName       : user.lastName,
      patronymic     : user.middleName,
      group          : user.group,
      role           : user.role,
      studentIdNumber: user.studentIdNumber
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ detail: 'Ошибка при сохранении аватара' });
  }
};

const updateSecurity = async (req, res) => {
  try {
    const { email, old_password, new_password } = req.body;

    // ничего менять не попросили
    if (email === undefined && new_password === undefined)
      return res.status(400).json({ detail: 'Нечего обновлять' });

    // старый пароль обязателен
    if (!old_password)
      return res.status(400).json({ detail: 'Нужно указать старый пароль' });

    // находим пользователя
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ detail: 'Пользователь не найден' });

    // проверяем старый пароль
    const ok = await bcrypt.compare(old_password, user.password);
    if (!ok) return res.status(401).json({ detail: 'Старый пароль неверен' });

    // обновляем e-mail (если прислали)
    if (email !== undefined) {
      const trimmedEmail = email.trim();
      const emailTaken = await User.findOne({
        where: {
          email: trimmedEmail,
          id: { [Op.ne]: user.id }  // исключаем себя
        }
      });

      if (emailTaken) {
        return res.status(400).json({ detail: 'Такая почта уже используется' });
      }

      user.email = trimmedEmail;
    }

    // обновляем пароль (если прислали)
    if (new_password !== undefined)
      user.password = await bcrypt.hash(new_password, 10);

    await user.save();

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ detail: 'Ошибка обновления данных безопасности' });
  }
};


const { Op } = require('sequelize');
// Проверка на существующую почту
const checkEmailExists = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ taken: false });

    const user = await User.findOne({ where: { email: email.trim() } });
    return res.json({ taken: !!user });
  } catch (err) {
    return res.status(500).json({ detail: 'Ошибка при проверке email' });
  }
};

// Проверка на существующий студак
const checkStudentIdExists = async (req, res) => {
  try {
    const { studentIdNumber } = req.body;
    if (!studentIdNumber) return res.status(400).json({ taken: false });

    const user = await User.findOne({ where: { studentIdNumber: studentIdNumber.trim() } });
    return res.json({ taken: !!user });
  } catch (err) {
    return res.status(500).json({ detail: 'Ошибка при проверке студенческого' });
  }
};

// Выход из аккаунта
const logoutUser = (req, res) => {
  // Стираем ту же cookie, которую ставили при входе.
  res.clearCookie('token', {
    httpOnly : true,
    secure   : process.env.NODE_ENV === 'production',
    sameSite : 'Strict',
  });
  return res.json({ success: true });
};

// Экспорт
module.exports = {
  registerUser,
  loginUser,
  getAllUsers,
  getUserProfile,
  updateProfile,
  getMyProfile,
  uploadAvatar,
  updateSecurity,
  checkStudentIdExists,
  checkEmailExists,
  logoutUser
};

