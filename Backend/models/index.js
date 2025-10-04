import Sequelize from 'sequelize';
import sequelize from '../config/db.js'; // Sequelize instance

import initUser from './User.js';
import initDepartment from './Department.js';
import initService from './Service.js';
import initDocument from './Document.js';
import initRequest from './Request.js';
import initPayment from './Payment.js';
import initNotification from './Notification.js'; // <- new import

const User = initUser(sequelize, Sequelize.DataTypes);
const Department = initDepartment(sequelize, Sequelize.DataTypes);
const Service = initService(sequelize, Sequelize.DataTypes);
const Document = initDocument(sequelize, Sequelize.DataTypes);
const Request = initRequest(sequelize, Sequelize.DataTypes);
const Payment = initPayment(sequelize, Sequelize.DataTypes);
const Notification = initNotification(sequelize, Sequelize.DataTypes); // <- initialize

const models = {
  User,
  Department,
  Service,
  Document,
  Request,
  Payment,
  Notification,  // <- add to models object
};

Object.values(models).forEach((model) => {
  if (typeof model.associate === 'function') {
    model.associate(models);
  }
});

export {
  sequelize,
  Sequelize,
  User,
  Department,
  Service,
  Document,
  Request,
  Payment,
  Notification,
};

export default models;
