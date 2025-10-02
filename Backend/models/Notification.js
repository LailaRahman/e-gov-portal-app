module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
    message: {
      type: DataTypes.STRING,
      allowNull: false
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'Notifications', // Ensures that the model uses the correct table name
    timestamps: true // Optional: Add timestamps to track creation and updates
  });

  Notification.associate = models => {
    // Associate with User model, assuming a Notification is linked to a User
    Notification.belongsTo(models.User, {
      foreignKey: 'UserId', // UserId is the foreign key in Notifications table
      onDelete: 'CASCADE', // When a User is deleted, cascade delete their notifications
      onUpdate: 'CASCADE' // When a User is updated, cascade update their notifications
    });
  };

  return Notification;
};
