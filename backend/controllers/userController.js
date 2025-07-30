// Контроллер пользователей 

// Содержит:
// - Регистрация студента или куратора
// - Вход по логину и паролю
// - Получение списка всех пользователей
// - Получение основной информации для профиля о пользователе

const { User } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: './omni.env' });

// Регистрация студента или куратора
const registerUser = async (req, res) => {
  try {
    const { password, role, firstName, lastName, studentId, curatorLogin } = req.body;

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

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      login,
      password: hashed,
      role,
      firstName,
      lastName,
      middleName: req.body.middleName || null,
      email: req.body.email || null,
      group: req.body.group || null,
      studentIdNumber: req.body.studentId || null,
      avatar: '/static/default-avatar.png'
    });

    res.status(201).json({ message: 'Пользователь зарегистрирован' });

  } catch (e) {
    console.error(e);
    res.status(500).json({ detail: 'Ошибка регистрации' });
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
  const { login } = req.params;

  try {
    const user = await User.findOne({
      where: { login },
      attributes: ['login', 'firstName', 'lastName', 'middleName', 'group', 'role']
    });

    if (!user) return res.status(404).json({ detail: 'Пользователь не найден' });

    res.json({
      login: user.login,
      firstName: user.firstName,
      lastName: user.lastName,
      patronymic: user.middleName,
      group: user.group,
      role: user.role
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ detail: 'Ошибка при получении профиля пользователя' });
  }
};

// Экспорт
module.exports = {
  registerUser,
  loginUser,
  getAllUsers,
  getUserProfile
};

