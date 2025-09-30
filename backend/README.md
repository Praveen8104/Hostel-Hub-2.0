# Hostel Hub Backend API

A comprehensive Express.js backend API for hostel management system supporting students, wardens, canteen owners, and administrators.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **User Management**: Students, wardens, canteen owners, and admins
- **Real-time Features**: Socket.IO for live updates and notifications
- **Secure**: bcrypt password hashing, helmet security headers, rate limiting
- **Scalable**: MongoDB with Mongoose ODM, Redis caching support

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- Redis (optional, for caching)

## 🛠️ Installation & Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Environment Setup
Copy `.env` file and update the variables:
```bash
cp .env.example .env
```

Update the following variables in `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/hostel-hub
JWT_SECRET=your_super_secret_jwt_key_here
JWT_REFRESH_SECRET=your_refresh_token_secret_here
```

### 3. Database Setup
Start MongoDB service and run the seeder:
```bash
# Start MongoDB (if using local installation)
mongod

# Seed the database with sample data
npm run seed
```

### 4. Start the Server
```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration  
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/change-password` - Change password

### Students
- `GET /api/students/dashboard` - Student dashboard data

### Dining
- `GET /api/dining/menu/:date` - Get mess menu for date

### Outpass
- `GET /api/outpass/requests` - Get outpass requests

### Maintenance  
- `GET /api/maintenance/requests` - Get maintenance requests

### Announcements
- `GET /api/announcements` - Get announcements

### Canteen
- `GET /api/canteen/menu` - Get canteen menu

### Admin
- `GET /api/admin/dashboard` - Admin dashboard (requires staff role)

## 🔐 Default Login Credentials

After running the seeder script, use these credentials:

**Admin:**
- Username: `ADM001`
- Password: `admin123456`

**Warden:**
- Username: `EMP001` 
- Password: `warden123456`

**Canteen Owner:**
- Username: `CANT001`
- Password: `canteen123456`

**Students:**
- Username: `2022CSE001` (or any seeded roll number)
- Password: `student123456`

## 🏗️ Project Structure

```
backend/
├── models/           # Database models
│   ├── User.js
│   ├── StudentProfile.js
│   └── StaffProfile.js
├── routes/           # API routes
│   ├── auth.js
│   ├── students.js
│   ├── dining.js
│   ├── outpass.js
│   ├── maintenance.js
│   ├── announcements.js
│   ├── canteen.js
│   └── admin.js
├── middleware/       # Custom middleware
│   ├── auth.js
│   └── errorHandler.js
├── scripts/          # Utility scripts
│   └── seedDatabase.js
├── uploads/          # File uploads (created automatically)
├── server.js         # Main server file
├── package.json
└── .env              # Environment variables
```

## 🔧 API Usage Examples

### Login Request
```javascript
POST /api/auth/login
Content-Type: application/json

{
  "identifier": "2022CSE001",
  "password": "student123456",
  "deviceToken": "ExponentPushToken[xxx]",
  "platform": "android"
}
```

### Response
```javascript
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "user_id",
    "identifier": "2022CSE001", 
    "email": "rahul.kumar@student.edu",
    "role": "student",
    "profile": {
      "name": "Rahul Kumar",
      "rollNumber": "2022CSE001",
      "course": "Computer Science Engineering",
      "year": 3,
      "roomNumber": "204",
      "hostelBlock": "A"
    }
  },
  "tokens": {
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token"
  }
}
```

### Authenticated Request
```javascript
GET /api/students/dashboard
Authorization: Bearer jwt_access_token
```

## 🔒 Security Features

- **Password Hashing**: bcrypt with 12 rounds
- **JWT Authentication**: Access & refresh token system
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: express-validator for request validation
- **Security Headers**: Helmet.js for HTTP security headers
- **CORS**: Configurable cross-origin resource sharing

## 📊 Role-Based Access Control

- **Student**: Access to personal data, menu, requests, orders
- **Warden**: Outpass approvals, maintenance oversight, announcements
- **Canteen Owner**: Order management, menu management, analytics  
- **Admin**: Full system access, user management, system analytics

## 🔄 Real-time Features

The server supports real-time communication using Socket.IO:

- **Order Updates**: Live order status updates
- **Announcements**: Real-time announcement broadcasting
- **Notifications**: Push notifications to mobile devices

## 🧪 Testing

```bash
# Run tests (when test suite is added)
npm test

# API Health Check
curl http://localhost:5000/health
```

## 📝 Development Notes

- All API responses follow consistent JSON format
- Error handling with descriptive error codes
- Comprehensive logging with Morgan
- File upload support with Multer
- Database indexes for performance optimization

## 🚀 Deployment

For production deployment:

1. Set `NODE_ENV=production` in environment
2. Use process manager like PM2
3. Set up reverse proxy with Nginx
4. Configure MongoDB Atlas for cloud database
5. Set up Redis for session management and caching

## 📞 Support

For issues and questions:
- Create an issue in the repository
- Check the API documentation
- Review the error logs in the console