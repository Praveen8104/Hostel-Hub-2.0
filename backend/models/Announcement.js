const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['notice', 'event', 'emergency', 'maintenance', 'dining', 'general'],
    default: 'general'
  },
  priority: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  targetAudience: {
    type: String,
    required: true,
    enum: ['all', 'students', 'staff', 'wardens'],
    default: 'all'
  },
  specificRooms: [{
    type: String,
    trim: true
  }],
  specificFloors: [{
    type: Number
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  eventDetails: {
    startDate: Date,
    endDate: Date,
    location: String,
    registrationRequired: {
      type: Boolean,
      default: false
    },
    maxParticipants: Number,
    registeredParticipants: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      registeredAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  views: {
    type: Number,
    default: 0
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Indexes for better performance
announcementSchema.index({ category: 1, createdAt: -1 });
announcementSchema.index({ priority: 1, createdAt: -1 });
announcementSchema.index({ targetAudience: 1, isActive: 1 });
announcementSchema.index({ isPinned: -1, createdAt: -1 });
announcementSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
announcementSchema.index({ 'eventDetails.startDate': 1 });

// Virtual for checking if announcement is expired
announcementSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Virtual for read status
announcementSchema.virtual('readCount').get(function() {
  return this.readBy.length;
});

// Virtual for event registration count
announcementSchema.virtual('registrationCount').get(function() {
  return this.eventDetails.registeredParticipants?.length || 0;
});

// Method to mark as read by user
announcementSchema.methods.markAsRead = function(userId) {
  const existingRead = this.readBy.find(read => read.user.toString() === userId.toString());
  if (!existingRead) {
    this.readBy.push({ user: userId });
    this.views += 1;
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to register user for event
announcementSchema.methods.registerForEvent = function(userId) {
  if (this.category !== 'event') {
    throw new Error('Only event announcements allow registration');
  }
  
  if (!this.eventDetails.registrationRequired) {
    throw new Error('This event does not require registration');
  }
  
  const alreadyRegistered = this.eventDetails.registeredParticipants.find(
    participant => participant.user.toString() === userId.toString()
  );
  
  if (alreadyRegistered) {
    throw new Error('User already registered for this event');
  }
  
  if (this.eventDetails.maxParticipants && 
      this.eventDetails.registeredParticipants.length >= this.eventDetails.maxParticipants) {
    throw new Error('Event is full');
  }
  
  this.eventDetails.registeredParticipants.push({ user: userId });
  return this.save();
};

// Method to unregister user from event
announcementSchema.methods.unregisterFromEvent = function(userId) {
  if (this.category !== 'event') {
    throw new Error('Only event announcements allow registration');
  }
  
  const participantIndex = this.eventDetails.registeredParticipants.findIndex(
    participant => participant.user.toString() === userId.toString()
  );
  
  if (participantIndex === -1) {
    throw new Error('User not registered for this event');
  }
  
  this.eventDetails.registeredParticipants.splice(participantIndex, 1);
  return this.save();
};

// Static method to get announcements for user
announcementSchema.statics.getForUser = function(user, filters = {}) {
  const query = {
    isActive: true,
    $or: [
      { targetAudience: 'all' },
      { targetAudience: user.role }
    ]
  };
  
  // Add room/floor specific filtering for students
  if (user.role === 'student' && user.profile) {
    query.$or.push(
      { specificRooms: user.profile.roomNumber },
      { specificFloors: user.profile.floor }
    );
  }
  
  // Apply additional filters
  if (filters.category) {
    query.category = filters.category;
  }
  
  if (filters.priority) {
    query.priority = filters.priority;
  }
  
  if (filters.unreadOnly && user._id) {
    query['readBy.user'] = { $ne: user._id };
  }
  
  if (filters.upcomingEvents) {
    query.category = 'event';
    query['eventDetails.startDate'] = { $gte: new Date() };
  }
  
  return this.find(query)
    .populate('createdBy', 'name email role')
    .populate('readBy.user', 'name')
    .populate('eventDetails.registeredParticipants.user', 'name email')
    .sort({ isPinned: -1, createdAt: -1 });
};

// Static method to get announcement statistics
announcementSchema.statics.getStats = function(filters = {}) {
  const matchStage = { isActive: true };
  
  if (filters.dateFrom) {
    matchStage.createdAt = { $gte: new Date(filters.dateFrom) };
  }
  
  if (filters.dateTo) {
    matchStage.createdAt = { 
      ...matchStage.createdAt, 
      $lte: new Date(filters.dateTo) 
    };
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalAnnouncements: { $sum: 1 },
        byCategory: {
          $push: {
            category: '$category',
            priority: '$priority'
          }
        },
        totalViews: { $sum: '$views' },
        activeEvents: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$category', 'event'] },
                  { $gte: ['$eventDetails.startDate', new Date()] }
                ]
              },
              1, 0
            ]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalAnnouncements: 1,
        totalViews: 1,
        activeEvents: 1,
        categoryCounts: {
          $arrayToObject: {
            $map: {
              input: { $setUnion: ['$byCategory.category'] },
              as: 'cat',
              in: {
                k: '$$cat',
                v: {
                  $size: {
                    $filter: {
                      input: '$byCategory',
                      cond: { $eq: ['$$this.category', '$$cat'] }
                    }
                  }
                }
              }
            }
          }
        },
        priorityCounts: {
          $arrayToObject: {
            $map: {
              input: { $setUnion: ['$byCategory.priority'] },
              as: 'pri',
              in: {
                k: '$$pri',
                v: {
                  $size: {
                    $filter: {
                      input: '$byCategory',
                      cond: { $eq: ['$$this.priority', '$$pri'] }
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

// Pre-save middleware to set expiry for certain categories
announcementSchema.pre('save', function(next) {
  if (this.isNew) {
    // Set default expiry for different categories
    if (!this.expiresAt) {
      const now = new Date();
      switch (this.category) {
        case 'emergency':
          // Emergency announcements expire after 24 hours
          this.expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          break;
        case 'event':
          // Event announcements expire after the event ends
          if (this.eventDetails.endDate) {
            this.expiresAt = this.eventDetails.endDate;
          }
          break;
        case 'notice':
          // Notices expire after 30 days
          this.expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          // General announcements expire after 7 days
          this.expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
    }
    
    // Set priority based on category
    if (this.category === 'emergency' && this.priority !== 'urgent') {
      this.priority = 'urgent';
    }
  }
  
  next();
});

module.exports = mongoose.model('Announcement', announcementSchema);