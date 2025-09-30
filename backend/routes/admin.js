const express = require('express');
const { requireAdmin, requireStaff } = require('../middleware/auth');
const router = express.Router();

// GET /api/admin/dashboard
router.get('/dashboard', requireStaff, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Admin dashboard data',
      data: {
        stats: {
          totalStudents: 0,
          pendingRequests: 0,
          activeOrders: 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admin dashboard' });
  }
});

module.exports = router;