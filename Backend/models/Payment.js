export default (sequelize, DataTypes) => {
  const Payment = sequelize.define('Payment', {
    request_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'requests',
        key: 'id',
      },
    },
    amount: {
      type: DataTypes.DECIMAL,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('paid', 'unpaid'),
      defaultValue: 'unpaid',
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'payments',
    timestamps: true,
  });

  Payment.associate = (models) => {
    Payment.belongsTo(models.Request, {
      foreignKey: 'request_id',
      as: 'request',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  };

  return Payment;
};
