// Модель мероприятия
module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Event', {
    eventName: DataTypes.STRING,
    leader: DataTypes.STRING,
    organizer: DataTypes.STRING,
    location: DataTypes.STRING,
    eventStatus: DataTypes.STRING,
    eventDate: DataTypes.DATE,
    description: DataTypes.TEXT,
    maxParticipants: DataTypes.INTEGER,
    teamSize: DataTypes.INTEGER
  });
};