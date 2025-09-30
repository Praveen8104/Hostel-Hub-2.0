const mongoose = require('mongoose');

const mealRatingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  menuId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MessMenu',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  taste: {
    type: Number,
    min: 1,
    max: 5
  },
  quality: {
    type: Number,
    min: 1,
    max: 5
  },
  quantity: {
    type: Number,
    min: 1,
    max: 5
  },
  feedback: {
    type: String,
    maxlength: 500,
    trim: true
  },
  improvements: [{
    type: String,
    enum: ['taste', 'quality', 'quantity', 'variety', 'temperature', 'hygiene', 'service_speed']
  }],
  wouldRecommend: {
    type: Boolean,
    default: false
  },
  anonymous: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index to ensure one rating per user per menu item
mealRatingSchema.index({ user: 1, menuId: 1 }, { unique: true });

// Index for efficient queries
mealRatingSchema.index({ menuId: 1, createdAt: -1 });
mealRatingSchema.index({ rating: -1 });

// Calculate overall rating from individual components
mealRatingSchema.pre('save', function(next) {
  if (this.taste && this.quality && this.quantity) {
    this.rating = Math.round((this.taste + this.quality + this.quantity) / 3);
  }
  next();
});

// Static method to calculate menu statistics
mealRatingSchema.statics.getMenuStats = async function(menuId) {
  const stats = await this.aggregate([
    { $match: { menuId: mongoose.Types.ObjectId(menuId) } },
    {
      $group: {
        _id: '$menuId',
        averageRating: { $avg: '$rating' },
        totalRatings: { $sum: 1 },
        averageTaste: { $avg: '$taste' },
        averageQuality: { $avg: '$quality' },
        averageQuantity: { $avg: '$quantity' },
        ratingDistribution: {
          $push: '$rating'
        }
      }
    }
  ]);

  if (stats.length === 0) {
    return {
      averageRating: 0,
      totalRatings: 0,
      averageTaste: 0,
      averageQuality: 0,
      averageQuantity: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }

  const result = stats[0];
  
  // Calculate rating distribution
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  result.ratingDistribution.forEach(rating => {
    distribution[rating]++;
  });

  return {
    ...result,
    averageRating: Math.round(result.averageRating * 10) / 10, // Round to 1 decimal
    ratingDistribution: distribution
  };
};

module.exports = mongoose.model('MealRating', mealRatingSchema);