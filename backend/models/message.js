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
    requestId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  });
};