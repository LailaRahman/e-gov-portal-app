export default (sequelize, DataTypes) => {
  const Service = sequelize.define('Service', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fee: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    department_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'departments', // lowercase to match DB table name
        key: 'id',
      },
    },
  }, {
    tableName: 'services',  // lowercase table name
    timestamps: true,
    underscored: true,
  });

  Service.associate = (models) => {
    Service.belongsTo(models.Department, {
      foreignKey: 'department_id',
      as: 'department',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    Service.hasMany(models.Request, {
      foreignKey: 'service_id',
      as: 'requests',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  };

  return Service;
};
