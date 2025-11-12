const express = require('express');
const { verifyToken, authorizeRole } = require('../middleware/auth');
const User = require('../models/User');
const { notificationsLogger } = require('../config/logger');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Save FCM token for driver
router.post('/:id/fcm-token', authorizeRole('driver'), async (req, res) => {
  try {
    const { id } = req.params;
    const { fcmToken } = req.body;

    // Verify driver is updating their own token
    if (id !== req.user.id) {
      notificationsLogger.warn('FCM token update failed - access denied', {
        requestingUserId: req.user.id,
        targetDriverId: id
      });
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!fcmToken) {
      notificationsLogger.warn('FCM token update failed - no token provided', {
        driverId: id
      });
      return res.status(400).json({ message: 'FCM token is required' });
    }

    // Basic FCM token validation (FCM tokens are typically 163 characters)
    if (fcmToken.length < 100) {
      notificationsLogger.warn('FCM token update failed - invalid format', {
        driverId: id,
        tokenLength: fcmToken.length
      });
      return res.status(400).json({ message: 'Invalid FCM token format' });
    }

    const driver = await User.findById(id);
    if (!driver || driver.role !== 'driver') {
      notificationsLogger.warn('FCM token update failed - driver not found', {
        driverId: id
      });
      return res.status(404).json({ message: 'Driver not found' });
    }

    // Check for duplicate token
    const existingDriver = await User.findOne({ 
      fcmToken: fcmToken,
      _id: { $ne: id }
    });

    if (existingDriver) {
      notificationsLogger.warn('FCM token already registered to another driver', {
        driverId: id,
        existingDriverId: existingDriver._id,
        tokenLength: fcmToken.length
      });
      // Remove token from previous driver
      existingDriver.fcmToken = null;
      existingDriver.fcmTokenUpdatedAt = null;
      await existingDriver.save();
    }

    driver.fcmToken = fcmToken;
    driver.fcmTokenUpdatedAt = new Date();
    await driver.save();

    notificationsLogger.info('FCM token registered successfully', {
      driverId: id,
      driverName: driver.name,
      tokenLength: fcmToken.length,
      timestamp: new Date().toISOString()
    });
    res.json({ message: 'FCM token saved successfully' });
  } catch (error) {
    notificationsLogger.error('FCM token registration system error', {
      driverId: req.params.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get online drivers (for admin)
router.get('/online', authorizeRole('admin'), async (req, res) => {
  try {
    const onlineDrivers = global.onlineDrivers || {};
    const driverIds = Object.keys(onlineDrivers);
    
    const drivers = await User.find({
      _id: { $in: driverIds },
      role: 'driver',
      isActive: true
    }).select('name email vehicleInfo currentLocation');

    res.json({ 
      onlineDrivers: drivers.map(driver => ({
        ...driver.toJSON(),
        isOnline: true,
        lastSeen: onlineDrivers[driver._id.toString()]?.lastSeen
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});
// Get driver's active orders
router.get('/:id/orders', authorizeRole('driver'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verify driver is requesting their own orders
    if (id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const Order = require('../models/Order');
    const orders = await Order.find({
      driverId: id,
      status: { $in: ['assigned', 'in-progress'] }
    }).populate('customerId', 'name email phone').sort({ createdAt: -1 });

    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});
module.exports = router;