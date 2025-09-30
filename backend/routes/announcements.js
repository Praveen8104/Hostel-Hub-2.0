const express = require('express');
const router = express.Router();

// GET /api/announcements
router.get('/', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Announcements retrieved',
      data: []
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

module.exports = router;