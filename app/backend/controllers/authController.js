const jwt = require('jsonwebtoken');
const Joi = require('joi');
const User = require('../models/User');
const { authLogger } = require('../config/logger');

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

// Generate JWT tokens
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id,
      role: user.role,
      email: user.email,
      name: user.name
    }, 
    process.env.JWT_SECRET, 
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

const login = async (req, res) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    
    const { error } = loginSchema.validate(req.body);
    if (error) {
      authLogger.warn('Login validation failed', {
        ip: clientIP,
        email: req.body.email,
        error: error.details[0].message
      });
      return res.status(400).json({ message: error.details[0].message });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      authLogger.warn('Login failed - user not found', {
        ip: clientIP,
        email,
        timestamp: new Date().toISOString()
      });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      authLogger.warn('Login failed - invalid password', {
        ip: clientIP,
        email,
        userId: user._id,
        timestamp: new Date().toISOString()
      });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);

    authLogger.info('Login successful', {
      ip: clientIP,
      userId: user._id,
      email: user.email,
      role: user.role,
      timestamp: new Date().toISOString()
    });
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone
      }
    });
  } catch (error) {
    authLogger.error('Login system error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip || req.connection.remoteAddress,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  login
};