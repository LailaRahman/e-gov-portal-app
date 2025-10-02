export default function initRequest(sequelize, DataTypes) {
  const Request = sequelize.define(
    'Request',
    {
      description: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('submitted', 'under_review', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'submitted',
      },
      service_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      citizen_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      reviewed_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      payment_status: {
        type: DataTypes.ENUM('pending', 'paid', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      payment_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: 'requests',
      timestamps: true,
      underscored: true,
    }
  );

  Request.associate = (models) => {
    Request.belongsTo(models.Service, {
      foreignKey: 'service_id',
      as: 'service',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    Request.belongsTo(models.User, {
      foreignKey: 'citizen_id',
      as: 'Citizen',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    Request.belongsTo(models.User, {
      foreignKey: 'reviewed_by',
      as: 'Reviewer',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    Request.hasMany(models.Document, {
      foreignKey: 'request_id',
      as: 'documents',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  };

  return Request;
}
