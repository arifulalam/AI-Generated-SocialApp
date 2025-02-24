import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import LoadingSpinner from '../common/LoadingSpinner';

const AdminDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalGroups: 0,
    totalStores: 0,
    activeUsers: 0,
    reportedContent: 0,
    pendingApprovals: 0,
    systemHealth: 'Healthy'
  });

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        if (!currentUser) {
          navigate('/login');
          return;
        }

        const userRef = collection(db, 'users');
        const userDoc = await getDocs(query(userRef));
        const userData = userDoc.docs.find(doc => doc.id === currentUser.uid);

        if (!userData?.data()?.isSuperAdmin) {
          navigate('/login', { state: { error: 'Access denied. Super admin privileges required.' } });
          return;
        }

        await fetchDashboardStats();
      } catch (err) {
        setError('Failed to verify admin access');
        console.error('Admin access verification failed:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [currentUser, navigate]);

  const fetchDashboardStats = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const groupsSnapshot = await getDocs(collection(db, 'groups'));
      const storesSnapshot = await getDocs(collection(db, 'stores'));
      const reportsSnapshot = await getDocs(collection(db, 'reports'));
      const approvalsSnapshot = await getDocs(collection(db, 'pendingApprovals'));

      const activeUsers = usersSnapshot.docs.filter(doc => {
        const lastActive = doc.data().lastActive?.toDate();
        return lastActive && (new Date() - lastActive) < 24 * 60 * 60 * 1000;
      }).length;

      // Calculate system health based on various metrics
      const systemHealth = calculateSystemHealth(activeUsers, usersSnapshot.size);

      setStats({
        totalUsers: usersSnapshot.size,
        totalGroups: groupsSnapshot.size,
        totalStores: storesSnapshot.size,
        activeUsers,
        reportedContent: reportsSnapshot.size,
        pendingApprovals: approvalsSnapshot.size,
        systemHealth
      });
    } catch (err) {
      setError('Failed to fetch dashboard statistics');
      console.error('Error fetching dashboard stats:', err);
    }
  };

  const calculateSystemHealth = (activeUsers, totalUsers) => {
    const activeUserRatio = activeUsers / totalUsers;
    if (activeUserRatio >= 0.7) return 'Excellent';
    if (activeUserRatio >= 0.5) return 'Good';
    if (activeUserRatio >= 0.3) return 'Fair';
    return 'Needs Attention';
  };

  const handleSystemBackup = async () => {
    try {
      setLoading(true);
      // Get all collections data
      const collections = ['users', 'groups', 'stores', 'reports', 'pendingApprovals'];
      const backupData = {};

      for (const collectionName of collections) {
        const snapshot = await getDocs(collection(db, collectionName));
        backupData[collectionName] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }

      // Create and download backup file
      const backupBlob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(backupBlob);
      window.open(url);
    } catch (error) {
      setError('Failed to create system backup');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500 text-center">
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Admin Dashboard</h1>
        
        {/* Refresh Stats Button */}
        <button
          onClick={fetchDashboardStats}
          className="mb-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
        >
          Refresh Statistics
        </button>
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-gray-500 text-sm font-medium">Total Users</h3>
            <p className="text-3xl font-bold text-gray-800">{stats.totalUsers}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-gray-500 text-sm font-medium">Active Users (24h)</h3>
            <p className="text-3xl font-bold text-gray-800">{stats.activeUsers}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-gray-500 text-sm font-medium">Total Groups</h3>
            <p className="text-3xl font-bold text-gray-800">{stats.totalGroups}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-gray-500 text-sm font-medium">Total Stores</h3>
            <p className="text-3xl font-bold text-gray-800">{stats.totalStores}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/admin/users')}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            >
              Manage Users
            </button>
            <button
              onClick={() => navigate('/admin/groups')}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
            >
              Manage Groups
            </button>
            <button
              onClick={() => navigate('/admin/stores')}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition-colors"
            >
              Manage Stores
            </button>
            <button
              onClick={() => navigate('/admin/reports')}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
            >
              View Reports
            </button>
            <button
              onClick={() => navigate('/admin/settings')}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
            >
              System Settings
            </button>
            <button
              onClick={() => navigate('/admin/approvals')}
              className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors"
            >
              Pending Approvals
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">System Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">System Health</span>
              <span className={`text-${stats.systemHealth === 'Excellent' ? 'green' : stats.systemHealth === 'Good' ? 'blue' : stats.systemHealth === 'Fair' ? 'yellow' : 'red'}-500`}>
                {stats.systemHealth}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Reported Content</span>
              <span className="text-red-500">{stats.reportedContent}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Pending Approvals</span>
              <span className="text-yellow-500">{stats.pendingApprovals}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Last System Check</span>
              <span className="text-gray-800">{new Date().toLocaleDateString()}</span>
            </div>
            <button
              onClick={handleSystemBackup}
              className="mt-4 w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            >
              Backup System
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;