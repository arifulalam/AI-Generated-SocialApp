import { db } from '../config/firebase';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  orderBy,
  limit,
  startAfter,
  doc,
  deleteDoc
} from 'firebase/firestore';

export class NotificationService {
  static async createNotification(userId, data) {
    try {
      const notification = {
        userId,
        ...data,
        isRead: false,
        createdAt: new Date(),
      };

      await addDoc(collection(db, 'notifications'), notification);
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  static async getNotifications(userId, lastVisible = null, pageSize = 20) {
    try {
      const notificationsRef = collection(db, 'notifications');
      let q = query(
        notificationsRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );

      if (lastVisible) {
        q = query(q, startAfter(lastVisible));
      }

      const snapshot = await getDocs(q);
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return {
        notifications,
        lastVisible: snapshot.docs[snapshot.docs.length - 1]
      };
    } catch (error) {
      console.error('Error getting notifications:', error);
      throw error;
    }
  }

  static async markAsRead(notificationId) {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        isRead: true,
        readAt: new Date()
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  static async markAllAsRead(userId) {
    try {
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('userId', '==', userId),
        where('isRead', '==', false)
      );
      const snapshot = await getDocs(q);

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          isRead: true,
          readAt: new Date()
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  static async deleteNotification(notificationId) {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  static async clearAllNotifications(userId) {
    try {
      const notificationsRef = collection(db, 'notifications');
      const q = query(notificationsRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
    } catch (error) {
      console.error('Error clearing notifications:', error);
      throw error;
    }
  }

  // Notification templates
  static async notifyOrderStatus(userId, orderId, status) {
    const templates = {
      pending: {
        title: 'Order Received',
        message: `Your order #${orderId} has been received and is pending confirmation.`,
        type: 'order_status'
      },
      processing: {
        title: 'Order Processing',
        message: `Your order #${orderId} is now being processed.`,
        type: 'order_status'
      },
      shipped: {
        title: 'Order Shipped',
        message: `Your order #${orderId} has been shipped! Track your delivery status.`,
        type: 'order_status'
      },
      delivered: {
        title: 'Order Delivered',
        message: `Your order #${orderId} has been delivered. Enjoy your purchase!`,
        type: 'order_status'
      },
      cancelled: {
        title: 'Order Cancelled',
        message: `Your order #${orderId} has been cancelled.`,
        type: 'order_status'
      }
    };

    const template = templates[status];
    if (template) {
      await this.createNotification(userId, template);
    }
  }

  static async notifyLowStock(userId, productId, productName, quantity) {
    await this.createNotification(userId, {
      title: 'Low Stock Alert',
      message: `${productName} (ID: ${productId}) is running low on stock. Current quantity: ${quantity}`,
      type: 'low_stock'
    });
  }

  static async notifyNewReview(userId, productId, productName, rating) {
    await this.createNotification(userId, {
      title: 'New Product Review',
      message: `Your product ${productName} received a ${rating}-star review!`,
      type: 'new_review'
    });
  }

  static async notifyPaymentReceived(userId, orderId, amount) {
    await this.createNotification(userId, {
      title: 'Payment Received',
      message: `Payment of $${amount} received for order #${orderId}.`,
      type: 'payment'
    });
  }

  static async notifyRefundProcessed(userId, orderId, amount) {
    await this.createNotification(userId, {
      title: 'Refund Processed',
      message: `Refund of $${amount} processed for order #${orderId}.`,
      type: 'refund'
    });
  }

  static async notifyPromotionalOffer(userId, title, message) {
    await this.createNotification(userId, {
      title,
      message,
      type: 'promotional'
    });
  }
}
