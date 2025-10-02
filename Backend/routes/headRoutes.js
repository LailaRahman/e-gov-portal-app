import express from 'express';
import { User, Request } from '../models/index.js';

const router = express.Router();

router.get('/dashboard', async (req, res) => {
  console.log('Session user on dashboard:', req.session.user);

  const head = req.session.user;

  if (!head || head.role !== 'headdepartment') {
    req.flash('error', 'Unauthorized access');
    return res.redirect('/login');
  }

  try {
    const officers = await User.findAll({
      where: {
        role: 'officer',
        department_id: head.department_id,
      },
      include: [
        {
          model: Request,
          as: 'reviewedRequests',
          attributes: ['id', 'status', 'createdAt'],
        },
      ],
    });

    res.render('head/dashboard', {
      officers,
      user: head,
      success: req.flash('success'),
      error: req.flash('error'),
    });
  } catch (error) {
    console.error('❌ Head dashboard error:', error);
    req.flash('error', 'Failed to load dashboard');
    res.redirect('/');
  }
});

export default router;
