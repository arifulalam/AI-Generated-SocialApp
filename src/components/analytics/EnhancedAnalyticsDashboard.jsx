import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { analyticsService } from '../../services/AnalyticsService';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  ChartBarIcon,
  UserGroupIcon,
  DocumentTextIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  ShareIcon,
  ClockIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { format, subDays } from 'date-fns';

const EnhancedAnalyticsDashboard = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [timeRange, setTimeRange] = useState(30);
  const [metrics, setMetrics] = useState({
    user: null,
    content: null,
    engagement: null
  });
  const [trendingContent, setTrendingContent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [userMetrics, contentMetrics, engagementMetrics] = await Promise.all([
        analyticsService.getUserMetrics(user.uid, timeRange),
        analyticsService.getContentMetrics(null, timeRange),
        analyticsService.getEngagementMetrics(timeRange)
      ]);

      setMetrics({
        user: userMetrics,
        content: contentMetrics,
        engagement: engagementMetrics
      });

      // Update trending content
      await analyticsService.updateTrendingContent();
      setLoading(false);
    } catch (error) {
      console.error('Error loading analytics data:', error);
      setLoading(false);
    }
  };

  const formatMetricsForChart = (metricsData, key = 'totalEvents') => {
    return Object.entries(metricsData.daily).map(([date, data]) => ({
      date: format(new Date(date), 'MMM d'),
      value: data[key]
    }));
  };

  const calculateGrowth = (current, previous) => {
    if (!previous) return 100;
    return ((current - previous) / previous) * 100;
  };

  const renderMetricCard = (title, value, trend, icon) => (
    <div className={`p-6 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {title}
          </p>
          <p className={`mt-2 text-3xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {value.toLocaleString()}
          </p>
        </div>
        <div className={`p-3 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
          {icon}
        </div>
      </div>
      <div className="mt-4">
        <span className={`text-sm font-medium ${
          trend >= 0 ? 'text-green-500' : 'text-red-500'
        }`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
        </span>
        <span className={`ml-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          vs previous period
        </span>
      </div>
    </div>
  );

  const renderEngagementChart = () => (
    <div className={`p-6 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
      <h3 className={`text-lg font-medium mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Engagement Over Time
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={formatMetricsForChart(metrics.engagement)}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            stroke={isDark ? '#9CA3AF' : '#6B7280'}
          />
          <YAxis
            stroke={isDark ? '#9CA3AF' : '#6B7280'}
          />
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
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#3B82F6"
            fillOpacity={1}
            fill="url(#colorValue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  const renderContentDistribution = () => {
    const data = Object.entries(metrics.content.total.events).map(([type, count]) => ({
      name: type,
      value: count
    }));

    return (
      <div className={`p-6 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <h3 className={`text-lg font-medium mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Content Distribution
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
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
  };

  const renderUserActivity = () => (
    <div className={`p-6 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
      <h3 className={`text-lg font-medium mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        User Activity
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={formatMetricsForChart(metrics.user)}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <XAxis
            dataKey="date"
            stroke={isDark ? '#9CA3AF' : '#6B7280'}
          />
          <YAxis
            stroke={isDark ? '#9CA3AF' : '#6B7280'}
          />
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
          />
          <Bar
            dataKey="value"
            fill="#3B82F6"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Analytics Dashboard
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
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
          </div>
        ) : (
          <>
            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {renderMetricCard(
                'Total Users',
                metrics.user.total.totalEvents,
                metrics.user.trends.totalEvents,
                <UserGroupIcon className="h-6 w-6 text-blue-500" />
              )}
              {renderMetricCard(
                'Content Created',
                metrics.content.total.totalEvents,
                metrics.content.trends.totalEvents,
                <DocumentTextIcon className="h-6 w-6 text-green-500" />
              )}
              {renderMetricCard(
                'Total Engagement',
                metrics.engagement.total.totalEvents,
                metrics.engagement.trends.totalEvents,
                <HeartIcon className="h-6 w-6 text-red-500" />
              )}
              {renderMetricCard(
                'Average Session',
                Math.round(metrics.engagement.total.averageDuration / 60),
                metrics.engagement.trends.averageDuration,
                <ClockIcon className="h-6 w-6 text-purple-500" />
              )}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {renderEngagementChart()}
              {renderContentDistribution()}
            </div>

            <div className="grid grid-cols-1 gap-6">
              {renderUserActivity()}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EnhancedAnalyticsDashboard;
