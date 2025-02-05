import { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import {
  ShoppingBagIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ChartBarIcon,
  TruckIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import ProductManager from './ProductManager';
import OrderManager from './OrderManager';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const StoreDashboard = ({ user, storeId }) => {
  const [store, setStore] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [statistics, setStatistics] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    averageRating: 0,
    pendingOrders: 0,
    totalProducts: 0
  });
  const [salesData, setSalesData] = useState({
    labels: [],
    datasets: []
  });
  const [topProducts, setTopProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStoreData();
    loadStatistics();
    loadSalesData();
    loadTopProducts();
  }, [storeId]);

  const loadStoreData = async () => {
    try {
      const storeDoc = await getDoc(doc(db, 'stores', storeId));
      if (storeDoc.exists()) {
        setStore(storeDoc.data());
      }
    } catch (error) {
      console.error('Error loading store:', error);
      setError('Failed to load store data');
    }
  };

  const loadStatistics = async () => {
    try {
      // Load orders
      const ordersRef = collection(db, 'orders');
      const ordersQuery = query(ordersRef, where('storeId', '==', storeId));
      const ordersSnapshot = await getDocs(ordersQuery);
      const orders = ordersSnapshot.docs.map(doc => doc.data());

      // Load products
      const productsRef = collection(db, 'products');
      const productsQuery = query(productsRef, where('storeId', '==', storeId));
      const productsSnapshot = await getDocs(productsQuery);
      const products = productsSnapshot.docs.map(doc => doc.data());

      // Calculate statistics
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
      const uniqueCustomers = new Set(orders.map(order => order.userId)).size;
      const pendingOrders = orders.filter(order => order.status === 'pending').length;
      const ratings = products.flatMap(product => product.rating || 0);
      const averageRating = ratings.length > 0
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
        : 0;

      setStatistics({
        totalOrders,
        totalRevenue,
        totalCustomers: uniqueCustomers,
        averageRating,
        pendingOrders,
        totalProducts: products.length
      });
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const loadSalesData = async () => {
    try {
      const ordersRef = collection(db, 'orders');
      const ordersQuery = query(
        ordersRef,
        where('storeId', '==', storeId),
        where('status', 'in', ['delivered', 'shipped'])
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      const orders = ordersSnapshot.docs.map(doc => doc.data());

      // Group orders by date
      const salesByDate = orders.reduce((acc, order) => {
        const date = new Date(order.createdAt.toDate()).toLocaleDateString();
        acc[date] = (acc[date] || 0) + order.total;
        return acc;
      }, {});

      // Sort dates and prepare chart data
      const sortedDates = Object.keys(salesByDate).sort();
      setSalesData({
        labels: sortedDates,
        datasets: [
          {
            label: 'Daily Sales',
            data: sortedDates.map(date => salesByDate[date]),
            fill: false,
            borderColor: 'rgb(75, 192, 192)',
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
      const productsRef = collection(db, 'products');
      const productsQuery = query(
        productsRef,
        where('storeId', '==', storeId),
        where('rating', '>=', 4)
      );
      const productsSnapshot = await getDocs(productsQuery);
      const products = productsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 5);

      setTopProducts(products);
    } catch (error) {
      console.error('Error loading top products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-semibold">${statistics.totalRevenue.toFixed(2)}</p>
            </div>
            <CurrencyDollarIcon className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-2xl font-semibold">{statistics.totalOrders}</p>
            </div>
            <ShoppingBagIcon className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Customers</p>
              <p className="text-2xl font-semibold">{statistics.totalCustomers}</p>
            </div>
            <UserGroupIcon className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average Rating</p>
              <div className="flex items-center">
                <p className="text-2xl font-semibold">{statistics.averageRating.toFixed(1)}</p>
                <StarIcon className="h-5 w-5 text-yellow-400 ml-1" />
              </div>
            </div>
            <ChartBarIcon className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Orders</p>
              <p className="text-2xl font-semibold">{statistics.pendingOrders}</p>
            </div>
            <TruckIcon className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Products</p>
              <p className="text-2xl font-semibold">{statistics.totalProducts}</p>
            </div>
            <ShoppingBagIcon className="h-8 w-8 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* Sales Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Sales Overview</h3>
        <div className="h-64">
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

      {/* Top Products */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Top Products</h3>
        <div className="space-y-4">
          {topProducts.map(product => (
            <div key={product.id} className="flex items-center space-x-4">
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-16 h-16 object-cover rounded"
              />
              <div className="flex-1">
                <h4 className="font-medium">{product.name}</h4>
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.floor(product.rating)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="text-sm text-gray-600 ml-1">
                    ({product.reviews?.length || 0} reviews)
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">${product.price.toFixed(2)}</p>
                <p className="text-sm text-gray-600">{product.quantity} in stock</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {/* Store Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <div className="flex items-center space-x-4">
          <img
            src={store.logo}
            alt={store.name}
            className="w-16 h-16 rounded-full"
          />
          <div>
            <h2 className="text-2xl font-semibold">{store.name}</h2>
            <p className="text-gray-600">{store.category}</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6 border-b">
        <nav className="flex space-x-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-4 ${
              activeTab === 'overview'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`py-2 px-4 ${
              activeTab === 'products'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Products
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-2 px-4 ${
              activeTab === 'orders'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Orders
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'products' && <ProductManager user={user} storeId={storeId} />}
      {activeTab === 'orders' && <OrderManager user={user} storeId={storeId} isStore={true} />}
    </div>
  );
};

export default StoreDashboard;
