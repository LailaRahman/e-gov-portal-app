import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { User, Department } from '../models/index.js';

const router = express.Router();

/* GET: Registration Form */
router.get('/register', async (req, res) => {
  try {
    const departments = await Department.findAll();
    res.render('citizens/register', {
      departments,
      error: req.flash('error')[0] || null,
      success: req.flash('success')[0] || null,
      old: req.flash('old')[0] || {},
    });
  } catch (err) {
    console.error('❌ Error fetching departments:', err);
    req.flash('error', 'Failed to load departments.');
    res.render('citizens/register', {
      departments: [],
      error: req.flash('error')[0] || null,
      success: null,
      old: {},
    });
  }
});

/* POST: Handle Registration */
/* POST: Handle Registration */
router.post('/register', async (req, res) => {
  try {
    let {
      name,
      email,
      password,
      role,
      department_id,
      job_title,
      national_id,
      dob,
      contact_info,
    } = req.body;

    // 🔍 DEBUG: Show what data is received from the form
    console.log('📥 Register form data received:', req.body);

    // Trim string inputs safely
    name = name?.trim();
    email = email?.trim();
    role = role?.trim();
    job_title = job_title?.trim();
    national_id = national_id?.trim();
    contact_info = contact_info?.trim();

    if (!name || !email || !password) {
      req.flash('error', 'Name, email, and password are required.');
      req.flash('old', { ...req.body });
      return res.redirect('/register');
    }

    const finalRole = ['citizen', 'officer', 'admin', 'headdepartment'].includes(role)
      ? role
      : 'citizen';

    const deptId = department_id ? parseInt(department_id, 10) : null;

    // Officer validation
    if (finalRole === 'officer') {
      if (!deptId || isNaN(deptId)) {
        req.flash('error', 'Please select a valid department.');
        req.flash('old', { ...req.body });
        return res.redirect('/register');
      }
      if (!job_title) {
        req.flash('error', 'Please enter a job title.');
        req.flash('old', { ...req.body });
        return res.redirect('/register');
      }
    }

    // Head of department validation
    if (finalRole === 'headdepartment') {
      if (!deptId || isNaN(deptId)) {
        console.log('⚠️ Invalid department_id received for headdepartment:', department_id);
        req.flash('error', 'Please select a valid department.');
        req.flash('old', { ...req.body });
        return res.redirect('/register');
      }
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      req.flash('error', 'Email is already registered.');
      req.flash('old', { ...req.body });
      return res.redirect('/register');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.create({
      name,
      email,
      password: hashedPassword,
      role: finalRole,
      department_id: ['officer', 'headdepartment'].includes(finalRole) ? deptId : null,
      job_title: finalRole === 'officer' ? job_title : null,
      national_id: finalRole === 'citizen' ? national_id : null,
      dob: finalRole === 'citizen' ? dob : null,
      contact_info: finalRole === 'citizen' ? contact_info : null,
    });

    req.flash('success', 'Registration successful. Please log in.');
    return res.redirect('/login');
  } catch (err) {
    console.error('❌ Registration error:', err);
    req.flash('error', 'Registration failed. Please try again.');
    req.flash('old', { ...req.body });
    return res.redirect('/register');
  }
});

/* GET: Login Form */
router.get('/login', (req, res) => {
  if (req.session.user) {
    // Redirect by role to avoid redirect loop
    const role = req.session.user.role;
    switch (role) {
      case 'citizen':
        return res.redirect('/citizen/dashboard');
      case 'officer':
        return res.redirect('/officer/dashboard');
      case 'admin':
        return res.redirect('/admin/dashboard');
      case 'headdepartment':
        return res.redirect('/head/dashboard');
      default:
        // Unknown role - destroy session to avoid issues
        return req.session.destroy(() => res.redirect('/login'));
    }
  }

  res.render('citizens/login');

});

/* POST: Handle Login */
router.post('/login', async (req, res) => {
  let { email, password } = req.body;

  email = email?.trim();

  if (!email || !password) {
    req.flash('error', 'Email and password are required.');
    req.flash('old', { email });
    return res.redirect('/login');
  }

  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      console.log(`Login failed: no user found with email "${email}"`);
      req.flash('error', 'Invalid email or password.');
      req.flash('old', { email });
      return res.redirect('/login');
    }

    console.log(`User found: ${user.email} with role "${user.role}"`);

    console.log('Login attempt for:', email);
    console.log('Password from login form:', password);
    console.log('Password hash from DB:', user.password);


    const valid = await bcrypt.compare(password, user.password);
    console.log('Password valid:', valid);
    if (!valid) {
      console.log(`Login failed: invalid password for user "${email}"`);
      req.flash('error', 'Invalid email or password.');
      req.flash('old', { email });
      return res.redirect('/login');
    }

    // Set session
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department_id: user.department_id || null,
      job_title: user.job_title || null,
    };

    console.log(`Session set for user "${user.email}" with role "${user.role}"`);

    req.session.save(err => {
      if (err) {
        console.error('❌ Session save error:', err);
        req.flash('error', 'Login failed. Try again.');
        return res.redirect('/login');
      }

      switch (user.role) {
        case 'citizen':
          return res.redirect('/citizen/dashboard');
        case 'officer':
          return res.redirect('/officer/dashboard');
        case 'admin':
          return res.redirect('/admin/dashboard');
        case 'headdepartment':
          return res.redirect('/head/dashboard');
        default:
          console.log(`Unknown role "${user.role}" for user "${user.email}", destroying session.`);
          req.session.destroy(() => res.redirect('/login'));
      }
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    req.flash('error', 'An error occurred. Please try again.');
    return res.redirect('/login');
  }
});

/* GET: Logout */
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('❌ Logout error:', err);
      req.flash('error', 'Logout failed.');
      return res.redirect('/');
    }
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
});

// GET: Forgot Password Page
router.get('/forgot-password', (req, res) => {
  res.render('citizens/forgot-password', {
    error: req.flash('error')[0] || null,
    success: req.flash('success')[0] || null,
    old: req.flash('old')[0] || {},
  });
});

// POST: Handle Forgot Password Request
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    req.flash('error', 'Email is required.');
    req.flash('old', { email });
    return res.redirect('/forgot-password');
  }

  try {
    const user = await User.findOne({ where: { email: email.trim() } });

    if (!user) {
      req.flash('error', 'No account found with that email.');
      req.flash('old', { email });
      return res.redirect('/forgot-password');
    }

    // Generate token + expiry
    const token = crypto.randomBytes(20).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save to DB
    user.reset_token = token;
    user.reset_token_expires = expiry;
    await user.save();

    // Mock sending email (you can add actual email later)
    console.log(`🔗 Reset Link: http://localhost:3000/reset-password/${token}`);

    req.flash('success', 'Password reset link has been sent to your email (mock).');
    return res.redirect('/forgot-password');
  } catch (err) {
    console.error('❌ Forgot password error:', err);
    req.flash('error', 'Something went wrong. Please try again.');
    req.flash('old', { email });
    return res.redirect('/forgot-password');
  }
});

// GET: Render Reset Password Page with token
router.get('/reset-password/:token', async (req, res) => {
  const { token } = req.params;

  try {
    // Find user with this reset token and check expiry
    const user = await User.findOne({
      where: {
        reset_token: token,
        reset_token_expires: { [Op.gt]: new Date() }, // not expired
      },
    });

    if (!user) {
      req.flash('error', 'Invalid or expired reset token.');
      return res.redirect('/forgot-password');
    }

    res.render('citizens/forgot-password', {
      token,
      error: req.flash('error')[0] || null,
      success: req.flash('success')[0] || null,
    });
  } catch (err) {
    console.error('❌ Reset password page error:', err);
    req.flash('error', 'Something went wrong. Please try again.');
    return res.redirect('/forgot-password');
  }
});

// POST: Handle Reset Password Submission
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;

  if (!token) {
    req.flash('error', 'Invalid or missing reset token.');
    return res.redirect('/forgot-password');
  }

  if (!password) {
    req.flash('error', 'Password is required.');
    return res.redirect(`/reset-password/${token}`);
  }

  try {
    const user = await User.findOne({
      where: {
        reset_token: token,
        reset_token_expires: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      req.flash('error', 'Invalid or expired reset token.');
      return res.redirect('/forgot-password');
    }

    console.log(`Resetting password for user: ${user.email}`);

    // Hash password and save
    user.password = await bcrypt.hash(password, 12);
    user.reset_token = null;
    user.reset_token_expires = null;

    await user.save();

    console.log('Password reset successful.');

    req.flash('success', 'Password successfully updated! You can now log in.');
    res.redirect('/login');
  } catch (err) {
    console.error('❌ Reset password error:', err);
    req.flash('error', 'Something went wrong. Please try again.');
    res.redirect(`/reset-password/${token}`);
  }
});

export default router;
