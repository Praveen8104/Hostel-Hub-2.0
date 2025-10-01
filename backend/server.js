const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const diningRoutes = require('./routes/dining');
const outpassRoutes = require('./routes/outpass');
const maintenanceRoutes = require('./routes/maintenance');
const announcementRoutes = require('./routes/announcements');
const canteenRoutes = require('./routes/canteen');
const cartRoutes = require('./routes/cart');
const adminRoutes = require('./routes/admin');

// Import middleware
const { authenticateToken } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hostel-hub', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || "*",
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Hostel Hub API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', authenticateToken, studentRoutes);
app.use('/api/dining', authenticateToken, diningRoutes);
app.use('/api/outpass', authenticateToken, outpassRoutes);
app.use('/api/maintenance', authenticateToken, maintenanceRoutes);
app.use('/api/announcements', authenticateToken, announcementRoutes);
// app.use('/api/canteen', authenticateToken, canteenRoutes); // Temporarily disabled for testing
app.use('/api/cart', authenticateToken, cartRoutes);
app.use('/api/orders', authenticateToken, cartRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);

// Static file serving
app.use('/uploads', express.static('uploads'));

// Socket.IO for real-time features
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  // Join user-specific room
  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined their room`);
  });

  // Join role-specific rooms
  socket.on('join_role', (data) => {
    const { role, hostelBlock } = data;
    if (role === 'student') {
      socket.join(`students_${hostelBlock}`);
      socket.join('students_all');
    } else if (role === 'warden') {
      socket.join('wardens');
    } else if (role === 'canteen_owner') {
      socket.join('canteen_staff');
    }
  });

  // Handle new order notifications
  socket.on('new_order', (orderData) => {
    io.to('canteen_staff').emit('order_received', orderData);
  });

  // Handle order status updates
  socket.on('order_status_update', (data) => {
    io.to(`user_${data.studentId}`).emit('order_update', data);
  });

  // Handle new announcements
  socket.on('new_announcement', (announcement) => {
    if (announcement.targetAudience.includes('all')) {
      io.emit('announcement', announcement);
    } else {
      announcement.targetAudience.forEach(audience => {
        io.to(`${audience}_all`).emit('announcement', announcement);
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('👤 User disconnected:', socket.id);
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use(errorHandler);

// Server startup
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API Base URL: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
    mongoose.connection.close();
  });
});

module.exports = { app, io };