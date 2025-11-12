const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authLogger } = require('../config/logger');

const verifyToken = async (req, res, next) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      authLogger.warn('Token verification failed - no token provided', {
        ip: clientIP,
        path: req.path,
        method: req.method
      });
      return res.status(401).json({ message: 'Access token required' });
    }

    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Token already contains user info, but verify user still exists
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user || !user.isActive) {
      authLogger.warn('Token verification failed - invalid user', {
        ip: clientIP,
        userId: decoded.id,
        path: req.path,
        method: req.method
      });
      return res.status(401).json({ message: 'Invalid token or user not found' });
    }

    // Attach decoded token info to request
    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
      name: decoded.name
    };
    
    authLogger.debug('Token verified successfully', {
      userId: decoded.id,
      role: decoded.role,
      path: req.path,
      method: req.method,
      ip: clientIP
    });
    
    next();
  } catch (error) {
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    
    if (error.name === 'JsonWebTokenError') {
      authLogger.warn('Token verification failed - invalid token', {
        ip: clientIP,
        error: error.message,
        path: req.path
      });
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      authLogger.warn('Token verification failed - expired token', {
        ip: clientIP,
        error: error.message,
        path: req.path
      });
      return res.status(401).json({ message: 'Token expired' });
    }
    
    authLogger.error('Auth middleware system error', {
      error: error.message,
      stack: error.stack,
      ip: clientIP,
      path: req.path
    });
    res.status(500).json({ message: 'Authentication error' });
  }
};

const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      authLogger.warn('Authorization failed - no user in request', {
        path: req.path,
        method: req.method
      });
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      authLogger.warn('Authorization failed - insufficient permissions', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
        path: req.path,
        method: req.method
      });
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.' 
      });
    }

    authLogger.debug('Authorization successful', {
      userId: req.user.id,
      userRole: req.user.role,
      path: req.path,
      method: req.method
    });
    next();
  };
};

module.exports = {
  verifyToken,
  authorizeRole
};