const express = require('express');
const { body, validationResult, param } = require('express-validator');
const MessMenu = require('../models/MessMenu');
const MealRating = require('../models/MealRating');
const { requireStudent, requireWarden, requireAdmin, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/dining/menu/:date - Get menu for specific date
router.get('/menu/:date', [
  param('date').isISO8601().withMessage('Invalid date format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { date } = req.params;
    const queryDate = new Date(date);
    
    // Get all meals for the date
    const menus = await MessMenu.find({
      date: {
        $gte: new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate()),
        $lt: new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate() + 1)
      }
    }).populate('createdBy', 'name');

    // Get ratings for each menu
    const menuStats = {};
    for (const menu of menus) {
      const stats = await MealRating.getMenuStats(menu._id);
      menuStats[menu._id] = stats;
    }

    // Organize by meal type
    const meals = {
      breakfast: null,
      lunch: null,
      dinner: null
    };

    menus.forEach(menu => {
      meals[menu.mealType] = {
        ...menu.toObject(),
        stats: menuStats[menu._id]
      };
    });

    res.json({
      success: true,
      message: 'Menu data retrieved successfully',
      data: {
        date: date,
        meals: meals
      }
    });

  } catch (error) {
    console.error('Get menu error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch menu',
      code: 'MENU_FETCH_ERROR'
    });
  }
});

// GET /api/dining/menu/week/:startDate - Get weekly menu
router.get('/menu/week/:startDate', [
  param('startDate').isISO8601().withMessage('Invalid date format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const startDate = new Date(req.params.startDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    const menus = await MessMenu.find({
      date: {
        $gte: startDate,
        $lt: endDate
      }
    }).sort({ date: 1, mealType: 1 });

    // Get ratings for all menus
    const menuStats = {};
    for (const menu of menus) {
      const stats = await MealRating.getMenuStats(menu._id);
      menuStats[menu._id] = stats;
    }

    // Group by date
    const weeklyMenu = {};
    menus.forEach(menu => {
      const dateKey = menu.date.toISOString().split('T')[0];
      
      if (!weeklyMenu[dateKey]) {
        weeklyMenu[dateKey] = {
          date: dateKey,
          breakfast: null,
          lunch: null,
          dinner: null
        };
      }

      weeklyMenu[dateKey][menu.mealType] = {
        ...menu.toObject(),
        stats: menuStats[menu._id]
      };
    });

    res.json({
      success: true,
      message: 'Weekly menu retrieved successfully',
      data: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        menu: Object.values(weeklyMenu)
      }
    });

  } catch (error) {
    console.error('Get weekly menu error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch weekly menu',
      code: 'WEEKLY_MENU_ERROR'
    });
  }
});

// POST /api/dining/rating - Rate a meal
router.post('/rating', [
  requireStudent,
  body('menuId').notEmpty().withMessage('Menu ID is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('taste').optional().isInt({ min: 1, max: 5 }),
  body('quality').optional().isInt({ min: 1, max: 5 }),
  body('quantity').optional().isInt({ min: 1, max: 5 }),
  body('feedback').optional().isLength({ max: 500 }).withMessage('Feedback too long'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      menuId,
      rating,
      taste,
      quality,
      quantity,
      feedback,
      improvements,
      wouldRecommend,
      anonymous
    } = req.body;

    // Check if menu exists
    const menu = await MessMenu.findById(menuId);
    if (!menu) {
      return res.status(404).json({
        error: 'Menu not found',
        code: 'MENU_NOT_FOUND'
      });
    }

    // Check if user already rated this menu
    const existingRating = await MealRating.findOne({
      user: req.user.id,
      menuId: menuId
    });

    let mealRating;

    if (existingRating) {
      // Update existing rating
      existingRating.rating = rating;
      existingRating.taste = taste;
      existingRating.quality = quality;
      existingRating.quantity = quantity;
      existingRating.feedback = feedback;
      existingRating.improvements = improvements;
      existingRating.wouldRecommend = wouldRecommend;
      existingRating.anonymous = anonymous;

      mealRating = await existingRating.save();
    } else {
      // Create new rating
      mealRating = new MealRating({
        user: req.user.id,
        menuId,
        rating,
        taste,
        quality,
        quantity,
        feedback,
        improvements,
        wouldRecommend,
        anonymous
      });

      await mealRating.save();
    }

    // Get updated stats
    const stats = await MealRating.getMenuStats(menuId);

    res.json({
      success: true,
      message: existingRating ? 'Rating updated successfully' : 'Rating submitted successfully',
      data: {
        rating: mealRating,
        menuStats: stats
      }
    });

  } catch (error) {
    console.error('Rating error:', error);
    res.status(500).json({ 
      error: 'Failed to submit rating',
      code: 'RATING_ERROR'
    });
  }
});

// GET /api/dining/rating/:menuId - Get ratings for a menu
router.get('/rating/:menuId', [
  param('menuId').notEmpty().withMessage('Menu ID is required')
], async (req, res) => {
  try {
    const { menuId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const ratings = await MealRating.find({ menuId })
      .populate('user', 'identifier')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const stats = await MealRating.getMenuStats(menuId);
    const total = await MealRating.countDocuments({ menuId });

    res.json({
      success: true,
      message: 'Ratings retrieved successfully',
      data: {
        ratings: ratings.map(rating => ({
          ...rating.toObject(),
          user: rating.anonymous ? null : rating.user
        })),
        stats,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get ratings error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch ratings',
      code: 'RATINGS_FETCH_ERROR'
    });
  }
});

// POST /api/dining/menu - Create menu (Warden/Admin only)
router.post('/menu', [
  requireWarden,
  body('date').isISO8601().withMessage('Valid date is required'),
  body('mealType').isIn(['breakfast', 'lunch', 'dinner']).withMessage('Invalid meal type'),
  body('items').isArray().withMessage('Items must be an array'),
  body('timings.start').notEmpty().withMessage('Start time is required'),
  body('timings.end').notEmpty().withMessage('End time is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const menuData = {
      ...req.body,
      createdBy: req.user.id
    };

    const menu = new MessMenu(menuData);
    await menu.save();

    res.status(201).json({
      success: true,
      message: 'Menu created successfully',
      data: menu
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Menu already exists for this date and meal type',
        code: 'MENU_EXISTS'
      });
    }

    console.error('Create menu error:', error);
    res.status(500).json({ 
      error: 'Failed to create menu',
      code: 'MENU_CREATE_ERROR'
    });
  }
});

// PUT /api/dining/menu/:id - Update menu (Warden/Admin only)
router.put('/menu/:id', [
  requireWarden,
  param('id').notEmpty().withMessage('Menu ID is required')
], async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const menu = await MessMenu.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!menu) {
      return res.status(404).json({
        error: 'Menu not found',
        code: 'MENU_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: 'Menu updated successfully',
      data: menu
    });

  } catch (error) {
    console.error('Update menu error:', error);
    res.status(500).json({ 
      error: 'Failed to update menu',
      code: 'MENU_UPDATE_ERROR'
    });
  }
});

// GET /api/dining/stats/student - Get student-accessible dining statistics
router.get('/stats/student', authenticateToken, async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    
    if (period === 'week') {
      // Start of current week (Monday)
      const monday = new Date(now);
      monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
      monday.setHours(0, 0, 0, 0);
      startDate = monday;
    } else if (period === 'month') {
      // Start of current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)); // Default to last 7 days
    }

    // Get all menus in the period
    const menus = await MessMenu.find({
      date: { $gte: startDate, $lte: now }
    });

    const menuIds = menus.map(menu => menu._id);

    // Get all ratings for these menus
    const ratings = await MealRating.find({
      menuId: { $in: menuIds }
    }).populate('menuId', 'date');

    // Calculate overall statistics
    const overall = {
      totalMealsServed: menus.length,
      totalReviews: ratings.length,
      averageRating: 0,
      satisfactionRate: 0
    };

    if (ratings.length > 0) {
      const totalRating = ratings.reduce((sum, rating) => sum + rating.rating, 0);
      overall.averageRating = totalRating / ratings.length;
      
      const satisfiedRatings = ratings.filter(rating => rating.rating >= 4).length;
      overall.satisfactionRate = (satisfiedRatings / ratings.length) * 100;
    }

    // Calculate meal type statistics
    const mealTypes = ['breakfast', 'lunch', 'dinner'];
    const mealTypeStats = {};

    for (const mealType of mealTypes) {
      const mealMenus = menus.filter(menu => menu.meals && menu.meals[mealType]);
      const mealMenuIds = mealMenus.map(menu => menu._id);
      const mealRatings = ratings.filter(rating => 
        mealMenuIds.some(id => id.toString() === rating.menuId._id.toString())
      );

      if (mealRatings.length > 0) {
        const avgRating = mealRatings.reduce((sum, r) => sum + r.rating, 0) / mealRatings.length;
        const avgTaste = mealRatings.reduce((sum, r) => sum + (r.taste || 0), 0) / mealRatings.length;
        const avgQuality = mealRatings.reduce((sum, r) => sum + (r.quality || 0), 0) / mealRatings.length;
        const avgQuantity = mealRatings.reduce((sum, r) => sum + (r.quantity || 0), 0) / mealRatings.length;
        
        const recommended = mealRatings.filter(r => r.wouldRecommend).length;
        const recommendationRate = (recommended / mealRatings.length) * 100;

        // Star distribution
        const starDistribution = {};
        for (let i = 1; i <= 5; i++) {
          starDistribution[i] = mealRatings.filter(r => Math.floor(r.rating) === i).length;
        }

        // Recent feedback (last 3, anonymized)
        const recentFeedback = mealRatings
          .filter(r => r.feedback && r.feedback.trim() !== '')
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 3)
          .map(r => ({
            rating: r.rating,
            feedback: r.feedback,
            createdAt: r.createdAt
          }));

        mealTypeStats[mealType] = {
          totalRatings: mealRatings.length,
          averageRating: avgRating,
          averageTaste: avgTaste,
          averageQuality: avgQuality,
          averageQuantity: avgQuantity,
          recommendationRate,
          starDistribution,
          recentFeedback
        };
      }
    }

    res.json({
      success: true,
      message: 'Statistics retrieved successfully',
      data: {
        period,
        startDate,
        endDate: now,
        overall,
        ...mealTypeStats
      }
    });

  } catch (error) {
    console.error('Student stats error:', error);
    res.status(500).json({ 
      error: 'Server error',
      details: error.message 
    });
  }
});

// GET /api/dining/stats - Get dining statistics (Admin only)
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchCondition = {};
    if (startDate && endDate) {
      matchCondition.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const stats = await MealRating.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          totalRatings: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          averageTaste: { $avg: '$taste' },
          averageQuality: { $avg: '$quality' },
          averageQuantity: { $avg: '$quantity' },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      }
    ]);

    const menuCount = await MessMenu.countDocuments();
    const todayMenuCount = await MessMenu.countDocuments({
      date: {
        $gte: new Date().setHours(0, 0, 0, 0),
        $lt: new Date().setHours(23, 59, 59, 999)
      }
    });

    res.json({
      success: true,
      message: 'Dining statistics retrieved successfully',
      data: {
        ratings: stats[0] || {
          totalRatings: 0,
          averageRating: 0,
          averageTaste: 0,
          averageQuality: 0,
          averageQuantity: 0
        },
        menus: {
          total: menuCount,
          today: todayMenuCount
        }
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch statistics',
      code: 'STATS_ERROR'
    });
  }
});

module.exports = router;