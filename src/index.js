const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables (from .env if present, otherwise default values will apply)
dotenv.config();

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const assetRoutes = require('./routes/assetRoutes');
const timelineRoutes = require('./routes/timelineRoutes');
const inspectionRoutes = require('./routes/inspectionRoutes');
const taskRoutes = require('./routes/taskRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const reportRoutes = require('./routes/reportRoutes');

// Connect to MongoDB
connectDB();

const app = express();

// Determine allowed origins for CORS (supports comma-separated list in CLIENT_URL)
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((url) => url.trim().replace(/\/$/, ''))
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (Postman, cURL, health checks, server-to-server)
    if (!origin) return callback(null, true);

    // In development or if explicitly listed in allowed origins, permit request
    const isAllowed =
      process.env.NODE_ENV !== 'production' ||
      allowedOrigins.includes(origin) ||
      allowedOrigins.includes('*');

    if (isAllowed) {
      return callback(null, true);
    }
    return callback(new Error(`Blocked by CORS: Origin ${origin} not authorized`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Root API Welcome endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'Roads & Buildings Department, Government of Gujarat',
    application: 'Infrastructure Asset Inventory & Citizen Grievance Portal API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      assets: '/api/assets',
      timeline: '/api/timeline',
      inspections: '/api/inspections',
      tasks: '/api/tasks',
      complaints: '/api/complaints',
      reports: '/api/reports'
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'R&B Gujarat Asset Inventory System API',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/reports', reportRoutes);

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🏛️  R&B Gujarat Asset Inventory Backend Server`);
    console.log(`🚀 Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
