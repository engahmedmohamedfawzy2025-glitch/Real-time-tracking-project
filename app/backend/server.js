const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/database');
const { createLogger, errorLogger } = require('./config/logger');
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const driverRoutes = require('./routes/drivers');
const setupTrackingSocket = require('./sockets/trackingSocket');
const { startTokenCleanupScheduler } = require('./scripts/cleanupExpiredTokens');

// Create main server logger
const serverLogger = createLogger('SERVER');
// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"]
  }
});

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());
app.use(cors());

// Trust proxy configuration for rate limiting
app.set('trust proxy', 1); // Trust first proxy

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.',
  handler: (req, res) => {
    serverLogger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent')
    });
    res.status(429).json({ message: 'Too many requests from this IP, please try again later.' });
  }
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  serverLogger.info('HTTP Request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});
// Health check endpoint
app.get('/health', (req, res) => {
  serverLogger.info('Health check requested', {
    ip: req.ip,
    uptime: process.uptime()
  });
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/drivers', driverRoutes);

// Setup Socket.IO for real-time tracking
const trackingNamespace = setupTrackingSocket(io);

// Make tracking namespace available to routes
app.set('trackingNamespace', trackingNamespace);

// Start token cleanup scheduler
startTokenCleanupScheduler();

// Global error handler
app.use((err, req, res, next) => {
  errorLogger.error('Unhandled application error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  serverLogger.warn('Route not found', {
    path: req.originalUrl,
    method: req.method,
    ip: req.ip
  });
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  serverLogger.info('Server started successfully', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    socketEndpoint: `ws://localhost:${PORT}/track`,
    timestamp: new Date().toISOString()
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  errorLogger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  errorLogger.error('Unhandled Promise Rejection', {
    reason: reason.toString(),
    promise: promise.toString(),
    timestamp: new Date().toISOString()
  });
});
// Graceful shutdown
process.on('SIGTERM', () => {
  serverLogger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    serverLogger.info('Server closed, process terminated');
  });
});