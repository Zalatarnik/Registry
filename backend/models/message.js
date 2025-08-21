// Модель сообщения для чата
module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Message', {
    text: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    senderLogin: {
      type: DataTypes.STRING,
      allowNull: false
    },
     recipientLogin: {             
      type: DataTypes.STRING,
      allowNull: true
    },
    requestId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  });
};