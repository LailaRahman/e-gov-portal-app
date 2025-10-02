export default (sequelize, DataTypes) => {
  const Department = sequelize.define(
    'Department',
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
    },
    {
      freezeTableName: true, // Prevent Sequelize pluralizing table name
      tableName: 'departments',
      timestamps: true,
    }
  );

  Department.associate = (models) => {
    Department.hasMany(models.Service, {
      foreignKey: 'department_id',
      as: 'services',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    Department.hasMany(models.User, {
      foreignKey: 'department_id',
      as: 'users',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  };

  return Department;
};
