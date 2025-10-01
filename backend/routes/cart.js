const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const { Cart, Order } = require('../models/Order');
const { MenuItem } = require('../models/Menu');
const auth = require('../middleware/auth');

// Validation rules
const addToCartValidation = [
  body('menuItemId')
    .isMongoId()
    .withMessage('Valid menu item ID is required'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  body('specialInstructions')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Special instructions must be less than 200 characters')
];

const orderValidation = [
  body('deliveryAddress.hostelBlock')
    .notEmpty()
    .withMessage('Hostel block is required'),
  body('deliveryAddress.roomNumber')
    .notEmpty()
    .withMessage('Room number is required'),
  body('deliveryAddress.floor')
    .isInt({ min: 0 })
    .withMessage('Floor must be a non-negative integer'),
  body('deliveryAddress.contactNumber')
    .isMobilePhone()
    .withMessage('Valid contact number is required'),
  body('paymentMethod')
    .isIn(['cash', 'card', 'upi', 'wallet'])
    .withMessage('Invalid payment method'),
  body('deliveryInstructions')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Delivery instructions must be less than 500 characters')
];

// GET /api/cart - Get user's cart
router.get('/', auth, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id })
      .populate({
        path: 'items.menuItem',
        populate: {
          path: 'category',
          select: 'name icon'
        }
      });

    if (!cart) {
      cart = new Cart({ user: req.user._id });
      await cart.save();
    }

    res.json({
      success: true,
      data: cart
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cart'
    });
  }
});

// POST /api/cart/add - Add item to cart
router.post('/add', auth, addToCartValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { menuItemId, quantity, specialInstructions } = req.body;

    // Verify menu item exists and is available
    const menuItem = await MenuItem.findById(menuItemId);
    if (!menuItem || !menuItem.isActive || !menuItem.isAvailable) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not available'
      });
    }

    // Check stock availability
    if (menuItem.stock !== -1 && menuItem.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock available'
      });
    }

    // Get or create cart
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id });
    }

    // Add item to cart
    await cart.addItem(menuItemId, quantity, menuItem.price, specialInstructions);

    // Populate the cart items for response
    await cart.populate({
      path: 'items.menuItem',
      populate: {
        path: 'category',
        select: 'name icon'
      }
    });

    res.json({
      success: true,
      message: 'Item added to cart successfully',
      data: cart
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add item to cart'
    });
  }
});

// PUT /api/cart/update - Update item quantity in cart
router.put('/update', auth, [
  body('menuItemId').isMongoId().withMessage('Valid menu item ID is required'),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { menuItemId, quantity } = req.body;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // If quantity is 0, remove item
    if (quantity === 0) {
      await cart.removeItem(menuItemId);
    } else {
      // Verify stock availability for increased quantity
      const menuItem = await MenuItem.findById(menuItemId);
      if (menuItem && menuItem.stock !== -1) {
        const currentItem = cart.items.find(item => item.menuItem.toString() === menuItemId);
        const currentQuantity = currentItem ? currentItem.quantity : 0;
        const quantityDifference = quantity - currentQuantity;
        
        if (quantityDifference > 0 && menuItem.stock < quantityDifference) {
          return res.status(400).json({
            success: false,
            message: 'Insufficient stock available'
          });
        }
      }

      await cart.updateItemQuantity(menuItemId, quantity);
    }

    // Populate the cart items for response
    await cart.populate({
      path: 'items.menuItem',
      populate: {
        path: 'category',
        select: 'name icon'
      }
    });

    res.json({
      success: true,
      message: 'Cart updated successfully',
      data: cart
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update cart'
    });
  }
});

// DELETE /api/cart/remove/:menuItemId - Remove item from cart
router.delete('/remove/:menuItemId', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    await cart.removeItem(req.params.menuItemId);

    // Populate the cart items for response
    await cart.populate({
      path: 'items.menuItem',
      populate: {
        path: 'category',
        select: 'name icon'
      }
    });

    res.json({
      success: true,
      message: 'Item removed from cart successfully',
      data: cart
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to remove item from cart'
    });
  }
});

// DELETE /api/cart/clear - Clear entire cart
router.delete('/clear', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    await cart.clearCart();

    res.json({
      success: true,
      message: 'Cart cleared successfully',
      data: cart
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart'
    });
  }
});

// POST /api/orders - Place new order
router.post('/', auth, orderValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Get user's cart
    const cart = await Cart.findOne({ user: req.user._id })
      .populate('items.menuItem');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Verify all items are still available and in stock
    for (const item of cart.items) {
      const menuItem = item.menuItem;
      if (!menuItem.isActive || !menuItem.isAvailable) {
        return res.status(400).json({
          success: false,
          message: `${menuItem.name} is no longer available`
        });
      }

      if (menuItem.stock !== -1 && menuItem.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${menuItem.name}. Available: ${menuItem.stock}`
        });
      }
    }

    // Generate order number
    const orderNumber = await Order.generateOrderNumber();

    // Create order items
    const orderItems = cart.items.map(item => ({
      menuItem: item.menuItem._id,
      name: item.menuItem.name,
      price: item.price,
      quantity: item.quantity,
      specialInstructions: item.specialInstructions,
      subtotal: item.price * item.quantity
    }));

    // Calculate totals
    const totalAmount = cart.totalAmount;
    const deliveryFee = totalAmount >= 100 ? 0 : 20; // Free delivery above ₹100
    const finalAmount = totalAmount + deliveryFee;

    // Create order
    const order = new Order({
      orderNumber,
      user: req.user._id,
      items: orderItems,
      totalAmount,
      deliveryFee,
      finalAmount,
      paymentMethod: req.body.paymentMethod,
      deliveryAddress: req.body.deliveryAddress,
      deliveryInstructions: req.body.deliveryInstructions
    });

    await order.save();

    // Update menu item stock and order counts
    for (const item of cart.items) {
      await item.menuItem.incrementOrderCount(item.quantity);
    }

    // Clear the cart
    await cart.clearCart();

    // Populate order for response
    await order.populate([
      { path: 'user', select: 'name email' },
      { path: 'items.menuItem', select: 'name image category' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: order
    });
  } catch (error) {
    console.error('Place order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to place order'
    });
  }
});

// GET /api/orders - Get user's orders
router.get('/', auth, [
  query('status').optional().isIn(['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { user: req.user._id };
    if (req.query.status) {
      query.status = req.query.status;
    }

    const orders = await Order.find(query)
      .populate([
        { path: 'items.menuItem', select: 'name image category' },
        { path: 'assignedDeliveryPerson', select: 'name' }
      ])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
});

// GET /api/orders/:id - Get single order
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate([
        { path: 'user', select: 'name email' },
        { path: 'items.menuItem', select: 'name image category' },
        { path: 'assignedDeliveryPerson', select: 'name' },
        { path: 'statusHistory.updatedBy', select: 'name' }
      ]);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user has access to this order
    if (order.user._id.toString() !== req.user._id.toString() && 
        !['admin', 'canteen_owner'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order'
    });
  }
});

// PUT /api/orders/:id/status - Update order status (Admin/Canteen owner only)
router.put('/:id/status', auth, [
  body('status')
    .isIn(['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'])
    .withMessage('Invalid status'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
], async (req, res) => {
  try {
    // Only admin and canteen_owner can update order status
    if (!['admin', 'canteen_owner'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    await order.updateStatus(req.body.status, req.user._id, req.body.notes);

    // Populate order for response
    await order.populate([
      { path: 'user', select: 'name email' },
      { path: 'items.menuItem', select: 'name image category' },
      { path: 'statusHistory.updatedBy', select: 'name' }
    ]);

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
});

// POST /api/orders/:id/cancel - Cancel order
router.post('/:id/cancel', auth, [
  body('reason')
    .notEmpty()
    .withMessage('Cancellation reason is required')
    .isLength({ max: 500 })
    .withMessage('Reason must be less than 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns the order or is admin/canteen_owner
    if (order.user.toString() !== req.user._id.toString() && 
        !['admin', 'canteen_owner'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await order.cancelOrder(req.body.reason, req.user._id);

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to cancel order'
    });
  }
});

// POST /api/orders/:id/rate - Rate order
router.post('/:id/rate', auth, [
  body('food').isFloat({ min: 1, max: 5 }).withMessage('Food rating must be between 1 and 5'),
  body('delivery').isFloat({ min: 1, max: 5 }).withMessage('Delivery rating must be between 1 and 5'),
  body('overall').isFloat({ min: 1, max: 5 }).withMessage('Overall rating must be between 1 and 5'),
  body('comment').optional().isLength({ max: 1000 }).withMessage('Comment must be less than 1000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns the order
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await order.addRating(req.body);

    res.json({
      success: true,
      message: 'Rating added successfully',
      data: order.rating
    });
  } catch (error) {
    console.error('Rate order error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to rate order'
    });
  }
});

// GET /api/orders/stats - Get order statistics (Admin/Canteen owner only)
router.get('/stats', auth, [
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
  query('status').optional().isIn(['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'])
], async (req, res) => {
  try {
    // Only admin and canteen_owner can view stats
    if (!['admin', 'canteen_owner'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const filters = {
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      status: req.query.status
    };

    const stats = await Order.getOrderStats(filters);

    res.json({
      success: true,
      data: stats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        statusCounts: {}
      }
    });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order statistics'
    });
  }
});

module.exports = router;