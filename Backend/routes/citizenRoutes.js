// citizenRoutes.js

import express from 'express';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import { User, Department, Request, Service, Document } from '../models/index.js';

const router = express.Router();

// Multer setup for file uploads
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

// Middleware to ensure user is a citizen
function ensureCitizen(req, res, next) {
  if (req.session?.user?.role === 'citizen') {
    return next();
  }
  req.flash('error', 'Please log in as a citizen to access this page.');
  return res.redirect('/login');
}

// GET: Render login page
router.get('/login', (req, res) => {
  res.render('citizens/login');
});

// GET: Render register page
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
    return res.redirect('/login');
  } catch (error) {
    console.error('Registration error:', error);
    req.flash('error', 'Registration failed. Please try again.');
    return res.redirect('/register');
  }
});

// POST: Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/login');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.flash('error', 'Invalid password.');
      return res.redirect('/login');
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department_id: user.department_id || null,
    };

    if (user.role === 'citizen') return res.redirect('/citizen/dashboard');
    if (user.role === 'officer') return res.redirect('/officer/dashboard');
    if (user.role === 'admin') return res.redirect('/admin/dashboard');

    return res.redirect('/login');
  } catch (error) {
    console.error('Login error:', error);
    req.flash('error', 'Login failed. Please try again.');
    return res.redirect('/login');
  }
});

// GET: Citizen dashboard
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

    res.render('citizens/dashboard', {
      user: req.session.user,
      requests,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (err) {
    console.error('Failed to load citizen dashboard:', err);
    res.status(500).send('Error loading dashboard');
  }
});

// GET: Apply service page
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
    console.error('Failed to load apply page:', error);
    req.flash('error', 'Failed to load apply page.');
    return res.redirect('/citizen/dashboard');
  }
});

// POST: Apply service with file upload
router.post('/apply', ensureCitizen, (req, res, next) => {
  upload.single('document')(req, res, function (err) {
    if (err) {
      console.error('Multer upload error:', err.message);
      req.flash('error', err.message);
      return res.redirect('/citizen/apply');
    }
    next();
  });
}, async (req, res) => {
  try {
    const citizenId = req.session.user.id;
    const { service_id, description } = req.body;

    if (!service_id) {
      req.flash('error', 'Please select a service.');
      return res.redirect('/citizen/apply');
    }
    if (!req.file) {
      req.flash('error', 'Please upload a document.');
      return res.redirect('/citizen/apply');
    }

    const desc = description ? description.trim() : '';

    const service = await Service.findByPk(service_id);
    if (!service) {
      req.flash('error', 'Selected service is invalid.');
      return res.redirect('/citizen/apply');
    }

    const newRequest = await Request.create({
  citizen_id: citizenId,
  service_id: service.id,
  description: desc,
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

    req.flash('success', 'Application submitted successfully.');
    return res.redirect('/citizen/dashboard');
  } catch (error) {
    console.error('Error submitting application:', error);
    req.flash('error', 'Failed to submit application. Please try again.');
    return res.redirect('/citizen/apply');
  }
});

// GET: Payment page
router.get('/payment/:requestId', ensureCitizen, async (req, res) => {
  try {
    const request = await Request.findByPk(req.params.requestId, {
      include: { model: Service, as: 'service' }
    });
    if (!request) return res.redirect('/citizen/dashboard');
    if (request.service.fee <= 0) return res.redirect('/citizen/dashboard');

    res.render('citizens/payment', {
      service: request.service,
      requestId: request.id
    });
  } catch (err) {
    console.error('Error loading payment page:', err);
    req.flash('error', 'Unable to load payment page.');
    res.redirect('/citizen/dashboard');
  }
});

// POST: Confirm payment
router.post('/payment/confirm', ensureCitizen, async (req, res) => {
  try {
    const { requestId } = req.body;
    const request = await Request.findByPk(requestId);

    if (!request) {
      req.flash('error', 'Request not found.');
      return res.redirect('/citizen/dashboard');
    }

    request.payment_status = 'paid';  // consistent field name
    await request.save();

    req.flash('success', 'Payment successful. Your application is now under review.');
    return res.redirect(`/citizen/payment-success/${requestId}`);
  } catch (err) {
    console.error('Error confirming payment:', err);
    req.flash('error', 'Payment confirmation failed.');
    return res.redirect('/citizen/dashboard');
  }
});

// GET: Payment success page
router.get('/payment-success/:requestId', ensureCitizen, async (req, res) => {
  try {
    const requestId = req.params.requestId;
    const request = await Request.findByPk(requestId, {
      include: { model: Service, as: 'service' }
    });

    if (!request) {
      req.flash('error', 'Request not found.');
      return res.redirect('/citizen/dashboard');
    }

    res.render('citizens/payment-success', { request });
  } catch (error) {
    console.error('Error loading payment success page:', error);
    req.flash('error', 'Failed to load payment success page.');
    res.redirect('/citizen/dashboard');
  }
});

// GET: Citizen profile
router.get('/profile', ensureCitizen, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = await User.findByPk(userId);

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
    console.error('Error loading profile:', error);
    req.flash('error', 'Failed to load profile.');
    return res.redirect('/citizen/dashboard');
  }
});

// POST: Update profile
router.post('/profile', ensureCitizen, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { name, national_id, dob, contact } = req.body;

    if (!name) {
      req.flash('error', 'Name is required.');
      return res.redirect('/citizen/profile');
    }

    const user = await User.findByPk(userId);
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/citizen/profile');
    }

    user.name = name;
    user.national_id = national_id || null;
    user.dob = dob ? new Date(dob) : null;
    user.contact = contact || null;

    await user.save();

    req.session.user.name = user.name;

    req.flash('success', 'Profile updated successfully.');
    return res.redirect('/citizen/profile');
  } catch (error) {
    console.error('Error updating profile:', error);
    req.flash('error', 'Failed to update profile.');
    return res.redirect('/citizen/profile');
  }
});

export default router;
