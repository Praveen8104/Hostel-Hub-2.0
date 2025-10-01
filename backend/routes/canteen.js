const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { body, validationResult, query } = require('express-validator');
const { MenuCategory, MenuItem } = require('../models/Menu');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Configure multer for menu item images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/menu/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// Validation rules
const categoryValidation = [
  body('name')
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ max: 100 })
    .withMessage('Category name must be less than 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('icon')
    .optional()
    .isLength({ max: 10 })
    .withMessage('Icon must be less than 10 characters'),
  body('displayOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Display order must be a non-negative integer')
];

const menuItemValidation = [
  body('name')
    .notEmpty()
    .withMessage('Item name is required')
    .isLength({ max: 150 })
    .withMessage('Item name must be less than 150 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('category')
    .isMongoId()
    .withMessage('Valid category ID is required'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),
  body('originalPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Original price must be a non-negative number'),
  body('ingredients')
    .optional()
    .isArray()
    .withMessage('Ingredients must be an array'),
  body('preparationTime')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Preparation time must be a positive integer'),
  body('stock')
    .optional()
    .isInt({ min: -1 })
    .withMessage('Stock must be -1 (unlimited) or a non-negative integer')
];

// GET /api/canteen/categories - Get all menu categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await MenuCategory.find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
});

// POST /api/canteen/categories - Create new category (Admin/Canteen owner only)
router.post('/categories', authenticateToken, categoryValidation, async (req, res) => {
  try {
    // Only admin and canteen_owner can create categories
    if (!['admin', 'canteen_owner'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only administrators and canteen owners can create categories.'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const category = new MenuCategory(req.body);
    await category.save();

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    console.error('Create category error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category name already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create category'
    });
  }
});

// GET /api/canteen/menu - Get menu items with filtering and search
router.get('/menu', [
  query('category').optional().isMongoId().withMessage('Invalid category ID'),
  query('search').optional().isLength({ min: 1, max: 100 }).withMessage('Search query must be 1-100 characters'),
  query('tags').optional().isString(),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('sortBy').optional().isIn(['name', 'price_low', 'price_high', 'rating', 'popular', 'newest']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const filters = {
      category: req.query.category,
      search: req.query.search,
      tags: req.query.tags ? req.query.tags.split(',') : [],
      priceRange: {
        min: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
        max: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined
      },
      sortBy: req.query.sortBy || 'name',
      includeOutOfStock: req.query.includeOutOfStock === 'true'
    };

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const menuItems = await MenuItem.getAvailableItems(filters)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalItems = await MenuItem.countDocuments({
      isActive: true,
      isAvailable: true,
      ...(filters.category && { category: filters.category })
    });

    res.json({
      success: true,
      data: {
        items: menuItems,
        pagination: {
          current: page,
          pages: Math.ceil(totalItems / limit),
          total: totalItems
        }
      }
    });
  } catch (error) {
    console.error('Get menu items error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch menu items'
    });
  }
});

// GET /api/canteen/menu/popular - Get popular menu items
router.get('/menu/popular', [
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const popularItems = await MenuItem.getPopularItems(limit);

    res.json({
      success: true,
      data: popularItems
    });
  } catch (error) {
    console.error('Get popular items error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch popular items'
    });
  }
});

// GET /api/canteen/menu/recommendations - Get personalized recommendations
router.get('/menu/recommendations', authenticateToken, [
  query('limit').optional().isInt({ min: 1, max: 20 })
], async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const recommendations = await MenuItem.getRecommendations(req.user._id, limit);

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recommendations'
    });
  }
});

// GET /api/canteen/menu/:id - Get single menu item
router.get('/menu/:id', async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id)
      .populate('category', 'name icon')
      .populate('createdBy', 'name');

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    res.json({
      success: true,
      data: menuItem
    });
  } catch (error) {
    console.error('Get menu item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch menu item'
    });
  }
});

// POST /api/canteen/menu - Create new menu item (Admin/Canteen owner only)
router.post('/menu', authenticateToken, upload.single('image'), menuItemValidation, async (req, res) => {
  try {
    // Only admin and canteen_owner can create menu items
    if (!['admin', 'canteen_owner'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only administrators and canteen owners can create menu items.'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const menuItemData = {
      ...req.body,
      createdBy: req.user._id
    };

    // Handle image upload
    if (req.file) {
      menuItemData.image = {
        filename: req.file.filename,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size
      };
    }

    // Parse JSON strings for arrays
    if (typeof req.body.ingredients === 'string') {
      menuItemData.ingredients = JSON.parse(req.body.ingredients);
    }
    
    if (typeof req.body.allergens === 'string') {
      menuItemData.allergens = JSON.parse(req.body.allergens);
    }
    
    if (typeof req.body.tags === 'string') {
      menuItemData.tags = JSON.parse(req.body.tags);
    }
    
    if (typeof req.body.nutritionInfo === 'string') {
      menuItemData.nutritionInfo = JSON.parse(req.body.nutritionInfo);
    }
    
    if (typeof req.body.availabilitySchedule === 'string') {
      menuItemData.availabilitySchedule = JSON.parse(req.body.availabilitySchedule);
    }

    const menuItem = new MenuItem(menuItemData);
    await menuItem.save();

    await menuItem.populate('category', 'name icon');

    res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      data: menuItem
    });
  } catch (error) {
    console.error('Create menu item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create menu item'
    });
  }
});

// PUT /api/canteen/menu/:id - Update menu item (Admin/Canteen owner only)
router.put('/menu/:id', authenticateToken, upload.single('image'), menuItemValidation, async (req, res) => {
  try {
    // Only admin and canteen_owner can update menu items
    if (!['admin', 'canteen_owner'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only administrators and canteen owners can update menu items.'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    const updateData = { ...req.body };

    // Handle image upload
    if (req.file) {
      updateData.image = {
        filename: req.file.filename,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size
      };
    }

    // Parse JSON strings for arrays
    if (typeof req.body.ingredients === 'string') {
      updateData.ingredients = JSON.parse(req.body.ingredients);
    }
    
    if (typeof req.body.allergens === 'string') {
      updateData.allergens = JSON.parse(req.body.allergens);
    }
    
    if (typeof req.body.tags === 'string') {
      updateData.tags = JSON.parse(req.body.tags);
    }
    
    if (typeof req.body.nutritionInfo === 'string') {
      updateData.nutritionInfo = JSON.parse(req.body.nutritionInfo);
    }
    
    if (typeof req.body.availabilitySchedule === 'string') {
      updateData.availabilitySchedule = JSON.parse(req.body.availabilitySchedule);
    }

    const updatedMenuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('category', 'name icon');

    res.json({
      success: true,
      message: 'Menu item updated successfully',
      data: updatedMenuItem
    });
  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update menu item'
    });
  }
});

// DELETE /api/canteen/menu/:id - Delete menu item (Admin/Canteen owner only)
router.delete('/menu/:id', authenticateToken, async (req, res) => {
  try {
    // Only admin and canteen_owner can delete menu items
    if (!['admin', 'canteen_owner'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only administrators and canteen owners can delete menu items.'
      });
    }

    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    // Soft delete by setting isActive to false
    menuItem.isActive = false;
    await menuItem.save();

    res.json({
      success: true,
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete menu item'
    });
  }
});

// POST /api/canteen/menu/:id/rate - Rate a menu item
router.post('/menu/:id/rate', authenticateToken, [
  body('rating')
    .isFloat({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    await menuItem.updateRating(req.body.rating);

    res.json({
      success: true,
      message: 'Rating added successfully',
      data: {
        averageRating: menuItem.rating.average,
        ratingCount: menuItem.rating.count
      }
    });
  } catch (error) {
    console.error('Rate menu item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to rate menu item'
    });
  }
});

module.exports = router;
