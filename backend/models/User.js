const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  identifier: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['student', 'warden', 'canteen_owner', 'admin'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  deviceTokens: [{
    token: String,
    platform: {
      type: String,
      enum: ['ios', 'android', 'web']
    },
    lastUsed: {
      type: Date,
      default: Date.now
    }
  }],
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Get user dashboard based on role
userSchema.methods.getDashboardData = function() {
  const baseData = {
    id: this._id,
    identifier: this.identifier,
    email: this.email,
    role: this.role,
    lastLogin: this.lastLogin
  };

  return baseData;
};

module.exports = mongoose.model('User', userSchema);