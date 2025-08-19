// Модель для уведомлений
module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Notification', {
        recipientLogin: {
        type: DataTypes.STRING,
        allowNull: false
        },
        inviter: {
        type: DataTypes.STRING,
        allowNull: false
        },
         eventId: {
        type: DataTypes.INTEGER,
        allowNull: false
        },
        message: {
        type: DataTypes.STRING,
        allowNull: false
        },
        isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
        }
    });
};