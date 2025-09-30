const express = require('express');
const router = express.Router();

// GET /api/canteen/menu
router.get('/menu', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Canteen menu retrieved',
      data: {
        categories: ['snacks', 'meals', 'beverages'],
        items: []
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch canteen menu' });
  }
});

module.exports = router;