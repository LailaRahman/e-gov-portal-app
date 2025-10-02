import { Model, DataTypes } from 'sequelize';

export default function initUser(sequelize) {
  class User extends Model {
    static associate(models) {
      User.belongsTo(models.Department, {
        foreignKey: 'department_id',
        as: 'department',
      });

      User.hasMany(models.Request, {
        foreignKey: 'citizen_id',
        as: 'requests', // for citizens making requests
      });

      User.hasMany(models.Request, {
        foreignKey: 'reviewed_by',
        as: 'reviewedRequests', // for officers reviewing requests
      });

      User.hasMany(models.Payment, {
        foreignKey: 'user_id',
        as: 'payments',
      });
    }
  }

  User.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM('citizen', 'officer', 'headdepartment', 'admin'),
        allowNull: false,
        defaultValue: 'citizen',
      },
      national_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      dob: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      contact_info: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      department_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      job_title: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      reset_token: {
  type: DataTypes.STRING,
  allowNull: true,
},
reset_token_expires: {
  type: DataTypes.DATE,
  allowNull: true,
}

    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      timestamps: true,
    }
  );
  
  return User;
}
