import express from 'express';
import { Department, Service, User, Request, Payment, sequelize } from '../models/index.js';
import { Op } from 'sequelize';

const router = express.Router();

// Middleware to ensure only admins can access
function ensureAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/login');
  }
  next();
}

// GET /admin/dashboard
router.get('/dashboard', ensureAdmin, async (req, res) => {
  try {
    const totalRequests = await Request.count();
    const approved = await Request.count({ where: { status: 'approved' } });
    const rejected = await Request.count({ where: { status: 'rejected' } });
    const revenue = await Payment.sum('amount', { where: { status: 'paid' } }) || 0;

    const departments = await Department.findAll();
    const services = await Service.findAll();

    const requests = await Request.findAll({
  include: [
    { model: User, as: 'Citizen', attributes: ['name', 'email'] },
    { model: User, as: 'Reviewer', attributes: ['name', 'email'] },
    { model: Service, as: 'service', attributes: ['name'] },
  ],
  order: [['createdAt', 'DESC']],
});


    res.render('admin/dashboard', {
      totalRequests,
      approved,
      rejected,
      revenue,
      departments,
      services,
      requests,            // <-- Pass requests here
      filters: req.query || {},
      user: req.session.user
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    req.flash('error', 'Failed to load dashboard');
    res.redirect('/');
  }
});

// GET /admin/departments
router.get('/departments', ensureAdmin, async (req, res) => {
  try {
    const departments = await Department.findAll();
    res.render('admin/departments', {
      departments,
      user: req.session.user,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Load departments error:', error);
    req.flash('error', 'Failed to load departments');
    res.redirect('/admin/dashboard');
  }
});

// POST /admin/departments
router.post('/departments', ensureAdmin, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === '') {
      req.flash('error', 'Department name is required');
      return res.redirect('/admin/departments');
    }

    await Department.create({ name: name.trim() });

    req.flash('success', 'Department added successfully');
    res.redirect('/admin/departments');
  } catch (error) {
    console.error('Add department error:', error);
    req.flash('error', 'Failed to add department');
    res.redirect('/admin/departments');
  }
});

// GET /admin/services
router.get('/services', ensureAdmin, async (req, res) => {
  try {
    const services = await Service.findAll({
      include: [{ model: Department, as: 'department' }]
    });

    const departments = await Department.findAll();

    res.render('admin/services', {
      services,
      departments,
      user: req.session.user,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Load services error:', error);
    req.flash('error', 'Failed to load services');
    res.redirect('/admin/dashboard');
  }
});

// POST /admin/services
router.post('/services', ensureAdmin, async (req, res) => {
  try {
    const { name, fee, departmentId } = req.body;

    if (!name || !fee || !departmentId) {
      req.flash('error', 'All fields are required');
      return res.redirect('/admin/services');
    }

    await Service.create({
      name: name.trim(),
      fee: parseFloat(fee),
      department_id: departmentId
    });

    req.flash('success', 'Service added successfully');
    res.redirect('/admin/services');
  } catch (error) {
    console.error('Add service error:', error);
    req.flash('error', 'Failed to add service');
    res.redirect('/admin/services');
  }
});

router.get('/users', ensureAdmin, async (req, res) => {
  try {
    const { name, email, role, department_id } = req.query;

    const where = {};

    if (name) {
      where.name = { [Op.iLike]: `%${name}%` }; // Case-insensitive partial match
    }

    if (email) {
      where.email = { [Op.iLike]: `%${email}%` };
    }

    if (role) {
      where.role = role;
    }

    if (department_id) {
      where.department_id = department_id;
    }

    const users = await User.findAll({
      where,
      attributes: ['id', 'name', 'email', 'role', 'department_id'],
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['name'],
        }
      ]
    });

    const departments = await Department.findAll(); // for dropdown filter

    res.render('admin/users', {
      users,
      user: req.session.user,
      filters: req.query,
      departments,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Load users error:', error);
    req.flash('error', 'Failed to load users');
    res.redirect('/admin/dashboard');
  }
});


// DELETE department
router.delete('/departments/:id', ensureAdmin, async (req, res) => {
  const departmentId = req.params.id;

  try {
    const deleted = await Department.destroy({ where: { id: departmentId } });

    if (deleted) {
      req.flash('success', 'Department deleted successfully.');
    } else {
      req.flash('error', 'Department not found or could not be deleted.');
    }

    res.redirect('/admin/departments');
  } catch (err) {
    console.error('Delete error:', err);
    req.flash('error', 'An error occurred while deleting the department.');
    res.redirect('/admin/departments');
  }
});

// GET /admin/requests - view or filter requests
router.get('/requests', ensureAdmin, async (req, res) => {
  try {
    const { name, request_id, status, service_type, start_date, end_date } = req.query;

    const where = {};

    if (request_id) where.id = request_id;
    if (status) where.status = status;
    if (service_type) where.service_id = service_type;
    if (start_date && end_date) {
      where.createdAt = {
        [sequelize.Op.between]: [new Date(start_date), new Date(end_date)],
      };
    }

    const requests = await Request.findAll({
      where,
      include: [
        { model: User, as: 'Citizen', attributes: ['name', 'email'] },
        { model: User, as: 'Reviewer', attributes: ['name', 'email'] },
        {
          model: Service,
          as: 'service',
          attributes: ['name'],
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['name']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
    });

    res.render('admin/requests', {
      requests,
      user: req.session.user,
      filters: req.query,
      success: req.flash('success'),
      error: req.flash('error'),
    });
  } catch (error) {
    console.error('Load filtered requests error:', error);
    req.flash('error', 'Failed to load filtered requests');
    res.redirect('/admin/dashboard');
  }
});

export default router;
