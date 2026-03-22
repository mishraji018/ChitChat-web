import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Firebase Admin with credentials from environment
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized 🚀');
  } catch (err) {
    console.error('Firebase initialization error:', err);
  }
} else {
  console.warn('FIREBASE_SERVICE_ACCOUNT not found in .env. Push notifications disabled.');
}

/**
 * Send push notification to a specific user
 * @param {string} fcmToken - Target device FCM token
 * @param {object} payload - Notification data (title, body, icon, data)
 */
export const sendPushNotification = async (fcmToken, { title, body, icon, data }) => {
  if (!fcmToken || !admin.apps.length) return;

  const message = {
    token: fcmToken,
    notification: {
      title,
      body,
      imageUrl: icon
    },
    data: {
      ...data,
      click_action: 'FLUTTER_NOTIFICATION_CLICK' // For mobile compatibility
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'messenger_messages',
        sound: 'default'
      }
    },
    apns: {
      payload: {
        aps: {
          contentAvailable: true,
          sound: 'default'
        }
      }
    }
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Successfully sent push notification:', response);
    return response;
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};
