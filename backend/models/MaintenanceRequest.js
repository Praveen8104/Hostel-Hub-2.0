const mongoose = require('mongoose');

const maintenanceRequestSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: true,
    trim: true,
    maxLength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxLength: 1000
  },
  
  // Request Details
  category: {
    type: String,
    required: true,
    enum: [
      'electrical',
      'plumbing', 
      'furniture',
      'internet',
      'ac_heating',
      'lighting',
      'door_window',
      'cleaning',
      'security',
      'other'
    ]
  },
  priority: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Location Information
  location: {
    building: {
      type: String,
      required: true
    },
    floor: {
      type: Number,
      required: true
    },
    roomNumber: {
      type: String,
      required: true
    },
    specificLocation: {
      type: String, // e.g., "Bathroom sink", "Study table", "Window"
      trim: true
    }
  },
  
  // Media Attachments
  photos: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Status Management
  status: {
    type: String,
    enum: [
      'pending',      // Just submitted
      'acknowledged', // Staff has seen it
      'in_progress',  // Work has started
      'waiting_parts', // Waiting for materials
      'completed',    // Work finished
      'cancelled',    // Request cancelled
      'rejected'      // Request rejected
    ],
    default: 'pending'
  },
  
  // Assignment Information
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedAt: {
    type: Date,
    default: null
  },
  
  // Timeline
  expectedCompletionDate: {
    type: Date,
    default: null
  },
  actualCompletionDate: {
    type: Date,
    default: null
  },
  
  // Feedback and Resolution
  resolutionNotes: {
    type: String,
    trim: true,
    maxLength: 500
  },
  studentRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  studentFeedback: {
    type: String,
    trim: true,
    maxLength: 500
  },
  
  // Request Origin
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Emergency/Urgent Flags
  isEmergency: {
    type: Boolean,
    default: false
  },
  
  // Cost Information (for admin tracking)
  estimatedCost: {
    type: Number,
    default: 0
  },
  actualCost: {
    type: Number,
    default: 0
  },
  
  // Status History for tracking
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'acknowledged', 'in_progress', 'waiting_parts', 'completed', 'cancelled', 'rejected']
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      trim: true
    }
  }],
  
  // Contact Information
  contactNumber: {
    type: String,
    trim: true
  },
  preferredTimeSlot: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'anytime'],
    default: 'anytime'
  }
}, {
  timestamps: true
});

// Indexes for performance
maintenanceRequestSchema.index({ requestedBy: 1 });
maintenanceRequestSchema.index({ status: 1 });
maintenanceRequestSchema.index({ category: 1 });
maintenanceRequestSchema.index({ priority: 1 });
maintenanceRequestSchema.index({ assignedTo: 1 });
maintenanceRequestSchema.index({ createdAt: -1 });
maintenanceRequestSchema.index({ 'location.building': 1, 'location.floor': 1 });

// Compound indexes
maintenanceRequestSchema.index({ status: 1, priority: -1, createdAt: -1 });
maintenanceRequestSchema.index({ assignedTo: 1, status: 1 });

// Virtual for request age in days
maintenanceRequestSchema.virtual('ageInDays').get(function() {
  return Math.ceil((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for priority score (for sorting)
maintenanceRequestSchema.virtual('priorityScore').get(function() {
  const scores = { urgent: 4, high: 3, medium: 2, low: 1 };
  return scores[this.priority] || 1;
});

// Static method to get request statistics
maintenanceRequestSchema.statics.getStats = async function(filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        avgRating: { $avg: '$studentRating' },
        urgentCount: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || {
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    avgRating: 0,
    urgentCount: 0
  };
};

// Instance method to update status with history
maintenanceRequestSchema.methods.updateStatus = function(newStatus, changedBy, notes = '') {
  // Add to status history
  this.statusHistory.push({
    status: newStatus,
    changedBy: changedBy,
    notes: notes
  });
  
  // Update current status
  this.status = newStatus;
  
  // Set completion date if completed
  if (newStatus === 'completed') {
    this.actualCompletionDate = new Date();
  }
  
  return this.save();
};

// Instance method to calculate response time
maintenanceRequestSchema.methods.getResponseTime = function() {
  const acknowledgedHistory = this.statusHistory.find(h => h.status === 'acknowledged');
  if (acknowledgedHistory) {
    return acknowledgedHistory.changedAt - this.createdAt;
  }
  return null;
};

// Pre-save middleware to add initial status to history
maintenanceRequestSchema.pre('save', function(next) {
  if (this.isNew) {
    this.statusHistory.push({
      status: 'pending',
      changedBy: this.requestedBy,
      notes: 'Request submitted'
    });
  }
  next();
});

module.exports = mongoose.model('MaintenanceRequest', maintenanceRequestSchema);