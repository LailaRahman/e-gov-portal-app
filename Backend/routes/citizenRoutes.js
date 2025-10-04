// citizenRoutes.js

import express from 'express';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import { User, Department, Request, Service, Document, Notification } from '../models/index.js';

const router = express.Router();

// Multer config
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/documents/');
  },
  filename(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter(req, file, cb) {
    const filetypes = /jpeg|jpg|pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only PDF and JPG files are allowed'));
  }
});

// Middleware
function ensureCitizen(req, res, next) {
  if (req.session?.user?.role === 'citizen') return next();
  req.flash('error', 'Please log in as a citizen to access this page.');
  return res.redirect('/login');
}

// Routes

// GET: Login
router.get('/login', (req, res) => res.render('citizens/login'));

// GET: Register
router.get('/register', async (req, res) => {
  try {
    const departments = await Department.findAll();
    res.render('citizens/register', { departments });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.render('citizens/register', { departments: [] });
  }
});

// POST: Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, department_id } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      req.flash('error', 'Email already registered.');
      return res.redirect('/register');
    }

    if (department_id) {
      const dep = await Department.findByPk(department_id);
      if (!dep) {
        req.flash('error', 'Invalid department selected.');
        return res.redirect('/register');
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'citizen',
      department_id: department_id || null,
    });

    req.flash('success', 'Registration successful. Please log in.');
    res.redirect('/login');
  } catch (error) {
    console.error('Registration error:', error);
    req.flash('error', 'Registration failed. Please try again.');
    res.redirect('/register');
  }
});

// POST: Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      req.flash('error', 'Invalid email or password.');
      return res.redirect('/login');
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department_id: user.department_id || null,
    };

    const redirectMap = {
      citizen: '/citizen/dashboard',
      officer: '/officer/dashboard',
      admin: '/admin/dashboard',
    };

    res.redirect(redirectMap[user.role] || '/login');
  } catch (error) {
    console.error('Login error:', error);
    req.flash('error', 'Login failed. Please try again.');
    res.redirect('/login');
  }
});

// GET: Dashboard
router.get('/dashboard', ensureCitizen, async (req, res) => {
  try {
    const citizenId = req.session.user.id;

    const requests = await Request.findAll({
      where: { citizen_id: citizenId },
      include: [
        {
          model: Service,
          as: 'service',
          include: [{ model: Department, as: 'department', attributes: ['name'] }]
        },
        {
          model: Document,
          as: 'documents',
          attributes: ['file_path', 'file_type', 'original_name']
        }
      ],
      order: [['createdAt', 'DESC']],
    });

    const notifications = await Notification.findAll({
      where: { UserId: citizenId },
      order: [['createdAt', 'DESC']],
    });

    res.render('citizens/dashboard', {
      user: req.session.user,
      requests,
      notifications,
      success: req.flash('success'),
      error: req.flash('error'),
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).send('Error loading dashboard');
  }
});

// GET: Apply
router.get('/apply', ensureCitizen, async (req, res) => {
  try {
    const departments = await Department.findAll();
    const services = await Service.findAll({
      include: [{ model: Department, as: 'department', attributes: ['name'] }]
    });

    res.render('citizens/apply', {
      user: req.session.user,
      departments,
      services,
      success: req.flash('success'),
      error: req.flash('error'),
    });
  } catch (error) {
    console.error('Apply page error:', error);
    req.flash('error', 'Failed to load apply page.');
    res.redirect('/citizen/dashboard');
  }
});

// POST: Apply
router.post('/apply', ensureCitizen, (req, res, next) => {
  upload.single('document')(req, res, function (err) {
    if (err) {
      console.error('Multer error:', err.message);
      req.flash('error', err.message);
      return res.redirect('/citizen/apply');
    }
    next();
  });
}, async (req, res) => {
  try {
    const citizenId = req.session.user.id;
    const { service_id, description } = req.body;

    if (!service_id || !req.file) {
      req.flash('error', 'Service and document are required.');
      return res.redirect('/citizen/apply');
    }

    const service = await Service.findByPk(service_id);
    if (!service) {
      req.flash('error', 'Invalid service.');
      return res.redirect('/citizen/apply');
    }

    const newRequest = await Request.create({
      citizen_id: citizenId,
      service_id: service.id,
      description: description?.trim() || '',
      status: 'submitted',
      payment_status: 'pending',
      payment_amount: service.fee,
    });

    await Document.create({
      request_id: newRequest.id,
      file_path: req.file.path,
      file_type: req.file.mimetype,
      original_name: req.file.originalname,
    });

    await Notification.create({
      message: `Your application for ${service.name} has been submitted.`,
      is_read: false,
      UserId: citizenId,
    });

    req.flash('success', 'Application submitted. Proceed to payment.');
    res.redirect(`/citizen/payment/${newRequest.id}`);
  } catch (error) {
    console.error('Application submission error:', error);
    req.flash('error', 'Application submission failed.');
    res.redirect('/citizen/apply');
  }
});

// GET: Payment
router.get('/payment/:requestId', ensureCitizen, async (req, res) => {
  try {
    const request = await Request.findByPk(req.params.requestId, {
      include: { model: Service, as: 'service' }
    });

    if (!request || request.service.fee <= 0) {
      return res.redirect('/citizen/dashboard');
    }

    res.render('citizens/payment', {
      service: request.service,
      requestId: request.id
    });
  } catch (err) {
    console.error('Payment page error:', err);
    req.flash('error', 'Unable to load payment page.');
    res.redirect('/citizen/dashboard');
  }
});

// POST: Payment Confirm
router.post('/payment/confirm', ensureCitizen, async (req, res) => {
  try {
    const { requestId } = req.body;
    const request = await Request.findByPk(requestId);

    if (!request) {
      req.flash('error', 'Request not found.');
      return res.redirect('/citizen/dashboard');
    }

    request.payment_status = 'paid';
    await request.save();

    req.flash('success', 'Payment successful. Application under review.');
    res.redirect(`/citizen/payment-success/${requestId}`);
  } catch (err) {
    console.error('Payment confirm error:', err);
    req.flash('error', 'Payment confirmation failed.');
    res.redirect('/citizen/dashboard');
  }
});

// GET: Payment Success
router.get('/payment-success/:requestId', ensureCitizen, async (req, res) => {
  try {
    const request = await Request.findByPk(req.params.requestId, {
      include: { model: Service, as: 'service' }
    });

    if (!request) {
      req.flash('error', 'Request not found.');
      return res.redirect('/citizen/dashboard');
    }

    res.render('citizens/payment-success', { request });
  } catch (error) {
    console.error('Payment success error:', error);
    req.flash('error', 'Failed to load success page.');
    res.redirect('/citizen/dashboard');
  }
});

// GET: Profile
router.get('/profile', ensureCitizen, async (req, res) => {
  try {
    const user = await User.findByPk(req.session.user.id);

    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/citizen/dashboard');
    }

    res.render('citizens/profile', {
      user,
      success: req.flash('success'),
      error: req.flash('error'),
    });
  } catch (error) {
    console.error('Profile page error:', error);
    req.flash('error', 'Failed to load profile.');
    res.redirect('/citizen/dashboard');
  }
});

// POST: Update Profile
router.post('/profile', ensureCitizen, async (req, res) => {
  try {
    const { name, national_id, dob, contact } = req.body;
    const user = await User.findByPk(req.session.user.id);

    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/citizen/dashboard');
    }

    user.name = name;
    user.national_id = national_id || null;
    user.dob = dob ? new Date(dob) : null;
    user.contact = contact || null;
    await user.save();

    req.session.user.name = user.name;
    req.flash('success', 'Profile updated successfully.');
    res.redirect('/citizen/profile');
  } catch (error) {
    console.error('Profile update error:', error);
    req.flash('error', 'Failed to update profile.');
    res.redirect('/citizen/profile');
  }
});

export default router;
