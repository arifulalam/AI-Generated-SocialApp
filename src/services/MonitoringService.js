import { db } from '../config/firebase';
import { collection, addDoc, updateDoc, getDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

class MonitoringService {
  constructor() {
    this.metricsRef = collection(db, 'metrics');
    this.alertsRef = collection(db, 'alerts');
    this.logsRef = collection(db, 'logs');
    this.analyticsRef = collection(db, 'analytics');
  }

  // System Monitoring
  async recordMetric(data) {
    try {
      const metric = {
        ...data,
        timestamp: new Date().toISOString()
      };
      
      await addDoc(this.metricsRef, metric);
      await this.checkThresholds(metric);
    } catch (error) {
      console.error('Error recording metric:', error);
      throw error;
    }
  }

  async getMetrics(type, startTime, endTime) {
    try {
      const q = query(
        this.metricsRef,
        where('type', '==', type),
        where('timestamp', '>=', startTime),
        where('timestamp', '<=', endTime),
        orderBy('timestamp')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting metrics:', error);
      throw error;
    }
  }

  // Alert Management
  async createAlert(data) {
    try {
      const alert = {
        ...data,
        status: 'active',
        createdAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(this.alertsRef, alert);
      return docRef.id;
    } catch (error) {
      console.error('Error creating alert:', error);
      throw error;
    }
  }

  async updateAlertStatus(alertId, status) {
    try {
      const alertRef = doc(this.alertsRef, alertId);
      await updateDoc(alertRef, {
        status,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating alert status:', error);
      throw error;
    }
  }

  // Logging System
  async logEvent(data) {
    try {
      const log = {
        ...data,
        timestamp: new Date().toISOString()
      };
      
      await addDoc(this.logsRef, log);
    } catch (error) {
      console.error('Error logging event:', error);
      throw error;
    }
  }

  async getLogs(filters = {}) {
    try {
      let q = this.logsRef;
      
      if (filters.type) {
        q = query(q, where('type', '==', filters.type));
      }
      if (filters.severity) {
        q = query(q, where('severity', '==', filters.severity));
      }
      if (filters.startTime && filters.endTime) {
        q = query(q,
          where('timestamp', '>=', filters.startTime),
          where('timestamp', '<=', filters.endTime)
        );
      }
      
      q = query(q, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting logs:', error);
      throw error;
    }
  }

  // Analytics
  async trackAnalytics(data) {
    try {
      const analytics = {
        ...data,
        timestamp: new Date().toISOString()
      };
      
      await addDoc(this.analyticsRef, analytics);
    } catch (error) {
      console.error('Error tracking analytics:', error);
      throw error;
    }
  }

  async getAnalytics(metric, startTime, endTime, interval = 'day') {
    try {
      const q = query(
        this.analyticsRef,
        where('metric', '==', metric),
        where('timestamp', '>=', startTime),
        where('timestamp', '<=', endTime),
        orderBy('timestamp')
      );
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      return this.aggregateAnalytics(data, interval);
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw error;
    }
  }

  // User Monitoring
  async monitorUserActivity(userId, data) {
    try {
      const activity = {
        userId,
        ...data,
        timestamp: new Date().toISOString()
      };
      
      await this.trackAnalytics({
        metric: 'user_activity',
        ...activity
      });
    } catch (error) {
      console.error('Error monitoring user activity:', error);
      throw error;
    }
  }

  async getUserMetrics(userId, startTime, endTime) {
    try {
      const q = query(
        this.analyticsRef,
        where('metric', '==', 'user_activity'),
        where('userId', '==', userId),
        where('timestamp', '>=', startTime),
        where('timestamp', '<=', endTime),
        orderBy('timestamp')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting user metrics:', error);
      throw error;
    }
  }

  // Page and Group Monitoring
  async monitorPageActivity(pageId, data) {
    try {
      const activity = {
        pageId,
        ...data,
        timestamp: new Date().toISOString()
      };
      
      await this.trackAnalytics({
        metric: 'page_activity',
        ...activity
      });
    } catch (error) {
      console.error('Error monitoring page activity:', error);
      throw error;
    }
  }

  async getPageMetrics(pageId, startTime, endTime) {
    try {
      const q = query(
        this.analyticsRef,
        where('metric', '==', 'page_activity'),
        where('pageId', '==', pageId),
        where('timestamp', '>=', startTime),
        where('timestamp', '<=', endTime),
        orderBy('timestamp')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting page metrics:', error);
      throw error;
    }
  }

  // Helper Methods
  async checkThresholds(metric) {
    try {
      if (metric.value > metric.threshold) {
        await this.createAlert({
          type: 'threshold_exceeded',
          metric: metric.type,
          value: metric.value,
          threshold: metric.threshold,
          severity: 'high'
        });
      }
    } catch (error) {
      console.error('Error checking thresholds:', error);
      throw error;
    }
  }

  aggregateAnalytics(data, interval) {
    const aggregated = {};
    
    data.forEach(item => {
      const date = new Date(item.timestamp);
      let key;
      
      switch (interval) {
        case 'hour':
          key = date.toISOString().slice(0, 13);
          break;
        case 'day':
          key = date.toISOString().slice(0, 10);
          break;
        case 'week':
          const week = Math.floor(date.getDate() / 7);
          key = `${date.getFullYear()}-${date.getMonth()}-W${week}`;
          break;
        case 'month':
          key = date.toISOString().slice(0, 7);
          break;
        default:
          key = date.toISOString().slice(0, 10);
      }
      
      if (!aggregated[key]) {
        aggregated[key] = {
          timestamp: key,
          count: 0,
          values: []
        };
      }
      
      aggregated[key].count++;
      aggregated[key].values.push(item.value);
    });
    
    return Object.values(aggregated).map(item => ({
      timestamp: item.timestamp,
      count: item.count,
      average: item.values.reduce((a, b) => a + b, 0) / item.values.length,
      min: Math.min(...item.values),
      max: Math.max(...item.values)
    }));
  }
}

export const monitoringService = new MonitoringService();
