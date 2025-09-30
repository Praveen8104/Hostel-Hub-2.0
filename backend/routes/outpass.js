const express = require('express');
const { requireStudent, requireWarden } = require('../middleware/auth');
const router = express.Router();

// GET /api/outpass/requests
router.get('/requests', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Outpass requests retrieved',
      data: []
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch outpass requests' });
  }
});

module.exports = router;