const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './omni.env' });

/** Проверка JWT из HttpOnly‑cookie */
module.exports = (req, res, next) => {
  const token = req.cookies?.token;          // cookie‑parser уже подключён

  if (!token) {
    return res.status(401).json({ detail: 'Нет токена' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('JWT decoded →', decoded);   // для быстрой проверки
    req.user = decoded;                      // { id, login, role }
    next();
  } catch (err) {
    return res.status(403).json({ detail: 'Неверный токен' });
  }
};
