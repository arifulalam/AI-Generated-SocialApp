import { db } from '../config/firebase';
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { format } from 'date-fns';

class AdvancedNotificationService {
  constructor() {
    this.notificationsCollection = collection(db, 'notifications');
    this.notificationSettingsCollection = collection(db, 'notificationSettings');
    this.notificationTemplatesCollection = collection(db, 'notificationTemplates');
    this.subscribers = new Map();
    this.channels = ['web', 'email', 'push', 'sms'];
    this.priorities = ['low', 'medium', 'high', 'critical'];
  }

  // Notification Creation
  async createNotification(userId, data, options = {}) {
    try {
      const settings = await this.getUserNotificationSettings(userId);
      const template = await this.getNotificationTemplate(data.type);
      
      const notification = {
        userId,
        ...data,
        content: this.formatNotificationContent(template, data.params),
        priority: options.priority || 'medium',
        channels: this.determineNotificationChannels(settings, data.type, options.priority),
        status: 'pending',
        read: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(this.notificationsCollection, notification);
      await this.processNotification(docRef.id, notification);
      return docRef.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Notification Processing
  async processNotification(notificationId, notification) {
    try {
      const channels = notification.channels;
      const results = await Promise.allSettled(
        channels.map(channel => this.sendNotificationToChannel(channel, notification))
      );

      const failedChannels = results
        .map((result, index) => result.status === 'rejected' ? channels[index] : null)
        .filter(Boolean);

      if (failedChannels.length > 0) {
        await this.handleFailedDelivery(notificationId, failedChannels);
      } else {
        await this.markNotificationDelivered(notificationId);
      }

      return results;
    } catch (error) {
      console.error('Error processing notification:', error);
      throw error;
    }
  }

  // Channel-specific Sending
  async sendNotificationToChannel(channel, notification) {
    switch (channel) {
      case 'web':
        return this.sendWebNotification(notification);
      case 'email':
        return this.sendEmailNotification(notification);
      case 'push':
        return this.sendPushNotification(notification);
      case 'sms':
        return this.sendSMSNotification(notification);
      default:
        throw new Error(`Unsupported notification channel: ${channel}`);
    }
  }

  // Notification Templates
  async createNotificationTemplate(type, template) {
    try {
      const docRef = await addDoc(this.notificationTemplatesCollection, {
        type,
        template,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating notification template:', error);
      throw error;
    }
  }

  async getNotificationTemplate(type) {
    try {
      const q = query(
        this.notificationTemplatesCollection,
        where('type', '==', type)
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error(`No template found for type: ${type}`);
      }

      return querySnapshot.docs[0].data().template;
    } catch (error) {
      console.error('Error getting notification template:', error);
      throw error;
    }
  }

  // User Settings
  async updateUserNotificationSettings(userId, settings) {
    try {
      const docRef = doc(this.notificationSettingsCollection, userId);
      await updateDoc(docRef, {
        ...settings,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating notification settings:', error);
      throw error;
    }
  }

  async getUserNotificationSettings(userId) {
    try {
      const docRef = doc(this.notificationSettingsCollection, userId);
      const doc = await getDocs(docRef);
      return doc.exists() ? doc.data() : this.getDefaultNotificationSettings();
    } catch (error) {
      console.error('Error getting notification settings:', error);
      throw error;
    }
  }

  // Subscription Management
  subscribeToNotifications(userId, callback) {
    const q = query(
      this.notificationsCollection,
      where('userId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifications = [];
      snapshot.forEach((doc) => {
        notifications.push({
          id: doc.id,
          ...doc.data()
        });
      });
      callback(notifications);
    });

    this.subscribers.set(userId, unsubscribe);
    return unsubscribe;
  }

  unsubscribeFromNotifications(userId) {
    const unsubscribe = this.subscribers.get(userId);
    if (unsubscribe) {
      unsubscribe();
      this.subscribers.delete(userId);
    }
  }

  // Notification Management
  async markNotificationRead(notificationId) {
    try {
      await updateDoc(doc(this.notificationsCollection, notificationId), {
        read: true,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async deleteNotification(notificationId) {
    try {
      await deleteDoc(doc(this.notificationsCollection, notificationId));
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Helper Methods
  formatNotificationContent(template, params) {
    let content = template;
    Object.entries(params).forEach(([key, value]) => {
      content = content.replace(`{{${key}}}`, value);
    });
    return content;
  }

  determineNotificationChannels(settings, type, priority) {
    const channels = [];

    // Always include web notifications
    channels.push('web');

    // Add email for medium+ priority
    if (priority !== 'low' && settings.emailEnabled) {
      channels.push('email');
    }

    // Add push for high+ priority
    if (priority === 'high' || priority === 'critical') {
      if (settings.pushEnabled) {
        channels.push('push');
      }
    }

    // Add SMS for critical priority
    if (priority === 'critical' && settings.smsEnabled) {
      channels.push('sms');
    }

    return channels;
  }

  getDefaultNotificationSettings() {
    return {
      emailEnabled: true,
      pushEnabled: true,
      smsEnabled: false,
      notificationTypes: {
        system: true,
        activity: true,
        marketing: false
      },
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '07:00'
      }
    };
  }

  async handleFailedDelivery(notificationId, failedChannels) {
    try {
      await updateDoc(doc(this.notificationsCollection, notificationId), {
        status: 'partial',
        failedChannels,
        retryCount: increment(1),
        updatedAt: serverTimestamp()
      });

      // Schedule retry if needed
      if (failedChannels.length > 0) {
        await this.scheduleNotificationRetry(notificationId);
      }
    } catch (error) {
      console.error('Error handling failed delivery:', error);
      throw error;
    }
  }

  async markNotificationDelivered(notificationId) {
    try {
      await updateDoc(doc(this.notificationsCollection, notificationId), {
        status: 'delivered',
        deliveredAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error marking notification as delivered:', error);
      throw error;
    }
  }

  async scheduleNotificationRetry(notificationId) {
    // Implement retry logic with exponential backoff
    console.log('Scheduling retry for notification:', notificationId);
  }

  // Channel-specific implementations
  async sendWebNotification(notification) {
    // Implement web notification
    console.log('Sending web notification:', notification);
  }

  async sendEmailNotification(notification) {
    // Implement email notification
    console.log('Sending email notification:', notification);
  }

  async sendPushNotification(notification) {
    // Implement push notification
    console.log('Sending push notification:', notification);
  }

  async sendSMSNotification(notification) {
    // Implement SMS notification
    console.log('Sending SMS notification:', notification);
  }
}

export const advancedNotificationService = new AdvancedNotificationService();
