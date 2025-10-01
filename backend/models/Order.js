const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  specialInstructions: {
    type: String,
    trim: true,
    maxlength: 200
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  totalAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  itemCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
cartSchema.index({ user: 1 });
cartSchema.index({ lastUpdated: 1 });

// Virtual for cart summary
cartSchema.virtual('summary').get(function() {
  return {
    itemCount: this.itemCount,
    totalAmount: this.totalAmount,
    uniqueItems: this.items.length
  };
});

// Method to add item to cart
cartSchema.methods.addItem = function(menuItemId, quantity = 1, price, specialInstructions = '') {
  const existingItemIndex = this.items.findIndex(
    item => item.menuItem.toString() === menuItemId.toString()
  );
  
  if (existingItemIndex > -1) {
    // Update existing item
    this.items[existingItemIndex].quantity += quantity;
    this.items[existingItemIndex].specialInstructions = specialInstructions || this.items[existingItemIndex].specialInstructions;
    this.items[existingItemIndex].addedAt = new Date();
  } else {
    // Add new item
    this.items.push({
      menuItem: menuItemId,
      quantity,
      price,
      specialInstructions
    });
  }
  
  this.recalculateTotal();
  this.lastUpdated = new Date();
  return this.save();
};

// Method to update item quantity
cartSchema.methods.updateItemQuantity = function(menuItemId, quantity) {
  const itemIndex = this.items.findIndex(
    item => item.menuItem.toString() === menuItemId.toString()
  );
  
  if (itemIndex > -1) {
    if (quantity <= 0) {
      this.items.splice(itemIndex, 1);
    } else {
      this.items[itemIndex].quantity = quantity;
      this.items[itemIndex].addedAt = new Date();
    }
    
    this.recalculateTotal();
    this.lastUpdated = new Date();
    return this.save();
  }
  
  throw new Error('Item not found in cart');
};

// Method to remove item from cart
cartSchema.methods.removeItem = function(menuItemId) {
  const itemIndex = this.items.findIndex(
    item => item.menuItem.toString() === menuItemId.toString()
  );
  
  if (itemIndex > -1) {
    this.items.splice(itemIndex, 1);
    this.recalculateTotal();
    this.lastUpdated = new Date();
    return this.save();
  }
  
  throw new Error('Item not found in cart');
};

// Method to clear cart
cartSchema.methods.clearCart = function() {
  this.items = [];
  this.totalAmount = 0;
  this.itemCount = 0;
  this.lastUpdated = new Date();
  return this.save();
};

// Method to recalculate total
cartSchema.methods.recalculateTotal = function() {
  this.totalAmount = this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  this.itemCount = this.items.reduce((count, item) => count + item.quantity, 0);
};

// Pre-save middleware
cartSchema.pre('save', function(next) {
  this.recalculateTotal();
  next();
});

const orderItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  name: {
    type: String,
    required: true // Store name in case menu item is deleted
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  specialInstructions: {
    type: String,
    trim: true
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  deliveryFee: {
    type: Number,
    default: 0,
    min: 0
  },
  discount: {
    amount: {
      type: Number,
      default: 0,
      min: 0
    },
    reason: {
      type: String,
      trim: true
    }
  },
  finalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'wallet'],
    default: 'cash'
  },
  deliveryAddress: {
    hostelBlock: String,
    roomNumber: String,
    floor: Number,
    landmark: String,
    contactNumber: String
  },
  deliveryInstructions: {
    type: String,
    trim: true
  },
  estimatedDeliveryTime: {
    type: Date
  },
  actualDeliveryTime: {
    type: Date
  },
  preparationStartTime: {
    type: Date
  },
  preparationEndTime: {
    type: Date
  },
  assignedDeliveryPerson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  statusHistory: [{
    status: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String
  }],
  rating: {
    food: {
      type: Number,
      min: 1,
      max: 5
    },
    delivery: {
      type: Number,
      min: 1,
      max: 5
    },
    overall: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    ratedAt: Date
  },
  cancellationReason: {
    type: String,
    trim: true
  },
  isRefundRequested: {
    type: Boolean,
    default: false
  },
  refundAmount: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Indexes for better performance
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ assignedDeliveryPerson: 1, status: 1 });

// Virtual for order duration
orderSchema.virtual('duration').get(function() {
  if (this.actualDeliveryTime && this.createdAt) {
    return Math.round((this.actualDeliveryTime - this.createdAt) / (1000 * 60)); // in minutes
  }
  return null;
});

// Virtual for is cancellable
orderSchema.virtual('isCancellable').get(function() {
  return ['pending', 'confirmed'].includes(this.status);
});

// Virtual for tracking info
orderSchema.virtual('trackingInfo').get(function() {
  const stages = [
    { key: 'pending', label: 'Order Placed', completed: true },
    { key: 'confirmed', label: 'Order Confirmed', completed: false },
    { key: 'preparing', label: 'Preparing', completed: false },
    { key: 'ready', label: 'Ready for Delivery', completed: false },
    { key: 'out_for_delivery', label: 'Out for Delivery', completed: false },
    { key: 'delivered', label: 'Delivered', completed: false }
  ];
  
  const statusOrder = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
  const currentStatusIndex = statusOrder.indexOf(this.status);
  
  stages.forEach((stage, index) => {
    if (index <= currentStatusIndex) {
      stage.completed = true;
    }
  });
  
  return stages;
});

// Method to update status
orderSchema.methods.updateStatus = function(newStatus, updatedBy, notes = '') {
  this.status = newStatus;
  
  // Set timestamps based on status
  const now = new Date();
  switch (newStatus) {
    case 'preparing':
      this.preparationStartTime = now;
      break;
    case 'ready':
      this.preparationEndTime = now;
      break;
    case 'delivered':
      this.actualDeliveryTime = now;
      break;
  }
  
  // Add to status history
  this.statusHistory.push({
    status: newStatus,
    timestamp: now,
    updatedBy,
    notes
  });
  
  return this.save();
};

// Method to cancel order
orderSchema.methods.cancelOrder = function(reason, updatedBy) {
  if (!this.isCancellable) {
    throw new Error('Order cannot be cancelled at this stage');
  }
  
  this.status = 'cancelled';
  this.cancellationReason = reason;
  
  this.statusHistory.push({
    status: 'cancelled',
    timestamp: new Date(),
    updatedBy,
    notes: `Cancelled: ${reason}`
  });
  
  return this.save();
};

// Method to add rating
orderSchema.methods.addRating = function(ratingData) {
  if (this.status !== 'delivered') {
    throw new Error('Can only rate delivered orders');
  }
  
  this.rating = {
    ...ratingData,
    ratedAt: new Date()
  };
  
  return this.save();
};

// Static method to generate order number
orderSchema.statics.generateOrderNumber = async function() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  
  const count = await this.countDocuments({
    createdAt: {
      $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
      $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
    }
  });
  
  return `ORD${dateStr}${(count + 1).toString().padStart(3, '0')}`;
};

// Static method to get order statistics
orderSchema.statics.getOrderStats = function(filters = {}) {
  const matchStage = {};
  
  if (filters.dateFrom) {
    matchStage.createdAt = { $gte: new Date(filters.dateFrom) };
  }
  
  if (filters.dateTo) {
    matchStage.createdAt = { 
      ...matchStage.createdAt, 
      $lte: new Date(filters.dateTo) 
    };
  }
  
  if (filters.status) {
    matchStage.status = filters.status;
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$finalAmount' },
        averageOrderValue: { $avg: '$finalAmount' },
        statusBreakdown: {
          $push: {
            status: '$status',
            amount: '$finalAmount'
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalOrders: 1,
        totalRevenue: 1,
        averageOrderValue: 1,
        statusCounts: {
          $arrayToObject: {
            $map: {
              input: { $setUnion: ['$statusBreakdown.status'] },
              as: 'status',
              in: {
                k: '$$status',
                v: {
                  $size: {
                    $filter: {
                      input: '$statusBreakdown',
                      cond: { $eq: ['$$this.status', '$$status'] }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  ]);
};

// Pre-save middleware for orders
orderSchema.pre('save', function(next) {
  if (this.isNew) {
    // Calculate final amount
    this.finalAmount = this.totalAmount + this.deliveryFee - this.discount.amount;
    
    // Set estimated delivery time (30 minutes from creation)
    if (!this.estimatedDeliveryTime) {
      this.estimatedDeliveryTime = new Date(Date.now() + 30 * 60 * 1000);
    }
    
    // Add initial status to history
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date()
    });
  }
  
  next();
});

const Cart = mongoose.model('Cart', cartSchema);
const Order = mongoose.model('Order', orderSchema);

module.exports = { Cart, Order };