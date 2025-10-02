import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import session from 'express-session';
import flash from 'connect-flash';
import cookieParser from 'cookie-parser';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import morgan from 'morgan';
import methodOverride from 'method-override';
import fs from 'fs';
import { sequelize, User, Department, Service, Request, Document, Payment } from './models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Ensure uploads/documents directory exists to avoid Multer ENOENT error
const uploadDir = path.join(__dirname, 'uploads', 'documents');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('✅ Created uploads/documents directory');
}

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// Logger
app.use(morgan('dev'));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/uploads', express.static('uploads'));

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false },
}));

// Flash messages
app.use(flash());

// Flash + user data middleware
app.use((req, res, next) => {
  res.locals.success = req.flash('success')[0] || null;
  res.locals.error = req.flash('error')[0] || null;
  res.locals.old = req.flash('old')[0] || {};
  res.locals.user = req.session.user || null;
  next();
});


app.use(methodOverride('_method')); 

// Import routes
import authRoutes from './routes/authRoutes.js';
import citizenRoutes from './routes/citizenRoutes.js';
import officerRoutes from './routes/officerRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import headRoutes from './routes/headRoutes.js';

// Middleware for role-based access
function ensureRole(role) {
  return (req, res, next) => {
    if (!req.session.user || req.session.user.role !== role) {
      req.flash('error', 'Unauthorized access.');
      return res.redirect('/login');
    }
    next();
  };
}

// Mount public auth routes (login/register)
app.use('/', authRoutes);

// Mount protected routes (require specific role)
app.use('/citizen', ensureRole('citizen'), citizenRoutes);
app.use('/officer', ensureRole('officer'), officerRoutes);
app.use('/head', ensureRole('headdepartment'), headRoutes);

// Special handling for admin: allow access only after login, but protect inside adminRoutes
app.use('/admin', (req, res, next) => {
  if (!req.session.user) {
    req.flash('error', 'Please log in first.');
    return res.redirect('/login');
  }
  next();
}, adminRoutes);

// Dashboard redirects
app.get('/', (req, res) => {
  const user = req.session.user;
  if (!user) return res.redirect('/login');

  switch (user.role) {
    case 'citizen': return res.redirect('/citizen/dashboard');
    case 'officer': return res.redirect('/officer/dashboard');
    case 'admin': return res.redirect('/admin/dashboard');
    case 'headdepartment': return res.redirect('/head/dashboard');
    default: return res.redirect('/login');
  }
});

// Profile shortcut
app.get('/profile', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  switch (req.session.user.role) {
    case 'citizen': return res.redirect('/citizen/profile');
    case 'headdepartment': return res.redirect('/head/profile');
    default: return res.redirect('/login');
  }
});

// Example: citizen payment page
app.get('/citizen/pay/:requestId', (req, res) => {
  const { requestId } = req.params;
  if (!req.session.user || req.session.user.role !== 'citizen') {
    req.flash('error', 'Unauthorized access.');
    return res.redirect('/login');
  }
  res.render('citizens/payment', { requestId });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { url: req.originalUrl });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  if (res.headersSent) return next(err);
  res.status(500).render('error', { error: err });
});

// 🔄 Sync models in correct FK dependency order and start server
(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    // Sync models in dependency order
    await Department.sync();
    await User.sync();
    await Service.sync();
    await Request.sync();
    await Document.sync();
    await Payment.sync();

    console.log('✅ Database synced.');

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to sync database:', err);
  }
})();
