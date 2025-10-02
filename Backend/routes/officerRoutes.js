import express from 'express';
import { Request, User, Service, Department, Document } from '../models/index.js';
import { Op } from 'sequelize';

const router = express.Router();

// ✅ Middleware: Ensure officer OR department_head is logged in
function ensureOfficer(req, res, next) {
  const { user } = req.session;
  if (!user || (user.role !== 'officer' && user.role !== 'headdepartment')) {
    return res.redirect('/login');
  }
  next();
}

// ✅ GET /officer/dashboard - View requests for officer's department with filters
router.get('/dashboard', ensureOfficer, async (req, res) => {
  try {
    const { department_id } = req.session.user;
    const { name, status, service_id } = req.query;

    // Build dynamic WHERE conditions
    const serviceWhere = { department_id };
    if (service_id) {
      serviceWhere.id = service_id;
    }

    const citizenWhere = {};
    if (name) {
      citizenWhere.name = { [Op.iLike]: `%${name}%` }; // Case-insensitive
    }

    const requestWhere = {};
    if (status) {
      requestWhere.status = status;
    }

    // Fetch filtered requests
    const requests = await Request.findAll({
      where: requestWhere,
      include: [
        {
          model: Service,
          as: 'service',
          required: true,
          where: serviceWhere,
          include: [
            {
              model: Department,
              as: 'department',
              required: true,
              attributes: ['id', 'name'],
            }
          ],
        },
        {
          model: User,
          as: 'Citizen',
          required: true,
          where: citizenWhere,
          attributes: ['id', 'name', 'email'],
        }
      ],
      order: [['createdAt', 'DESC']],
      subQuery: false,
    });

    // Get all services for this department (for filter dropdown)
    const services = await Service.findAll({
      where: { department_id },
      order: [['name', 'ASC']],
    });

    res.render('officers/dashboard', {
      requests,
      user: req.session.user,
      services,
      filters: req.query, // To retain filter inputs
      success: req.flash('success'),
      error: req.flash('error'),
    });

  } catch (err) {
    console.error('❌ Failed to load officer dashboard:', err);
    res.status(500).send('Error loading dashboard');
  }
});

// ✅ GET /officer/requests/:id - View a single request with assignment logic
router.get('/requests/:id', ensureOfficer, async (req, res) => {
  try {
    const { department_id, id: officerId } = req.session.user;

    const request = await Request.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: User,
          as: 'Citizen',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: Service,
          as: 'service',
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['id', 'name'],
            }
          ],
        },
        {
          model: Document,
          as: 'documents',
          attributes: ['id', 'file_path', 'file_type', 'original_name'],
        },
        {
          model: User,
          as: 'Reviewer',
          attributes: ['id', 'name', 'email'],
        }
      ]
    });

    if (!request) {
      req.flash('error', 'Request not found.');
      return res.redirect('/officer/dashboard');
    }

    // Authorization: must be in same department
    if (request.service.department.id !== department_id) {
      req.flash('error', 'Unauthorized to access this request.');
      return res.redirect('/officer/dashboard');
    }

    // Assign request to current officer if unassigned and status is 'submitted'
    if (!request.reviewed_by && request.status === 'submitted') {
      await request.update({
        reviewed_by: officerId,
        status: 'under_review',
      });

      await request.reload({
        include: [
          { model: User, as: 'Reviewer', attributes: ['id', 'name', 'email'] }
        ]
      });
    }

    res.render('officers/request-details', {
      request,
      success: req.flash('success'),
      error: req.flash('error'),
    });
  } catch (err) {
    console.error('❌ Error loading request details:', err);
    res.status(500).send('Server error');
  }
});

// ✅ POST /officer/requests/:id/status - Update status (only assigned officer) with lock
router.post('/requests/:id/status', ensureOfficer, async (req, res) => {
  const { status } = req.body;
  const officerId = req.session.user.id;
  const departmentId = req.session.user.department_id;

  const validStatuses = ['under_review', 'approved', 'rejected'];
  if (!validStatuses.includes(status)) {
    req.flash('error', 'Invalid status.');
    return res.redirect('/officer/dashboard');
  }

  try {
    const request = await Request.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: Service,
          as: 'service',
          include: [{ model: Department, as: 'department' }]
        }
      ]
    });

    if (!request) {
      req.flash('error', 'Request not found.');
      return res.redirect('/officer/dashboard');
    }

    // Authorization: same department
    if (request.service.department.id !== departmentId) {
      req.flash('error', 'Unauthorized to update this request.');
      return res.redirect('/officer/dashboard');
    }

    // Only assigned officer can update
    if (request.reviewed_by !== officerId) {
      req.flash('error', 'This request is being reviewed by another officer.');
      return res.redirect('/officer/dashboard');
    }

    // LOCK: prevent updates if already approved or rejected
    if (['approved', 'rejected'].includes(request.status)) {
      req.flash('error', 'This request has already been finalized and cannot be changed.');
      return res.redirect('/officer/dashboard');
    }

    // Enforce status flow
    if (request.status === 'submitted' && status !== 'under_review') {
      req.flash('error', 'You must set status to under_review first.');
      return res.redirect(`/officer/requests/${req.params.id}`);
    }

    await request.update({
      status,
      reviewed_by: officerId,
    });

    req.flash('success', 'Request status updated successfully.');
    res.redirect('/officer/dashboard');
  } catch (err) {
    console.error('❌ Error updating request status:', err);
    res.status(500).send('Failed to update status');
  }
});

// ✅ GET /officer/profile - View profile
router.get('/profile', ensureOfficer, async (req, res) => {
  try {
    const officer = await User.findByPk(req.session.user.id);

    if (!officer) {
      req.flash('error', 'Officer not found.');
      return res.redirect('/officer/dashboard');
    }

    res.render('officers/profile', {
      officer,
      success: req.flash('success'),
      error: req.flash('error'),
    });
  } catch (err) {
    console.error('❌ Error loading officer profile:', err);
    req.flash('error', 'Unable to load profile.');
    res.redirect('/officer/dashboard');
  }
});

// ✅ POST /officer/profile - Update profile
router.post('/profile', ensureOfficer, async (req, res) => {
  try {
    const { name, email, job_title } = req.body;

    const officer = await User.findByPk(req.session.user.id);
    if (!officer) {
      req.flash('error', 'Officer not found.');
      return res.redirect('/officer/profile');
    }

    officer.name = name;
    officer.email = email;
    officer.job_title = job_title;

    await officer.save();

    // Update session info
    req.session.user.name = name;
    req.session.user.email = email;
    req.session.user.job_title = job_title;

    req.flash('success', 'Profile updated successfully.');
    res.redirect('/officer/profile');
  } catch (err) {
    console.error('❌ Error updating officer profile:', err);
    req.flash('error', 'Failed to update profile.');
    res.redirect('/officer/profile');
  }
});

export default router;
