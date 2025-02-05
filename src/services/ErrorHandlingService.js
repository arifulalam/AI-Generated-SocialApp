import { db } from '../config/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  getDocs,
  limit
} from 'firebase/firestore';

class ErrorHandlingService {
  constructor() {
    this.errorsCollection = collection(db, 'errors');
    this.errorSubscribers = new Set();
  }

  // Error Logging
  async logError(error, context = {}) {
    try {
      const errorLog = {
        message: error.message,
        stack: error.stack,
        code: error.code,
        context,
        timestamp: serverTimestamp(),
        status: 'new'
      };

      const docRef = await addDoc(this.errorsCollection, errorLog);
      this.notifySubscribers({
        id: docRef.id,
        ...errorLog
      });

      return docRef.id;
    } catch (err) {
      console.error('Failed to log error:', err);
      // Fallback to console if Firebase logging fails
      console.error('Original error:', error);
    }
  }

  // Error Monitoring
  async getRecentErrors(limit = 50) {
    try {
      const q = query(
        this.errorsCollection,
        orderBy('timestamp', 'desc'),
        limit(limit)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Failed to get recent errors:', error);
      throw error;
    }
  }

  // Error Subscription
  subscribe(callback) {
    this.errorSubscribers.add(callback);
    return () => this.errorSubscribers.delete(callback);
  }

  notifySubscribers(error) {
    this.errorSubscribers.forEach(callback => {
      try {
        callback(error);
      } catch (err) {
        console.error('Error in error subscriber:', err);
      }
    });
  }

  // Error Recovery
  async retryFailedOperation(operationId, context = {}) {
    try {
      // Get the failed operation details
      const q = query(
        this.errorsCollection,
        where('context.operationId', '==', operationId)
      );
      
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        throw new Error('Failed operation not found');
      }

      const errorDoc = querySnapshot.docs[0];
      const errorData = errorDoc.data();

      // Attempt recovery based on operation type
      switch (errorData.context.operationType) {
        case 'analytics':
          return await this.retryAnalyticsOperation(errorData, context);
        case 'database':
          return await this.retryDatabaseOperation(errorData, context);
        case 'network':
          return await this.retryNetworkOperation(errorData, context);
        default:
          throw new Error('Unknown operation type');
      }
    } catch (error) {
      console.error('Failed to retry operation:', error);
      throw error;
    }
  }

  // Error Analysis
  async analyzeErrors(timeRange = 24) {
    try {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - timeRange);

      const q = query(
        this.errorsCollection,
        where('timestamp', '>=', startTime),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const errors = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return this.generateErrorAnalysis(errors);
    } catch (error) {
      console.error('Failed to analyze errors:', error);
      throw error;
    }
  }

  // Helper Methods
  generateErrorAnalysis(errors) {
    const analysis = {
      total: errors.length,
      byType: {},
      byComponent: {},
      timeline: [],
      mostFrequent: [],
      criticalErrors: []
    };

    errors.forEach(error => {
      // Analyze by error type
      const type = error.code || 'unknown';
      analysis.byType[type] = (analysis.byType[type] || 0) + 1;

      // Analyze by component
      const component = error.context.component || 'unknown';
      analysis.byComponent[component] = (analysis.byComponent[component] || 0) + 1;

      // Add to timeline
      analysis.timeline.push({
        timestamp: error.timestamp,
        type,
        message: error.message
      });

      // Check if critical
      if (this.isCriticalError(error)) {
        analysis.criticalErrors.push(error);
      }
    });

    // Sort and limit most frequent errors
    analysis.mostFrequent = Object.entries(analysis.byType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    return analysis;
  }

  isCriticalError(error) {
    const criticalPatterns = [
      'database connection',
      'authentication failed',
      'security violation',
      'data corruption'
    ];

    return criticalPatterns.some(pattern => 
      error.message.toLowerCase().includes(pattern)
    );
  }

  async retryAnalyticsOperation(errorData, context) {
    // Implement analytics retry logic
    console.log('Retrying analytics operation:', errorData);
  }

  async retryDatabaseOperation(errorData, context) {
    // Implement database retry logic
    console.log('Retrying database operation:', errorData);
  }

  async retryNetworkOperation(errorData, context) {
    // Implement network retry logic
    console.log('Retrying network operation:', errorData);
  }

  // Error Prevention
  validateInput(data, schema) {
    const errors = [];
    
    Object.entries(schema).forEach(([field, rules]) => {
      const value = data[field];
      
      rules.forEach(rule => {
        switch (rule.type) {
          case 'required':
            if (value === undefined || value === null || value === '') {
              errors.push(`${field} is required`);
            }
            break;
          case 'type':
            if (value !== undefined && typeof value !== rule.value) {
              errors.push(`${field} must be of type ${rule.value}`);
            }
            break;
          case 'min':
            if (value < rule.value) {
              errors.push(`${field} must be at least ${rule.value}`);
            }
            break;
          case 'max':
            if (value > rule.value) {
              errors.push(`${field} must be at most ${rule.value}`);
            }
            break;
          case 'pattern':
            if (!rule.value.test(value)) {
              errors.push(`${field} has invalid format`);
            }
            break;
        }
      });
    });

    return errors;
  }

  // Error Recovery Strategies
  getRecoveryStrategy(error) {
    const strategies = {
      'network/timeout': {
        maxRetries: 3,
        backoffFactor: 2,
        initialDelay: 1000
      },
      'database/unavailable': {
        maxRetries: 5,
        backoffFactor: 1.5,
        initialDelay: 2000
      },
      'auth/token-expired': {
        action: 'refresh_token',
        critical: true
      }
    };

    return strategies[error.code] || {
      maxRetries: 1,
      backoffFactor: 1,
      initialDelay: 1000
    };
  }

  async executeWithRetry(operation, context = {}) {
    const strategy = this.getRecoveryStrategy(context);
    let delay = strategy.initialDelay;
    let attempt = 0;

    while (attempt < strategy.maxRetries) {
      try {
        return await operation();
      } catch (error) {
        attempt++;
        if (attempt === strategy.maxRetries) {
          throw error;
        }

        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= strategy.backoffFactor;
      }
    }
  }
}

export const errorHandlingService = new ErrorHandlingService();
