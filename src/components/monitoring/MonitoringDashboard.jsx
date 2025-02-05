import React, { useState, useEffect } from 'react';
import { monitoringService } from '../../services/MonitoringService';
import { LineChart, AreaChart, DonutChart } from '@tremor/react';
import { formatNumber, formatBytes } from '../../utils/formatters';

const MonitoringDashboard = () => {
  const [metrics, setMetrics] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [selectedTimeframe]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const timeRange = getTimeRange(selectedTimeframe);
      
      // Load all monitoring data in parallel
      const [
        systemMetrics,
        activeAlerts,
        recentLogs,
        userAnalytics
      ] = await Promise.all([
        monitoringService.getMetrics('system', timeRange.start, timeRange.end),
        monitoringService.getAlerts({ status: 'active' }),
        monitoringService.getLogs({ 
          startTime: timeRange.start,
          endTime: timeRange.end,
          limit: 100
        }),
        monitoringService.getAnalytics('user_activity', timeRange.start, timeRange.end)
      ]);

      setMetrics(systemMetrics);
      setAlerts(activeAlerts);
      setLogs(recentLogs);
      setAnalytics(userAnalytics);
    } catch (error) {
      console.error('Error loading monitoring data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTimeRange = (timeframe) => {
    const end = new Date();
    const start = new Date();

    switch (timeframe) {
      case '1h':
        start.setHours(start.getHours() - 1);
        break;
      case '6h':
        start.setHours(start.getHours() - 6);
        break;
      case '24h':
        start.setHours(start.getHours() - 24);
        break;
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
    }

    return { start, end };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          System Monitoring
        </h1>
        <div className="flex space-x-4">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700
              dark:text-white focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="CPU Usage"
          value={metrics.cpu?.current || 0}
          unit="%"
          trend={metrics.cpu?.trend}
          status={getMetricStatus(metrics.cpu?.current, 80, 90)}
        />
        <MetricCard
          title="Memory Usage"
          value={metrics.memory?.used || 0}
          unit="GB"
          total={metrics.memory?.total}
          trend={metrics.memory?.trend}
          status={getMetricStatus(
            (metrics.memory?.used / metrics.memory?.total) * 100,
            80,
            90
          )}
        />
        <MetricCard
          title="Active Users"
          value={metrics.users?.active || 0}
          trend={metrics.users?.trend}
          status="normal"
        />
        <MetricCard
          title="Response Time"
          value={metrics.response?.average || 0}
          unit="ms"
          trend={metrics.response?.trend}
          status={getMetricStatus(metrics.response?.average, 200, 500)}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Performance */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            System Performance
          </h2>
          <LineChart
            data={metrics.performance || []}
            index="timestamp"
            categories={['cpu', 'memory', 'disk']}
            colors={['blue', 'green', 'yellow']}
            valueFormatter={(value) => `${value}%`}
            yAxisWidth={40}
          />
        </div>

        {/* User Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            User Activity
          </h2>
          <AreaChart
            data={analytics.activity || []}
            index="timestamp"
            categories={['active', 'idle', 'offline']}
            colors={['emerald', 'amber', 'gray']}
            valueFormatter={formatNumber}
            yAxisWidth={40}
          />
        </div>
      </div>

      {/* Active Alerts */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Active Alerts
        </h2>
        <div className="space-y-4">
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
          {alerts.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400">
              No active alerts
            </p>
          )}
        </div>
      </div>

      {/* Recent Logs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Recent Logs
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Message
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Source
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <LogLevel level={log.level} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {log.message}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {log.source}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, unit, total, trend, status }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'critical':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      default:
        return 'text-green-500';
    }
  };

  const getTrendIcon = (trend) => {
    if (trend > 0) return '↑';
    if (trend < 0) return '↓';
    return '→';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {title}
      </h3>
      <div className="mt-2 flex items-baseline">
        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
          {formatNumber(value)}
          {unit && <span className="text-sm ml-1">{unit}</span>}
        </p>
        {total && (
          <p className="text-sm text-gray-500 dark:text-gray-400 ml-2">
            / {formatNumber(total)} {unit}
          </p>
        )}
      </div>
      <div className="mt-2 flex items-center">
        <span className={getStatusColor(status)}>●</span>
        <span className="text-sm ml-2 text-gray-500 dark:text-gray-400">
          {getTrendIcon(trend)} {Math.abs(trend)}%
        </span>
      </div>
    </div>
  );
};

const AlertCard = ({ alert }) => {
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
      <div className="flex items-center space-x-4">
        <span className={`px-2 py-1 rounded text-sm font-medium ${getSeverityColor(alert.severity)}`}>
          {alert.severity}
        </span>
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            {alert.title}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {alert.message}
          </p>
        </div>
      </div>
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {new Date(alert.timestamp).toLocaleString()}
      </span>
    </div>
  );
};

const LogLevel = ({ level }) => {
  const getLevelColor = (level) => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getLevelColor(level)}`}>
      {level}
    </span>
  );
};

const getMetricStatus = (value, warningThreshold, criticalThreshold) => {
  if (value >= criticalThreshold) return 'critical';
  if (value >= warningThreshold) return 'warning';
  return 'normal';
};

export default MonitoringDashboard;
