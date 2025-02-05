import { db } from '../config/firebase';
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  increment,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';

class AnalyticsService {
  constructor() {
    this.analyticsCollection = collection(db, 'analytics');
    this.trendingCollection = collection(db, 'trending');
    this.userMetricsCollection = collection(db, 'userMetrics');
    this.contentMetricsCollection = collection(db, 'contentMetrics');
    this.engagementMetricsCollection = collection(db, 'engagementMetrics');
  }

  // User Analytics
  async trackUserActivity(userId, eventType, data) {
    try {
      const event = {
        userId,
        eventType,
        ...data,
        timestamp: serverTimestamp()
      };

      await addDoc(this.analyticsCollection, event);
      await this.updateUserMetrics(userId, eventType);
      return true;
    } catch (error) {
      console.error('Error tracking user activity:', error);
      throw error;
    }
  }

  async getUserMetrics(userId, days = 30) {
    try {
      const startDate = startOfDay(subDays(new Date(), days));
      const metrics = await this.getMetricsByDateRange(
        this.userMetricsCollection,
        userId,
        startDate
      );
      return this.processMetrics(metrics, days);
    } catch (error) {
      console.error('Error getting user metrics:', error);
      throw error;
    }
  }

  // Content Analytics
  async trackContentEngagement(contentId, contentType, eventType, userId) {
    try {
      const event = {
        contentId,
        contentType,
        eventType,
        userId,
        timestamp: serverTimestamp()
      };

      await addDoc(this.analyticsCollection, event);
      await this.updateContentMetrics(contentId, eventType);
      return true;
    } catch (error) {
      console.error('Error tracking content engagement:', error);
      throw error;
    }
  }

  async getContentMetrics(contentId, days = 30) {
    try {
      const startDate = startOfDay(subDays(new Date(), days));
      const metrics = await this.getMetricsByDateRange(
        this.contentMetricsCollection,
        contentId,
        startDate
      );
      return this.processMetrics(metrics, days);
    } catch (error) {
      console.error('Error getting content metrics:', error);
      throw error;
    }
  }

  // Engagement Analytics
  async trackEngagement(type, data) {
    try {
      const event = {
        type,
        ...data,
        timestamp: serverTimestamp()
      };

      await addDoc(this.engagementMetricsCollection, event);
      await this.updateEngagementMetrics(type, data);
      return true;
    } catch (error) {
      console.error('Error tracking engagement:', error);
      throw error;
    }
  }

  async getEngagementMetrics(days = 30) {
    try {
      const startDate = startOfDay(subDays(new Date(), days));
      const metrics = await this.getMetricsByDateRange(
        this.engagementMetricsCollection,
        'all',
        startDate
      );
      return this.processMetrics(metrics, days);
    } catch (error) {
      console.error('Error getting engagement metrics:', error);
      throw error;
    }
  }

  // Trending Content
  async updateTrendingContent() {
    try {
      const now = new Date();
      const hourAgo = subDays(now, 1/24);

      // Get recent content
      const recentContentQuery = query(
        collection(db, 'posts'),
        where('createdAt', '>=', hourAgo),
        orderBy('createdAt', 'desc')
      );
      const recentContent = await getDocs(recentContentQuery);

      // Calculate trending scores
      const scores = await Promise.all(
        recentContent.docs.map(async (doc) => {
          const data = doc.data();
          const metrics = await this.getContentMetrics(doc.id, 1);
          const score = this.calculateTrendingScore(data, metrics);
          return { id: doc.id, score };
        })
      );

      // Update trending collection
      await updateDoc(doc(this.trendingCollection, 'current'), {
        posts: scores
          .sort((a, b) => b.score - a.score)
          .slice(0, 20)
          .map(({ id }) => id),
        updatedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error updating trending content:', error);
      throw error;
    }
  }

  // Helper Methods
  async updateUserMetrics(userId, eventType) {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const metricRef = doc(this.userMetricsCollection, `${userId}_${today}`);
      const metricDoc = await getDoc(metricRef);

      if (metricDoc.exists()) {
        await updateDoc(metricRef, {
          [`events.${eventType}`]: increment(1),
          totalEvents: increment(1),
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(this.userMetricsCollection, {
          userId,
          date: today,
          events: { [eventType]: 1 },
          totalEvents: 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating user metrics:', error);
      throw error;
    }
  }

  async updateContentMetrics(contentId, eventType) {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const metricRef = doc(this.contentMetricsCollection, `${contentId}_${today}`);
      const metricDoc = await getDoc(metricRef);

      if (metricDoc.exists()) {
        await updateDoc(metricRef, {
          [`events.${eventType}`]: increment(1),
          totalEvents: increment(1),
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(this.contentMetricsCollection, {
          contentId,
          date: today,
          events: { [eventType]: 1 },
          totalEvents: 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating content metrics:', error);
      throw error;
    }
  }

  async updateEngagementMetrics(type, data) {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const metricRef = doc(this.engagementMetricsCollection, `${type}_${today}`);
      const metricDoc = await getDoc(metricRef);

      if (metricDoc.exists()) {
        await updateDoc(metricRef, {
          count: increment(1),
          ...this.processEngagementData(type, data),
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(this.engagementMetricsCollection, {
          type,
          date: today,
          count: 1,
          ...this.processEngagementData(type, data),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating engagement metrics:', error);
      throw error;
    }
  }

  async getMetricsByDateRange(collection, id, startDate) {
    const q = query(
      collection,
      where('date', '>=', format(startDate, 'yyyy-MM-dd')),
      orderBy('date', 'asc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  processMetrics(metrics, days) {
    const processed = {
      daily: {},
      total: {
        events: {},
        totalEvents: 0
      },
      trends: {
        events: {},
        totalEvents: 0
      }
    };

    // Initialize daily data
    for (let i = 0; i < days; i++) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      processed.daily[date] = {
        events: {},
        totalEvents: 0
      };
    }

    // Process metrics
    metrics.forEach(metric => {
      const { date, events, totalEvents } = metric;
      
      // Update daily data
      if (processed.daily[date]) {
        processed.daily[date].events = events;
        processed.daily[date].totalEvents = totalEvents;
      }

      // Update total
      Object.entries(events).forEach(([event, count]) => {
        processed.total.events[event] = (processed.total.events[event] || 0) + count;
      });
      processed.total.totalEvents += totalEvents;
    });

    // Calculate trends
    const previousPeriod = metrics.slice(0, Math.floor(days/2));
    const currentPeriod = metrics.slice(Math.floor(days/2));

    const previousTotal = this.sumMetrics(previousPeriod);
    const currentTotal = this.sumMetrics(currentPeriod);

    processed.trends = {
      events: {},
      totalEvents: this.calculateTrend(currentTotal.totalEvents, previousTotal.totalEvents)
    };

    // Calculate event-specific trends
    Object.keys(currentTotal.events).forEach(event => {
      processed.trends.events[event] = this.calculateTrend(
        currentTotal.events[event],
        previousTotal.events[event]
      );
    });

    return processed;
  }

  sumMetrics(metrics) {
    return metrics.reduce((sum, metric) => {
      const events = { ...sum.events };
      Object.entries(metric.events).forEach(([event, count]) => {
        events[event] = (events[event] || 0) + count;
      });
      return {
        events,
        totalEvents: sum.totalEvents + metric.totalEvents
      };
    }, { events: {}, totalEvents: 0 });
  }

  calculateTrend(current, previous) {
    if (!previous) return 100;
    return ((current - previous) / previous) * 100;
  }

  calculateTrendingScore(content, metrics) {
    const weights = {
      view: 1,
      like: 2,
      comment: 3,
      share: 4
    };

    let score = 0;

    // Calculate weighted sum of events
    Object.entries(metrics.total.events).forEach(([event, count]) => {
      score += (weights[event] || 1) * count;
    });

    // Apply time decay
    const ageInHours = (new Date() - new Date(content.createdAt)) / (1000 * 60 * 60);
    score *= Math.exp(-ageInHours / 24); // 24-hour half-life

    // Boost score based on recent engagement
    const recentEvents = metrics.daily[format(new Date(), 'yyyy-MM-dd')].totalEvents;
    score *= (1 + recentEvents / 100);

    return score;
  }

  processEngagementData(type, data) {
    switch (type) {
      case 'session':
        return {
          totalDuration: increment(data.duration || 0),
          averageDuration: data.duration || 0
        };
      case 'conversion':
        return {
          totalValue: increment(data.value || 0),
          averageValue: data.value || 0
        };
      default:
        return {};
    }
  }
}

export const analyticsService = new AnalyticsService();
