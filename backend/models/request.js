// Модель заявки, которую заполняет студент

module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Request', {
    eventName: DataTypes.STRING,
    leader: DataTypes.STRING,
    organizer: DataTypes.STRING,
    location: DataTypes.STRING,
    eventStatus: DataTypes.STRING,
    eventDate: DataTypes.DATE,
    link: DataTypes.STRING,
    description: DataTypes.TEXT,

    status: {
    type: DataTypes.ENUM('На рассмотрении', 'Одобрено', 'Отклонено'),
    defaultValue: 'На рассмотрении'
  }
 });
};