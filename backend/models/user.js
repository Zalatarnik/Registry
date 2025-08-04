// Модель пользователя

module.exports = (sequelize, DataTypes) => {
  return sequelize.define('User', {
    login:           { type: DataTypes.STRING,  unique: true },
    password:        { type: DataTypes.STRING,  unique: false },
    firstName:       { type: DataTypes.STRING,  unique: false },
    lastName:        { type: DataTypes.STRING,  unique: false },
    middleName:      { type: DataTypes.STRING,  unique: false },
    email:           { type: DataTypes.STRING,  unique: true },
    role:            { type: DataTypes.ENUM('student', 'curator'), unique: false },
    group:           { type: DataTypes.STRING,  unique: false },
    studentIdNumber: { type: DataTypes.STRING,  unique: true },
    avatar:          { type: DataTypes.STRING,  unique: false },
    position:        { type: DataTypes.STRING,  allowNull: true, unique: false }

  });
};