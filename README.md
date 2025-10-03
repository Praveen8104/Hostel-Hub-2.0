# 🏠 Hostel Hub - Complete Student Management System

A comprehensive React Native + Express.js application for hostel management with authentication, dining, maintenance, announcements, and canteen systems.

## 🚀 Features

### ✅ **Authentication System**
- Multi-role login (Student, Staff, Warden, Admin)
- Secure JWT-based authentication
- Password hashing with bcrypt
- Profile management

### ✅ **Dining Management** 
- Daily/weekly mess menus
- Meal ratings and feedback
- Statistical analytics
- Queue status tracking

### ✅ **Maintenance & Outpass**
- Maintenance request creation
- File upload support
- Status tracking system
- Outpass request management
- Approval workflows

### ✅ **Announcements System**
- Categorized announcements
- Read receipt tracking
- File attachments
- Real-time notifications

### ✅ **Canteen Food Booking**
- Menu browsing with categories
- Shopping cart functionality
- Order placement and tracking
- Order history

## 🛠️ Tech Stack

### **Frontend (React Native)**
- Expo SDK
- React Navigation 6.x
- AsyncStorage
- Expo Vector Icons
- Image picker & file system

### **Backend (Express.js)**
- MongoDB with Mongoose
- JWT Authentication
- Multer for file uploads
- Socket.IO for real-time features
- Express Rate Limiting
- Helmet for security

## 📋 Prerequisites

- Node.js 16+ 
- MongoDB 4.4+
- Expo CLI
- Android Studio/Xcode (for native testing)

## 🚀 Quick Start

### 1. Clone Repository
\`\`\`bash
git clone https://github.com/yourusername/hostel-hub.git
cd hostel-hub
\`\`\`

### 2. Backend Setup
\`\`\`bash
# Install backend dependencies
cd backend
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secrets

# Start MongoDB service
mongod

# Seed database with demo data
npm run seed

# Start backend server
npm run dev
\`\`\`

### 3. Frontend Setup
\`\`\`bash
# Install frontend dependencies (from root directory)
npm install

# Start Expo development server
npx expo start

# Options:
# - Press 'w' to open in web browser
# - Scan QR code with Expo Go app (mobile)
# - Press 'a' for Android emulator
# - Press 'i' for iOS simulator
\`\`\`

## 🔐 Demo Credentials

After running \`npm run seed\` in the backend:

| Role | Username | Password |
|------|----------|----------|
| Admin | ADMIN001 | password123 |
| Warden | WARD001 | password123 |
| Canteen Owner | CANT001 | password123 |
| Student 1 | 2024CSE001 | password123 |
| Student 2 | 2024CSE002 | password123 |
| Student 3 | 2024ECE001 | password123 |

## 📁 Project Structure

\`\`\`
hostel-hub/
├── backend/                 # Express.js API
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API routes
│   ├── middleware/         # Authentication & validation
│   ├── scripts/            # Database seeding
│   └── uploads/            # File storage
├── src/                    # React Native app
│   ├── components/         # Reusable components
│   ├── screens/            # App screens
│   ├── navigation/         # Navigation setup
│   ├── context/           # React Context (Auth)
│   ├── services/          # API service layer
│   └── utils/             # Utility functions
├── assets/                # Images & icons
└── docs/                  # Documentation
\`\`\`

## 🔧 Environment Configuration

### Backend (.env)
\`\`\`bash
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/hostel-hub
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
CLIENT_URL=http://localhost:3000
\`\`\`

### Frontend
- Update API base URL in \`src/services/api.js\`
- Configure Expo app.json for deployment

## 📱 Testing

### Backend API Testing
\`\`\`bash
cd backend
npm test
\`\`\`

### Frontend Testing
\`\`\`bash
# Run on different platforms
expo start --web          # Web browser
expo start --android      # Android emulator
expo start --ios         # iOS simulator
\`\`\`

## 🚀 Deployment

### Backend Deployment (Railway/Render)

1. **Create account** on Railway or Render
2. **Connect GitHub** repository
3. **Set environment variables** in dashboard
4. **Deploy** with automatic builds

### Frontend Deployment 

#### Web (Vercel/Netlify)
\`\`\`bash
# Build web version
expo export --platform web

# Deploy build folder to Vercel/Netlify
\`\`\`

#### Mobile App Stores
\`\`\`bash
# Build for production
expo build:android  # Android APK
expo build:ios      # iOS IPA

# Submit to app stores
expo submit:android
expo submit:ios
\`\`\`

## 📊 API Endpoints

### Authentication
- \`POST /api/auth/register\` - User registration
- \`POST /api/auth/login\` - User login
- \`POST /api/auth/refresh\` - Refresh token
- \`GET /api/auth/profile\` - Get user profile

### Dining
- \`GET /api/dining/menu/:date\` - Get menu for date
- \`POST /api/dining/ratings\` - Submit meal rating
- \`GET /api/dining/stats\` - Get dining statistics

### Maintenance
- \`POST /api/maintenance/requests\` - Create request
- \`GET /api/maintenance/requests\` - Get user requests
- \`PUT /api/maintenance/requests/:id\` - Update request

### Announcements
- \`GET /api/announcements\` - Get announcements
- \`POST /api/announcements\` - Create announcement (Staff+)
- \`POST /api/announcements/:id/read\` - Mark as read

### Canteen
- \`GET /api/canteen/menu\` - Get menu items
- \`POST /api/cart/add\` - Add item to cart
- \`POST /api/orders\` - Place order

## 🔒 Security Features

- JWT token authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Helmet security headers
- Input validation & sanitization
- File upload restrictions
- Role-based access control

## 🎨 UI/UX Features

- Material Design principles
- Dark/Light mode support
- Loading states & error boundaries
- Offline support with caching
- Pull-to-refresh functionality
- Image optimization & lazy loading

## 🔧 Performance Optimizations

- Image caching & compression
- API request batching
- Virtual scrolling for large lists
- Lazy loading of screens
- Memory cleanup utilities
- Debounced search inputs

## 📚 Documentation

- [API Documentation](./docs/api.md)
- [Database Schema](./docs/database.md)
- [Deployment Guide](./docs/deployment.md)
- [Contributing Guidelines](./CONTRIBUTING.md)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit changes (\`git commit -m 'Add amazing feature'\`)
4. Push to branch (\`git push origin feature/amazing-feature\`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

## 👥 Team

- **Frontend Developer** - React Native & UI/UX
- **Backend Developer** - Express.js & Database
- **DevOps Engineer** - Deployment & CI/CD

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Email: support@hostelhub.com
- Documentation: [Wiki](https://github.com/yourusername/hostel-hub/wiki)

## 🎯 Roadmap

- [ ] Push notifications
- [ ] Payment gateway integration
- [ ] Advanced analytics dashboard
- [ ] Mobile app optimization
- [ ] Multi-language support
- [ ] Biometric authentication

---

Made with ❤️ for hostel management

\`\`\`bash
# Quick setup command
git clone <repo> && cd hostel-hub && cd backend && npm i && npm run seed && npm run dev & cd .. && npm i && npx expo start
\`\`\`