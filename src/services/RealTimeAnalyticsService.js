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
  onSnapshot,
  serverTimestamp,
  Timestamp,
  limit
} from 'firebase/firestore';
import { format, subDays, subHours, startOfDay, endOfDay } from 'date-fns';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

class RealTimeAnalyticsService {
  constructor() {
    this.realtimeCollection = collection(db, 'realtime');
    this.customReportsCollection = collection(db, 'customReports');
    this.listeners = new Map();
  }

  // Real-time Monitoring
  subscribeToRealTimeMetrics(callback) {
    const now = new Date();
    const hourAgo = subHours(now, 1);

    const q = query(
      this.realtimeCollection,
      where('timestamp', '>=', Timestamp.fromDate(hourAgo)),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const metrics = [];
      snapshot.forEach((doc) => {
        metrics.push({
          id: doc.id,
          ...doc.data()
        });
      });
      callback(this.processRealTimeMetrics(metrics));
    });

    this.listeners.set('realtime', unsubscribe);
    return unsubscribe;
  }

  unsubscribeFromRealTimeMetrics() {
    const unsubscribe = this.listeners.get('realtime');
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete('realtime');
    }
  }

  // Custom Reports
  async createCustomReport(name, config) {
    try {
      const report = {
        name,
        config,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(this.customReportsCollection, report);
      return docRef.id;
    } catch (error) {
      console.error('Error creating custom report:', error);
      throw error;
    }
  }

  async updateCustomReport(reportId, config) {
    try {
      await updateDoc(doc(this.customReportsCollection, reportId), {
        config,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating custom report:', error);
      throw error;
    }
  }

  async getCustomReports() {
    try {
      const querySnapshot = await getDocs(this.customReportsCollection);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting custom reports:', error);
      throw error;
    }
  }

  async generateCustomReport(reportId) {
    try {
      const reportDoc = await getDoc(doc(this.customReportsCollection, reportId));
      if (!reportDoc.exists()) {
        throw new Error('Report not found');
      }

      const report = reportDoc.data();
      const { config } = report;

      // Generate report based on config
      const data = await this.fetchReportData(config);
      return this.processReportData(data, config);
    } catch (error) {
      console.error('Error generating custom report:', error);
      throw error;
    }
  }

  // Export Functionality
  async exportToExcel(data, filename = 'analytics_export.xlsx') {
    try {
      const wb = XLSX.utils.book_new();
      
      // Convert data to worksheet format
      Object.entries(data).forEach(([sheetName, sheetData]) => {
        const ws = XLSX.utils.json_to_sheet(this.flattenData(sheetData));
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });

      // Generate Excel file
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      
      // Save file
      saveAs(blob, filename);
      return true;
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw error;
    }
  }

  async exportToCsv(data, filename = 'analytics_export.csv') {
    try {
      const flatData = this.flattenData(data);
      const headers = Object.keys(flatData[0]);
      const csvContent = [
        headers.join(','),
        ...flatData.map(row => 
          headers.map(header => 
            this.escapeCsvValue(row[header])
          ).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, filename);
      return true;
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      throw error;
    }
  }

  // Helper Methods
  processRealTimeMetrics(metrics) {
    const processed = {
      summary: {
        activeUsers: 0,
        pageViews: 0,
        events: 0,
        errors: 0
      },
      timeline: [],
      events: {},
      errors: []
    };

    metrics.forEach(metric => {
      // Update summary
      processed.summary.activeUsers += metric.activeUsers || 0;
      processed.summary.pageViews += metric.pageViews || 0;
      processed.summary.events += metric.eventCount || 0;
      processed.summary.errors += metric.errorCount || 0;

      // Add to timeline
      processed.timeline.push({
        timestamp: metric.timestamp.toDate(),
        activeUsers: metric.activeUsers || 0,
        pageViews: metric.pageViews || 0,
        events: metric.eventCount || 0
      });

      // Process events
      if (metric.events) {
        Object.entries(metric.events).forEach(([event, count]) => {
          processed.events[event] = (processed.events[event] || 0) + count;
        });
      }

      // Process errors
      if (metric.errors) {
        processed.errors.push(...metric.errors);
      }
    });

    return processed;
  }

  async fetchReportData(config) {
    const { metrics, timeRange, filters } = config;
    const startDate = subDays(new Date(), timeRange);

    // Build query based on config
    let q = query(
      this.realtimeCollection,
      where('timestamp', '>=', Timestamp.fromDate(startDate))
    );

    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([field, value]) => {
        q = query(q, where(field, '==', value));
      });
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  processReportData(data, config) {
    const { metrics, aggregation } = config;
    const processed = {
      summary: {},
      details: []
    };

    // Process metrics based on configuration
    data.forEach(item => {
      metrics.forEach(metric => {
        if (item[metric]) {
          processed.summary[metric] = (processed.summary[metric] || 0) + item[metric];
        }
      });

      processed.details.push(this.aggregateData(item, aggregation));
    });

    return processed;
  }

  aggregateData(data, aggregation) {
    const aggregated = {};
    
    Object.entries(aggregation).forEach(([field, method]) => {
      switch (method) {
        case 'sum':
          aggregated[field] = data[field] || 0;
          break;
        case 'average':
          aggregated[field] = data[field] ? data[field] / data.count : 0;
          break;
        case 'count':
          aggregated[field] = data[field] ? 1 : 0;
          break;
        default:
          aggregated[field] = data[field];
      }
    });

    return aggregated;
  }

  flattenData(data, prefix = '') {
    const flattened = [];

    if (Array.isArray(data)) {
      return data.map(item => this.flattenData(item, prefix)[0]);
    }

    const flat = {};
    Object.entries(data).forEach(([key, value]) => {
      const newKey = prefix ? `${prefix}_${key}` : key;
      
      if (value && typeof value === 'object' && !(value instanceof Date)) {
        Object.assign(flat, this.flattenData(value, newKey));
      } else {
        flat[newKey] = value instanceof Date ? value.toISOString() : value;
      }
    });

    flattened.push(flat);
    return flattened;
  }

  escapeCsvValue(value) {
    if (value === null || value === undefined) {
      return '';
    }
    
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  }
}

export const realTimeAnalyticsService = new RealTimeAnalyticsService();
