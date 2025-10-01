const mongoose = require('mongoose');

const menuCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  description: {
    type: String,
    trim: true
  },
  icon: {
    type: String,
    default: '🍽️'
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuCategory',
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  originalPrice: {
    type: Number, // For discount display
    min: 0
  },
  image: {
    filename: String,
    path: String,
    mimetype: String,
    size: Number
  },
  ingredients: [{
    type: String,
    trim: true
  }],
  allergens: [{
    type: String,
    enum: ['nuts', 'dairy', 'gluten', 'soy', 'eggs', 'shellfish', 'fish', 'sesame'],
    trim: true
  }],
  nutritionInfo: {
    calories: Number,
    protein: Number, // in grams
    carbs: Number,   // in grams
    fat: Number,     // in grams
    fiber: Number    // in grams
  },
  tags: [{
    type: String,
    enum: ['vegetarian', 'vegan', 'spicy', 'healthy', 'popular', 'new', 'combo'],
    trim: true
  }],
  preparationTime: {
    type: Number, // in minutes
    default: 15
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  availabilitySchedule: {
    monday: { start: String, end: String, available: { type: Boolean, default: true } },
    tuesday: { start: String, end: String, available: { type: Boolean, default: true } },
    wednesday: { start: String, end: String, available: { type: Boolean, default: true } },
    thursday: { start: String, end: String, available: { type: Boolean, default: true } },
    friday: { start: String, end: String, available: { type: Boolean, default: true } },
    saturday: { start: String, end: String, available: { type: Boolean, default: true } },
    sunday: { start: String, end: String, available: { type: Boolean, default: true } }
  },
  stock: {
    type: Number,
    default: -1 // -1 means unlimited stock
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  orderCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for better performance
menuItemSchema.index({ category: 1, isActive: 1 });
menuItemSchema.index({ isAvailable: 1, isActive: 1 });
menuItemSchema.index({ 'tags': 1 });
menuItemSchema.index({ price: 1 });
menuItemSchema.index({ 'rating.average': -1 });
menuItemSchema.index({ orderCount: -1 });

// Virtual for discount percentage
menuItemSchema.virtual('discountPercentage').get(function() {
  if (this.originalPrice && this.originalPrice > this.price) {
    return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
  }
  return 0;
});

// Virtual for availability today
menuItemSchema.virtual('isAvailableToday').get(function() {
  if (!this.isAvailable || !this.isActive) return false;
  
  const today = new Date().toLocaleDateString('en-US', { weekday: 'lowercase' });
  const todaySchedule = this.availabilitySchedule[today];
  
  if (!todaySchedule || !todaySchedule.available) return false;
  
  if (todaySchedule.start && todaySchedule.end) {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = todaySchedule.start.split(':').map(Number);
    const [endHour, endMin] = todaySchedule.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    return currentTime >= startTime && currentTime <= endTime;
  }
  
  return true;
});

// Virtual for stock status
menuItemSchema.virtual('stockStatus').get(function() {
  if (this.stock === -1) return 'unlimited';
  if (this.stock === 0) return 'out_of_stock';
  if (this.stock <= 5) return 'low_stock';
  return 'in_stock';
});

// Method to update rating
menuItemSchema.methods.updateRating = function(newRating) {
  const totalRating = (this.rating.average * this.rating.count) + newRating;
  this.rating.count += 1;
  this.rating.average = totalRating / this.rating.count;
  return this.save();
};

// Method to increment order count
menuItemSchema.methods.incrementOrderCount = function(quantity = 1) {
  this.orderCount += quantity;
  if (this.stock > 0) {
    this.stock -= quantity;
  }
  return this.save();
};

// Static method to get available items
menuItemSchema.statics.getAvailableItems = function(filters = {}) {
  const query = {
    isActive: true,
    isAvailable: true
  };
  
  if (filters.category) {
    query.category = filters.category;
  }
  
  if (filters.tags && filters.tags.length > 0) {
    query.tags = { $in: filters.tags };
  }
  
  if (filters.priceRange && (filters.priceRange.min !== undefined || filters.priceRange.max !== undefined)) {
    query.price = {};
    if (filters.priceRange.min !== undefined) {
      query.price.$gte = filters.priceRange.min;
    }
    if (filters.priceRange.max !== undefined) {
      query.price.$lte = filters.priceRange.max;
    }
  }
  
  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } },
      { ingredients: { $in: [new RegExp(filters.search, 'i')] } }
    ];
  }
  
  // Filter out items that are out of stock
  if (!filters.includeOutOfStock) {
    query.$or = [
      { stock: { $gt: 0 } },
      { stock: -1 }
    ];
  }
  
  let sortOptions = {};
  switch (filters.sortBy) {
    case 'price_low':
      sortOptions.price = 1;
      break;
    case 'price_high':
      sortOptions.price = -1;
      break;
    case 'rating':
      sortOptions['rating.average'] = -1;
      break;
    case 'popular':
      sortOptions.orderCount = -1;
      break;
    case 'newest':
      sortOptions.createdAt = -1;
      break;
    default:
      sortOptions.name = 1;
  }
  
  return this.find(query)
    .populate('category', 'name icon')
    .sort(sortOptions);
};

// Static method to get popular items
menuItemSchema.statics.getPopularItems = function(limit = 10) {
  return this.find({
    isActive: true,
    isAvailable: true,
    orderCount: { $gt: 0 }
  })
    .populate('category', 'name icon')
    .sort({ orderCount: -1 })
    .limit(limit);
};

// Static method to get recommendations based on user's order history
menuItemSchema.statics.getRecommendations = function(userId, limit = 5) {
  // This would be enhanced with ML recommendations in a real app
  return this.aggregate([
    {
      $match: {
        isActive: true,
        isAvailable: true,
        'rating.average': { $gte: 4.0 }
      }
    },
    { $sample: { size: limit } },
    {
      $lookup: {
        from: 'menucategories',
        localField: 'category',
        foreignField: '_id',
        as: 'category'
      }
    },
    { $unwind: '$category' }
  ]);
};

// Pre-save middleware to validate availability schedule
menuItemSchema.pre('save', function(next) {
  if (this.availabilitySchedule) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    days.forEach(day => {
      if (!this.availabilitySchedule[day]) {
        this.availabilitySchedule[day] = {
          start: '00:00',
          end: '23:59',
          available: true
        };
      }
    });
  }
  
  // Set original price if not provided
  if (!this.originalPrice) {
    this.originalPrice = this.price;
  }
  
  next();
});

const MenuCategory = mongoose.model('MenuCategory', menuCategorySchema);
const MenuItem = mongoose.model('MenuItem', menuItemSchema);

module.exports = { MenuCategory, MenuItem };