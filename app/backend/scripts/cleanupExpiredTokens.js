const cron = require('node-cron');
const User = require('../models/User');
const { notificationsLogger } = require('../config/logger');

/**
 * Clean up expired FCM tokens
 * Runs daily at 2 AM to remove tokens older than 30 days
 */
const cleanupExpiredTokens = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await User.updateMany(
      {
        fcmTokenUpdatedAt: { $lt: thirtyDaysAgo },
        fcmToken: { $ne: null }
      },
      {
        $unset: {
          fcmToken: 1,
          fcmTokenUpdatedAt: 1
        }
      }
    );

    if (result.modifiedCount > 0) {
      notificationsLogger.info('Cleaned up expired FCM tokens', {
        removedTokens: result.modifiedCount,
        cutoffDate: thirtyDaysAgo.toISOString(),
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    notificationsLogger.error('Token cleanup failed', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Remove invalid tokens based on FCM API responses
 * @param {string} fcmToken - Token to remove
 * @param {string} reason - Reason for removal
 */
const removeInvalidToken = async (fcmToken, reason = 'Invalid token') => {
  try {
    const result = await User.updateMany(
      { fcmToken },
      {
        $unset: {
          fcmToken: 1,
          fcmTokenUpdatedAt: 1
        }
      }
    );

    if (result.modifiedCount > 0) {
      notificationsLogger.info('Removed invalid FCM token', {
        tokenLength: fcmToken.length,
        reason,
        affectedUsers: result.modifiedCount,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    notificationsLogger.error('Failed to remove invalid token', {
      error: error.message,
      tokenLength: fcmToken.length,
      reason
    });
  }
};

// Schedule cleanup to run daily at 2 AM
const startTokenCleanupScheduler = () => {
  cron.schedule('0 2 * * *', cleanupExpiredTokens, {
    scheduled: true,
    timezone: "UTC"
  });

  notificationsLogger.info('Token cleanup scheduler started', {
    schedule: 'Daily at 2 AM UTC',
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  cleanupExpiredTokens,
  removeInvalidToken,
  startTokenCleanupScheduler
};