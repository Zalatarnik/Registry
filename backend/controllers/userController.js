// Контроллер пользователей 

// Содержит:
// - Регистрация студента или куратора
// - Вход по логину и паролю
// - Получение списка всех пользователей
// - Получение основной информации для профиля о пользователе


const { User } = require('../models');

// Проверка роли, валидация логина и регистрация пользователя
exports.registerUser = async (req, res) => {
  try {
    const { password, role, firstName, lastName, studentId, curatorLogin } = req.body;

    let login;
    
    // Опреляем логин на основании кто пользователь
    if (role === 'student') {
      if (!studentId) {
        return res.status(400).json({ detail: 'Номер студенческого билета обязателен' });
      }
      login = studentId;
    } else if (role === 'curator') {
      if (!curatorLogin) {
        return res.status(400).json({ detail: 'Логин обязателен для куратора' });
      }
      login = curatorLogin;
    } else {
      return res.status(400).json({ detail: 'Некорректная роль пользователя' });
    }

    // Создание пользователя
    const user = await User.create({
      login,
      password,
      role,
      firstName,
      lastName,
      middleName: req.body.middleName || null,
      email: req.body.email || null,
      group: req.body.group || null,
      studentIdNumber: req.body.studentId || null, 
      avatar: '/static/default-avatar.png'
    });

    res.status(201).json(user);

  } catch (e) {
    console.error(e);
    res.status(500).json({ detail: 'Ошибка регистрации' });
  }
};

// Простая проверка логина и пароля без шифрования
exports.loginUser = async (req, res) => {
  const { login, password } = req.body;

  // Поиск пользователя по логину
  const user = await User.findOne({ where: { login } });

  if (!user) {
    return res.status(401).json({ detail: 'Неверный логин или пароль' });
  }

  if (user.password !== password) {
    return res.status(401).json({ detail: 'Неверный логин или пароль' });
  }

  // возврат кратой инфы о пользователе
  res.json({
    login: user.login,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  });
};

// Возвращает список всех пользователей с основной информацией
exports.getAllUsers = async (req, res) => {
  try {
    // Запрашиваются основные поля (без пароля)
    const users = await User.findAll({
      attributes: [
        'id', 'login', 'firstName', 'lastName',
        'middleName', 'email', 'role',
        'group', 'studentIdNumber', 'avatar'
      ]
    });
    res.json(users); // Отправка списка пользователей
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Ошибка при получении пользователей' });
  }
};

// Получение основной информации для профиля о пользователе
exports.getUserProfile = async (req, res) => {
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