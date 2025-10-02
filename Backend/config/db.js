import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env

// Log DB credentials for debugging (remove in production)
console.log('Loaded DB credentials:');
console.log('DB_USERNAME:', process.env.DB_USERNAME);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '******' : '');
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);

const sequelize = new Sequelize(
  process.env.DB_NAME || 'egov',
  process.env.DB_USERNAME || 'postgres',
  process.env.DB_PASSWORD || '', // password is already string
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    dialect: 'postgres',
    logging: false, // Set to true to debug SQL queries
  }
);

// Test DB connection on startup
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established.');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
}

testConnection();

export default sequelize;
