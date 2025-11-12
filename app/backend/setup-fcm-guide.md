# 🔥 Firebase Cloud Messaging (FCM) Setup Guide

## Step-by-Step Configuration

### 1. Firebase Console Setup
1. Visit [Firebase Console](https://console.firebase.google.com/)
2. Create new project or select existing one
3. Go to **Project Settings** → **Cloud Messaging** tab
4. Note your **Server Key** (legacy) and **Sender ID**

### 2. Generate Service Account
1. In Firebase Console: **Project Settings** → **Service Accounts**
2. Click **"Generate new private key"**
3. Download the JSON file (e.g., `firebase-service-account.json`)

### 3. Extract Credentials from JSON
Your downloaded JSON file looks like this:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

### 4. Create Your .env File
Copy `.env.example` to `.env` and fill in the values:

```bash
# Copy the example file
cp .env.example .env
```

Then edit `.env` with your Firebase credentials:
```env
# Server Configuration
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/delivery_tracking
JWT_SECRET=your_super_secure_jwt_secret_key

# Firebase Configuration (from your service account JSON)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=abc123def456...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=123456789
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
```

### 5. Test FCM Connection
Start your server and check the logs:
```bash
npm run dev
```

Look for this log message:
```
[timestamp] [INFO] [FCM] Firebase Admin SDK initialized successfully
```

### 6. Frontend Integration (React Native)
In your React Native driver app, install Firebase:
```bash
npm install @react-native-firebase/app @react-native-firebase/messaging
```

Get FCM token in your app:
```javascript
import messaging from '@react-native-firebase/messaging';

// Get FCM token
const getFCMToken = async () => {
  const token = await messaging().getToken();
  console.log('FCM Token:', token);
  
  // Send token to your backend
  await fetch(`${API_URL}/api/drivers/${driverId}/fcm-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`
    },
    body: JSON.stringify({ fcmToken: token })
  });
};
```

### 7. Test Push Notifications
Once a driver's FCM token is registered, test by assigning an order:

```bash
# Login as admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@delivery.com","password":"admin123"}'

# Assign order to driver (this triggers FCM notification)
curl -X PATCH http://localhost:3000/api/orders/ORDER_ID/assign-driver \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"driverId":"DRIVER_ID"}'
```

### 8. Troubleshooting

**Common Issues:**

1. **"Firebase not initialized"**
   - Check your `.env` file has all required Firebase variables
   - Ensure private key format is correct (with `\n` for newlines)

2. **"Invalid credentials"**
   - Verify service account JSON is from correct Firebase project
   - Check project_id matches your Firebase project

3. **"Token registration failed"**
   - Ensure FCM is enabled in Firebase Console
   - Check network connectivity from your app

4. **"Notification not received"**
   - Verify FCM token is correctly stored in database
   - Check Firebase Console → Cloud Messaging for delivery reports
   - Ensure app has notification permissions

### 9. Security Notes
- Never commit your `.env` file to version control
- Keep your service account JSON file secure
- Use different Firebase projects for development/production
- Regularly rotate your service account keys

### 10. Monitoring
Check your logs for FCM operations:
```bash
tail -f logs/fcm-*.log
```

You should see logs like:
```
[2024-01-01 12:00:00] [INFO] [FCM] FCM token registered successfully {"driverId":"...","tokenLength":163}
[2024-01-01 12:01:00] [INFO] [FCM] FCM notification sent successfully {"messageId":"...","title":"New Delivery Assigned"}
```