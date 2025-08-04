const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const dest = path.join(__dirname, '..', 'uploads', 'avatars');
fs.mkdirSync(dest, { recursive: true });        // гарантируем папку

const storage = multer.diskStorage({
  destination: dest,
  filename   : (_, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `avatar_${Date.now()}${ext}`;
    cb(null, name);
  }
});

module.exports = multer({ storage });
