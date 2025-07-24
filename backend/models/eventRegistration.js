// Модель для регистрации на мероприятия
module.exports = (sequelize, DataTypes) => {
  return sequelize.define('EventRegistration', {
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    userLogin: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fullName: DataTypes.STRING,
    group: DataTypes.STRING,
    submissionGroupId: DataTypes.STRING 
  });
};