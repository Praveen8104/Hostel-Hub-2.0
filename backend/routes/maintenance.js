const express = require('express');
const router = express.Router();

// GET /api/maintenance/requests
router.get('/requests', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Maintenance requests retrieved', 
      data: []
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch maintenance requests' });
  }
});

module.exports = router;