const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch user from database to ensure they still exist and are active
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        code: 'TOKEN_INVALID'
      });
    }

    req.user = {
      id: user._id,
      identifier: user.identifier,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!userRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: userRoles,
        current: req.user.role
      });
    }

    next();
  };
};

const requireStudent = requireRole('student');
const requireWarden = requireRole('warden');
const requireCanteenOwner = requireRole('canteen_owner');
const requireAdmin = requireRole('admin');
const requireStaff = requireRole(['warden', 'canteen_owner', 'admin']);

module.exports = {
  authenticateToken,
  requireRole,
  requireStudent,
  requireWarden,
  requireCanteenOwner,
  requireAdmin,
  requireStaff
};