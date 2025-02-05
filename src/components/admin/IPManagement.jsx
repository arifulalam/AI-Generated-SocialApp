import React, { useState, useEffect } from 'react';
import { ipRestrictionService } from '../../services/IPRestrictionService';

const IPManagement = () => {
  const [newIP, setNewIP] = useState('');
  const [accessLog, setAccessLog] = useState([]);
  const [currentIP, setCurrentIP] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const ip = await ipRestrictionService.getCurrentIP();
      setCurrentIP(ip);
      
      const log = ipRestrictionService.getIPAccessLog();
      setAccessLog(log);
    } catch (error) {
      setError('Error loading IP data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const validateIP = (ip) => {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) return false;
    
    const parts = ip.split('.');
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  };

  const handleAddIP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateIP(newIP)) {
      setError('Invalid IP address format');
      return;
    }

    try {
      ipRestrictionService.addAllowedIP(newIP);
      setSuccess(`IP address ${newIP} added successfully`);
      setNewIP('');
      await loadData();
    } catch (error) {
      setError('Error adding IP address');
      console.error(error);
    }
  };

  const handleRemoveIP = async (ip) => {
    try {
      ipRestrictionService.removeAllowedIP(ip);
      setSuccess(`IP address ${ip} removed successfully`);
      await loadData();
    } catch (error) {
      setError('Error removing IP address');
      console.error(error);
    }
  };

  const handleClearCache = () => {
    try {
      ipRestrictionService.clearIPCache();
      setSuccess('IP cache cleared successfully');
      loadData();
    } catch (error) {
      setError('Error clearing IP cache');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          IP Access Management
        </h2>

        {/* Current IP */}
        <div className="mb-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-medium text-blue-900">Your Current IP</h3>
          <p className="mt-1 text-blue-700 font-mono">{currentIP}</p>
        </div>

        {/* Add New IP */}
        <form onSubmit={handleAddIP} className="mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label
                htmlFor="newIP"
                className="block text-sm font-medium text-gray-700"
              >
                Add Allowed IP Address
              </label>
              <input
                type="text"
                id="newIP"
                value={newIP}
                onChange={(e) => setNewIP(e.target.value)}
                placeholder="xxx.xxx.xxx.xxx"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm
                  focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <button
              type="submit"
              className="mt-6 px-4 py-2 border border-transparent rounded-md shadow-sm
                text-sm font-medium text-white bg-blue-600 hover:bg-blue-700
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add IP
            </button>
          </div>
        </form>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 rounded-lg text-green-700 text-sm">
            {success}
          </div>
        )}

        {/* Access Log */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Access Log</h3>
            <button
              onClick={handleClearCache}
              className="px-3 py-1 text-sm text-blue-600 hover:text-blue-500"
            >
              Clear Cache
            </button>
          </div>
          
          <div className="bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Checked
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {accessLog.map((log) => (
                  <tr key={log.ip}>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-900">
                      {log.ip}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5
                        font-semibold rounded-full ${
                          log.allowed
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {log.allowed ? 'Allowed' : 'Blocked'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.lastChecked).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleRemoveIP(log.ip)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IPManagement;
