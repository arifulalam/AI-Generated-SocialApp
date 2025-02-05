import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { errorHandlingService } from '../../services/ErrorHandlingService';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format, subHours } from 'date-fns';

const ErrorMonitoringDashboard = () => {
  const { isDark } = useTheme();
  const [timeRange, setTimeRange] = useState(24);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedError, setSelectedError] = useState(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    loadAnalysis();
    const unsubscribe = errorHandlingService.subscribe(handleNewError);
    return () => unsubscribe();
  }, [timeRange]);

  const loadAnalysis = async () => {
    try {
      setLoading(true);
      const data = await errorHandlingService.analyzeErrors(timeRange);
      setAnalysis(data);
    } catch (error) {
      console.error('Error loading analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewError = (error) => {
    // Update analysis when new error occurs
    loadAnalysis();
  };

  const handleRetry = async (operationId) => {
    try {
      setRetrying(true);
      await errorHandlingService.retryFailedOperation(operationId);
      await loadAnalysis();
    } catch (error) {
      console.error('Error retrying operation:', error);
    } finally {
      setRetrying(false);
    }
  };

  const renderErrorDistribution = () => (
    <div className={`p-6 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
      <h3 className={`text-lg font-medium mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Error Distribution
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={Object.entries(analysis.byType).map(([type, count]) => ({
              name: type,
              value: count
            }))}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            fill="#3B82F6"
            dataKey="value"
            label
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              border: 'none',
              borderRadius: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );

  const renderErrorTimeline = () => (
    <div className={`p-6 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
      <h3 className={`text-lg font-medium mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Error Timeline
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={analysis.timeline}>
          <XAxis
            dataKey="timestamp"
            tickFormatter={(timestamp) => format(new Date(timestamp), 'HH:mm')}
            stroke={isDark ? '#9CA3AF' : '#6B7280'}
          />
          <YAxis stroke={isDark ? '#9CA3AF' : '#6B7280'} />
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDark ? '#374151' : '#E5E7EB'}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              border: 'none',
              borderRadius: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            labelFormatter={(timestamp) => format(new Date(timestamp), 'HH:mm:ss')}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  const renderErrorList = () => (
    <div className={`p-6 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
      <h3 className={`text-lg font-medium mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Recent Errors
      </h3>
      <div className="space-y-4">
        {analysis.criticalErrors.map((error) => (
          <div
            key={error.id}
            className={`p-4 rounded-lg ${
              isDark ? 'bg-gray-700' : 'bg-gray-50'
            } cursor-pointer hover:bg-opacity-80`}
            onClick={() => setSelectedError(error)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {error.message}
                </p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {format(new Date(error.timestamp), 'MMM d, yyyy HH:mm:ss')}
                </p>
              </div>
              {error.context.operationId && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRetry(error.context.operationId);
                  }}
                  disabled={retrying}
                  className={`px-3 py-1 rounded ${
                    retrying
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600'
                  } text-white text-sm focus:outline-none focus:ring-2
                    focus:ring-blue-500 focus:ring-offset-2`}
                >
                  {retrying ? 'Retrying...' : 'Retry'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderErrorDetails = () => (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center
      justify-center p-4 ${selectedError ? 'block' : 'hidden'}`}
    >
      <div className={`max-w-2xl w-full rounded-lg ${
        isDark ? 'bg-gray-800' : 'bg-white'
      } shadow-xl p-6`}>
        <div className="flex justify-between items-start mb-4">
          <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Error Details
          </h3>
          <button
            onClick={() => setSelectedError(null)}
            className={`${isDark ? 'text-gray-400' : 'text-gray-500'} hover:text-gray-700`}
          >
            ×
          </button>
        </div>

        {selectedError && (
          <>
            <div className="space-y-4">
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Message
                </p>
                <p className={isDark ? 'text-white' : 'text-gray-900'}>
                  {selectedError.message}
                </p>
              </div>

              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Stack Trace
                </p>
                <pre className={`mt-1 p-3 rounded-lg overflow-auto text-sm ${
                  isDark ? 'bg-gray-900 text-gray-300' : 'bg-gray-50 text-gray-700'
                }`}>
                  {selectedError.stack}
                </pre>
              </div>

              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Context
                </p>
                <pre className={`mt-1 p-3 rounded-lg overflow-auto text-sm ${
                  isDark ? 'bg-gray-900 text-gray-300' : 'bg-gray-50 text-gray-700'
                }`}>
                  {JSON.stringify(selectedError.context, null, 2)}
                </pre>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setSelectedError(null)}
                className={`px-4 py-2 rounded ${
                  isDark
                    ? 'text-gray-300 hover:text-white'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Close
              </button>
              {selectedError.context.operationId && (
                <button
                  onClick={() => handleRetry(selectedError.context.operationId)}
                  disabled={retrying}
                  className={`px-4 py-2 rounded ${
                    retrying
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600'
                  } text-white focus:outline-none focus:ring-2
                    focus:ring-blue-500 focus:ring-offset-2`}
                >
                  {retrying ? 'Retrying...' : 'Retry Operation'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Error Monitoring
          </h1>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className={`px-4 py-2 rounded-lg ${
              isDark
                ? 'bg-gray-800 text-white border-gray-700'
                : 'bg-white text-gray-900 border-gray-300'
            } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
          >
            <option value={6}>Last 6 hours</option>
            <option value={12}>Last 12 hours</option>
            <option value={24}>Last 24 hours</option>
            <option value={48}>Last 48 hours</option>
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {renderErrorDistribution()}
          {renderErrorTimeline()}
        </div>

        {renderErrorList()}
        {renderErrorDetails()}
      </div>
    </div>
  );
};

export default ErrorMonitoringDashboard;
