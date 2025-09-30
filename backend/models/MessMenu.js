const mongoose = require('mongoose');

const messMenuSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true
  },
  mealType: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner'],
    required: true
  },
  items: [{
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    category: {
      type: String,
      enum: ['main', 'side', 'beverage', 'dessert', 'bread'],
      default: 'main'
    },
    isVegetarian: {
      type: Boolean,
      default: true
    },
    isVegan: {
      type: Boolean,
      default: false
    },
    calories: {
      type: Number,
      default: 0
    }
  }],
  timings: {
    start: {
      type: String,
      required: true
    },
    end: {
      type: String,
      required: true
    }
  },
  specialNotes: {
    type: String,
    default: ''
  },
  nutritionalInfo: {
    totalCalories: Number,
    protein: Number,
    carbs: Number,
    fat: Number,
    fiber: Number
  },
  queueStatus: {
    type: String,
    enum: ['light', 'medium', 'heavy'],
    default: 'medium'
  },
  estimatedWaitTime: {
    type: Number, // in minutes
    default: 0
  },
  isAvailable: {
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

// Compound index for efficient queries
messMenuSchema.index({ date: 1, mealType: 1 }, { unique: true });
messMenuSchema.index({ date: -1 });

// Calculate average rating virtual field
messMenuSchema.virtual('averageRating', {
  ref: 'MealRating',
  localField: '_id',
  foreignField: 'menuId',
  justOne: false
});

// Populate average rating
messMenuSchema.virtual('ratingStats').get(function() {
  return {
    averageRating: this.averageRating || 0,
    totalRatings: this.totalRatings || 0
  };
});

// Pre-save middleware to set nutritional info
messMenuSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.nutritionalInfo.totalCalories = this.items.reduce((total, item) => {
      return total + (item.calories || 0);
    }, 0);
  }
  next();
});

module.exports = mongoose.model('MessMenu', messMenuSchema);