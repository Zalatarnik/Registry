// Модель для регистрации на мероприятия
module.exports = (sequelize, DataTypes) => {
  return sequelize.define('EventRegistration', {
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    leaderLogin:{
      type: DataTypes.STRING,  
      allowNull: false 
    },
    participantLogin:{ 
      type: DataTypes.STRING,  
      allowNull: false 
    },
    fullName:        DataTypes.STRING,
    group:           DataTypes.STRING,
    submissionGroupId: DataTypes.STRING
  }, {
    indexes: [
      { unique: true, fields: ['eventId', 'participantLogin'] },
      { fields: ['eventId', 'submissionGroupId'] }
    ]
  });
};