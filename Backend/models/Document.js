export default (sequelize, DataTypes) => {
  const Document = sequelize.define('Document', {
    request_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'requests',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    file_path: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    file_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    original_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    tableName: 'documents',
    timestamps: true,
  });

  Document.associate = (models) => {
    Document.belongsTo(models.Request, {
      foreignKey: 'request_id',
      as: 'request',
    });
  };

  return Document;
};
