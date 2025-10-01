const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { body, validationResult, query } = require('express-validator');
const Announcement = require('../models/Announcement');
const { authenticateToken, requireWarden, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/announcements/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only images and documents (PDF, DOC, DOCX) are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

// Validation rules for announcements
const announcementValidation = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title must be less than 200 characters'),
  body('content')
    .notEmpty()
    .withMessage('Content is required')
    .isLength({ min: 10 })
    .withMessage('Content must be at least 10 characters'),
  body('category')
    .isIn(['notice', 'event', 'emergency', 'maintenance', 'dining', 'general'])
    .withMessage('Invalid category'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  body('targetAudience')
    .isIn(['all', 'students', 'staff', 'wardens'])
    .withMessage('Invalid target audience'),
  body('specificRooms')
    .optional()
    .isArray()
    .withMessage('Specific rooms must be an array'),
  body('specificFloors')
    .optional()
    .isArray()
    .withMessage('Specific floors must be an array'),
  body('eventDetails.startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  body('eventDetails.endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Invalid expiry date format')
];

// GET /api/announcements - Get all announcements for user
router.get('/', authenticateToken, [
  query('category').optional().isIn(['notice', 'event', 'emergency', 'maintenance', 'dining', 'general']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  query('unreadOnly').optional().isBoolean(),
  query('upcomingEvents').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filters = {
      category: req.query.category,
      priority: req.query.priority,
      unreadOnly: req.query.unreadOnly === 'true',
      upcomingEvents: req.query.upcomingEvents === 'true'
    };

    const announcements = await Announcement.getForUser(req.user, filters)
      .skip(skip)
      .limit(limit);

    const total = await Announcement.countDocuments(
      await Announcement.getForUser(req.user, filters).getQuery()
    );

    res.json({
      success: true,
      data: {
        announcements,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcements'
    });
  }
});

// GET /api/announcements/stats - Get announcement statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Only allow staff and above to view stats
    if (!['warden', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const stats = await Announcement.getStats({
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo
    });

    res.json({
      success: true,
      data: stats[0] || {
        totalAnnouncements: 0,
        totalViews: 0,
        activeEvents: 0,
        categoryCounts: {},
        priorityCounts: {}
      }
    });
  } catch (error) {
    console.error('Get announcement stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

// GET /api/announcements/search - Search announcements
router.get('/search', authenticateToken, [
  query('q').notEmpty().withMessage('Search query is required'),
  query('category').optional().isIn(['notice', 'event', 'emergency', 'maintenance', 'dining', 'general']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const searchQuery = req.query.q;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {
      isActive: true,
      $or: [
        { targetAudience: 'all' },
        { targetAudience: req.user.role }
      ],
      $and: [
        {
          $or: [
            { title: { $regex: searchQuery, $options: 'i' } },
            { content: { $regex: searchQuery, $options: 'i' } },
            { tags: { $in: [new RegExp(searchQuery, 'i')] } }
          ]
        }
      ]
    };

    if (req.query.category) {
      query.category = req.query.category;
    }

    if (req.query.priority) {
      query.priority = req.query.priority;
    }

    const announcements = await Announcement.find(query)
      .populate('createdBy', 'name email role')
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Announcement.countDocuments(query);

    res.json({
      success: true,
      data: {
        announcements,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Search announcements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search announcements'
    });
  }
});

// GET /api/announcements/:id - Get single announcement
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
      .populate('createdBy', 'name email role')
      .populate('readBy.user', 'name')
      .populate('eventDetails.registeredParticipants.user', 'name email');

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Check if user has access to this announcement
    const hasAccess = announcement.targetAudience === 'all' || 
                     announcement.targetAudience === req.user.role ||
                     (req.user.role === 'student' && req.user.profile && (
                       announcement.specificRooms.includes(req.user.profile.roomNumber) ||
                       announcement.specificFloors.includes(req.user.profile.floor)
                     ));

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Mark as read if not already read
    await announcement.markAsRead(req.user._id);

    res.json({
      success: true,
      data: announcement
    });
  } catch (error) {
    console.error('Get announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcement'
    });
  }
});

// POST /api/announcements - Create new announcement
router.post('/', authenticateToken, upload.array('attachments', 5), announcementValidation, async (req, res) => {
  try {
    // Only allow staff and above to create announcements
    if (!['warden', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only staff can create announcements'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const announcementData = {
      ...req.body,
      createdBy: req.user._id
    };

    // Process file attachments
    if (req.files && req.files.length > 0) {
      announcementData.attachments = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path
      }));
    }

    // Parse JSON strings for complex fields
    if (typeof req.body.eventDetails === 'string') {
      announcementData.eventDetails = JSON.parse(req.body.eventDetails);
    }
    
    if (typeof req.body.specificRooms === 'string') {
      announcementData.specificRooms = JSON.parse(req.body.specificRooms);
    }
    
    if (typeof req.body.specificFloors === 'string') {
      announcementData.specificFloors = JSON.parse(req.body.specificFloors);
    }

    if (typeof req.body.tags === 'string') {
      announcementData.tags = JSON.parse(req.body.tags);
    }

    const announcement = new Announcement(announcementData);
    await announcement.save();

    await announcement.populate('createdBy', 'name email role');

    // Emit real-time notification (Socket.IO will be integrated later)
    if (req.app.get('socketio')) {
      req.app.get('socketio').emit('new_announcement', {
        announcement,
        targetAudience: announcement.targetAudience
      });
    }

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      data: announcement
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create announcement'
    });
  }
});

// PUT /api/announcements/:id - Update announcement
router.put('/:id', authenticateToken, upload.array('attachments', 5), announcementValidation, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Only creator or admin can update
    if (announcement.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updateData = { ...req.body };

    // Handle file attachments
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path
      }));
      updateData.attachments = [...(announcement.attachments || []), ...newAttachments];
    }

    // Parse JSON strings
    if (typeof req.body.eventDetails === 'string') {
      updateData.eventDetails = JSON.parse(req.body.eventDetails);
    }
    
    if (typeof req.body.specificRooms === 'string') {
      updateData.specificRooms = JSON.parse(req.body.specificRooms);
    }
    
    if (typeof req.body.specificFloors === 'string') {
      updateData.specificFloors = JSON.parse(req.body.specificFloors);
    }

    if (typeof req.body.tags === 'string') {
      updateData.tags = JSON.parse(req.body.tags);
    }

    const updatedAnnouncement = await Announcement.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email role');

    res.json({
      success: true,
      message: 'Announcement updated successfully',
      data: updatedAnnouncement
    });
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update announcement'
    });
  }
});

// DELETE /api/announcements/:id - Delete announcement
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Only creator or admin can delete
    if (announcement.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Soft delete by setting isActive to false
    announcement.isActive = false;
    await announcement.save();

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete announcement'
    });
  }
});

// POST /api/announcements/:id/read - Mark announcement as read
router.post('/:id/read', authenticateToken, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    await announcement.markAsRead(req.user._id);

    res.json({
      success: true,
      message: 'Marked as read'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark as read'
    });
  }
});

// POST /api/announcements/:id/register - Register for event
router.post('/:id/register', authenticateToken, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    await announcement.registerForEvent(req.user._id);

    res.json({
      success: true,
      message: 'Successfully registered for event'
    });
  } catch (error) {
    console.error('Event registration error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to register for event'
    });
  }
});

// DELETE /api/announcements/:id/register - Unregister from event
router.delete('/:id/register', authenticateToken, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    await announcement.unregisterFromEvent(req.user._id);

    res.json({
      success: true,
      message: 'Successfully unregistered from event'
    });
  } catch (error) {
    console.error('Event unregistration error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to unregister from event'
    });
  }
});

// POST /api/announcements/:id/pin - Pin/Unpin announcement
router.post('/:id/pin', authenticateToken, async (req, res) => {
  try {
    // Only admin can pin/unpin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin can pin announcements'
      });
    }

    const announcement = await Announcement.findById(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    announcement.isPinned = !announcement.isPinned;
    await announcement.save();

    res.json({
      success: true,
      message: `Announcement ${announcement.isPinned ? 'pinned' : 'unpinned'} successfully`,
      data: { isPinned: announcement.isPinned }
    });
  } catch (error) {
    console.error('Pin announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to pin/unpin announcement'
    });
  }
});

module.exports = router;
