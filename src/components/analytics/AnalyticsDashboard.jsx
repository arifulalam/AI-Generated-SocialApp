import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { db } from '../../config/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
  endBefore,
  serverTimestamp
} from 'firebase/firestore';
import {
  CurrencyDollarIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const AnalyticsDashboard = ({ storeId, dateRange = 30 }) => {
  const [metrics, setMetrics] = useState({
    revenue: 0,
    orders: 0,
    customers: 0,
    averageOrderValue: 0
  });
  const [trends, setTrends] = useState({
    revenue: 0,
    orders: 0,
    customers: 0,
    averageOrderValue: 0
  });
  const [salesData, setSalesData] = useState({
    labels: [],
    datasets: []
  });
  const [topProducts, setTopProducts] = useState([]);
  const [customerSegments, setCustomerSegments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [storeId, dateRange]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        loadMetrics(),
        loadSalesData(),
        loadTopProducts(),
        loadCustomerSegments()
      ]);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateRange);

      // Get current period orders
      const ordersRef = collection(db, 'orders');
      const currentQuery = query(
        ordersRef,
        where('storeId', '==', storeId),
        where('createdAt', '>=', startDate),
        where('status', '==', 'completed')
      );
      const currentSnapshot = await getDocs(currentQuery);

      // Calculate current period metrics
      let currentRevenue = 0;
      let currentOrders = currentSnapshot.size;
      const currentCustomers = new Set();

      currentSnapshot.forEach(doc => {
        const order = doc.data();
        currentRevenue += order.total;
        currentCustomers.add(order.userId);
      });

      // Get previous period orders for trends
      const previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - dateRange);

      const previousQuery = query(
        ordersRef,
        where('storeId', '==', storeId),
        where('createdAt', '>=', previousStartDate),
        where('createdAt', '<', startDate),
        where('status', '==', 'completed')
      );
      const previousSnapshot = await getDocs(previousQuery);

      // Calculate previous period metrics
      let previousRevenue = 0;
      let previousOrders = previousSnapshot.size;
      const previousCustomers = new Set();

      previousSnapshot.forEach(doc => {
        const order = doc.data();
        previousRevenue += order.total;
        previousCustomers.add(order.userId);
      });

      // Calculate trends (percentage change)
      const calculateTrend = (current, previous) => {
        if (previous === 0) return 100;
        return ((current - previous) / previous) * 100;
      };

      setMetrics({
        revenue: currentRevenue,
        orders: currentOrders,
        customers: currentCustomers.size,
        averageOrderValue: currentOrders > 0 ? currentRevenue / currentOrders : 0
      });

      setTrends({
        revenue: calculateTrend(currentRevenue, previousRevenue),
        orders: calculateTrend(currentOrders, previousOrders),
        customers: calculateTrend(currentCustomers.size, previousCustomers.size),
        averageOrderValue: calculateTrend(
          currentRevenue / currentOrders,
          previousRevenue / previousOrders
        )
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const loadSalesData = async () => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateRange);

      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef,
        where('storeId', '==', storeId),
        where('createdAt', '>=', startDate),
        where('status', '==', 'completed'),
        orderBy('createdAt', 'asc')
      );

      const snapshot = await getDocs(q);

      // Process data for chart
      const dailyData = {};
      snapshot.forEach(doc => {
        const order = doc.data();
        const date = order.createdAt.toDate().toLocaleDateString();
        if (!dailyData[date]) {
          dailyData[date] = {
            revenue: 0,
            orders: 0
          };
        }
        dailyData[date].revenue += order.total;
        dailyData[date].orders += 1;
      });

      setSalesData({
        labels: Object.keys(dailyData),
        datasets: [
          {
            label: 'Revenue',
            data: Object.values(dailyData).map(d => d.revenue),
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
          },
          {
            label: 'Orders',
            data: Object.values(dailyData).map(d => d.orders),
            borderColor: 'rgb(255, 99, 132)',
            tension: 0.1
          }
        ]
      });
    } catch (error) {
      console.error('Error loading sales data:', error);
    }
  };

  const loadTopProducts = async () => {
    try {
      const orderItemsRef = collection(db, 'orderItems');
      const q = query(
        orderItemsRef,
        where('storeId', '==', storeId),
        orderBy('quantity', 'desc'),
        limit(5)
      );

      const snapshot = await getDocs(q);
      const products = await Promise.all(
        snapshot.docs.map(async doc => {
          const item = doc.data();
          const productDoc = await getDoc(doc(db, 'products', item.productId));
          return {
            ...item,
            product: productDoc.data()
          };
        })
      );

      setTopProducts(products);
    } catch (error) {
      console.error('Error loading top products:', error);
    }
  };

  const loadCustomerSegments = async () => {
    try {
      const customersRef = collection(db, 'customers');
      const q = query(
        customersRef,
        where('storeId', '==', storeId)
      );

      const snapshot = await getDocs(q);
      
      // Segment customers based on total spend
      const segments = {
        'VIP': 0,
        'Regular': 0,
        'Occasional': 0,
        'New': 0
      };

      snapshot.forEach(doc => {
        const customer = doc.data();
        if (customer.totalSpent >= 1000) {
          segments['VIP']++;
        } else if (customer.totalSpent >= 500) {
          segments['Regular']++;
        } else if (customer.totalSpent >= 100) {
          segments['Occasional']++;
        } else {
          segments['New']++;
        }
      });

      setCustomerSegments(segments);
    } catch (error) {
      console.error('Error loading customer segments:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Revenue"
          value={metrics.revenue}
          trend={trends.revenue}
          icon={<CurrencyDollarIcon className="h-6 w-6" />}
          format="currency"
        />
        <MetricCard
          title="Orders"
          value={metrics.orders}
          trend={trends.orders}
          icon={<ShoppingCartIcon className="h-6 w-6" />}
        />
        <MetricCard
          title="Customers"
          value={metrics.customers}
          trend={trends.customers}
          icon={<UserGroupIcon className="h-6 w-6" />}
        />
        <MetricCard
          title="Average Order Value"
          value={metrics.averageOrderValue}
          trend={trends.averageOrderValue}
          icon={<ChartBarIcon className="h-6 w-6" />}
          format="currency"
        />
      </div>

      {/* Sales Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium mb-4">Sales Trend</h2>
        <div className="h-80">
          <Line
            data={salesData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium mb-4">Top Products</h2>
          <div className="space-y-4">
            {topProducts.map((item, index) => (
              <div
                key={item.productId}
                className="flex items-center justify-between"
              >
                <div className="flex items-center space-x-4">
                  <span className="text-lg font-medium text-gray-500">
                    #{index + 1}
                  </span>
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                  <div>
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-sm text-gray-500">
                      {item.quantity} units sold
                    </p>
                  </div>
                </div>
                <span className="font-medium">
                  ${(item.quantity * item.product.price).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Segments */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium mb-4">Customer Segments</h2>
          <div className="h-64">
            <Doughnut
              data={{
                labels: Object.keys(customerSegments),
                datasets: [
                  {
                    data: Object.values(customerSegments),
                    backgroundColor: [
                      '#4F46E5',
                      '#10B981',
                      '#F59E0B',
                      '#6B7280'
                    ]
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right'
                  }
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, trend, icon, format = 'number' }) => {
  const formatValue = (val) => {
    if (format === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(val);
    }
    return new Intl.NumberFormat('en-US').format(val);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div className="text-gray-500">{icon}</div>
        <div className={`flex items-center ${
          trend > 0 ? 'text-green-500' : 'text-red-500'
        }`}>
          {trend > 0 ? (
            <ArrowUpIcon className="h-4 w-4" />
          ) : (
            <ArrowDownIcon className="h-4 w-4" />
          )}
          <span className="ml-1">{Math.abs(trend).toFixed(1)}%</span>
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-gray-500 text-sm">{title}</h3>
        <p className="text-2xl font-semibold mt-1">{formatValue(value)}</p>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
