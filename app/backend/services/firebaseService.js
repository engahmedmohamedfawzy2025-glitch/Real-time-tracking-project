const admin = require('firebase-admin');
const { notificationsLogger } = require('../config/logger');

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  if (!admin.apps.length) {
    try {
      // Check if Firebase credentials are provided
      if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
        notificationsLogger.warn('Firebase credentials not provided, FCM notifications will be disabled');
        return;
      }

      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
        token_uri: process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token"
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID
      });

      notificationsLogger.info('Firebase Admin SDK initialized successfully');
    } catch (error) {
      notificationsLogger.error('Firebase initialization failed', {
        error: error.message,
        stack: error.stack
      });
    }
  }
};

// Initialize Firebase on module load
initializeFirebase();

/**
 * Send FCM push notification
 * @param {string} fcmToken - FCM device token
 * @param {object} notification - Notification payload
 * @param {string} notification.title - Notification title
 * @param {string} notification.body - Notification body
 * @param {object} notification.data - Additional data payload
 */
const sendFCMNotification = async (fcmToken, notification) => {
  try {
    if (!admin.apps.length) {
      notificationsLogger.warn('Firebase not initialized, skipping FCM notification', {
        title: notification.title,
        notification
      });
      return { success: false, error: 'Firebase not initialized - check credentials' };
    }

    if (!fcmToken) {
      notificationsLogger.warn('No FCM token provided for notification', {
        notification
      });
      return { success: false, error: 'No FCM token provided' };
    }

    const message = {
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: notification.data || {},
      token: fcmToken
    };

    notificationsLogger.info('Sending FCM notification', {
      title: notification.title,
      body: notification.body,
      data: notification.data,
      tokenLength: fcmToken.length,
      timestamp: new Date().toISOString()
    });

    const response = await admin.messaging().send(message);

    notificationsLogger.info('FCM notification sent successfully', {
      messageId: response,
      title: notification.title,
      deliveryStatus: 'success',
      timestamp: new Date().toISOString()
    });
    
    return { success: true, messageId: response };
  } catch (error) {
    notificationsLogger.error('FCM notification send failed', {
      error: error.message,
      stack: error.stack,
      notification,
      tokenLength: fcmToken ? fcmToken.length : 0,
      errorCode: error.code,
      timestamp: new Date().toISOString()
    });
    
    // Check if token is invalid and should be removed
    const shouldRemoveToken = error.code === 'messaging/registration-token-not-registered' ||
                             error.code === 'messaging/invalid-registration-token';
    
    return { 
      success: false, 
      error: error.message,
      shouldRemoveToken
    };
  }
};

module.exports = {
  sendFCMNotification
};