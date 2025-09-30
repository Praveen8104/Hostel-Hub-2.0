const express = require('express');
const { requireStudent } = require('../middleware/auth');
const router = express.Router();

// GET /api/students/dashboard
router.get('/dashboard', requireStudent, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Student dashboard data',
      data: {
        announcements: [],
        todayMenu: null,
        activeRequests: []
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

module.exports = router;