// Модель пользователя

module.exports = (sequelize, DataTypes) => {
  return sequelize.define('User', {
    login:            { type: DataTypes.STRING,  unique: true },
    password:         DataTypes.STRING,
    firstName:        DataTypes.STRING,
    lastName:         DataTypes.STRING,
    middleName:       DataTypes.STRING,
    email:            DataTypes.STRING,
    role:             DataTypes.ENUM('student', 'curator'),
    group:            DataTypes.STRING,
    studentIdNumber:  DataTypes.STRING,
    avatar:           DataTypes.STRING,
    position:         { type: DataTypes.STRING, allowNull: true }
  });
};