import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import {
  UserGroupIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  TagIcon,
  FunnelIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

const CRM = ({ user }) => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [newInteraction, setNewInteraction] = useState({
    type: 'note',
    content: '',
    followUpDate: ''
  });
  const [filter, setFilter] = useState('all'); // all, active, inactive
  const [sort, setSort] = useState('recent'); // recent, name, value
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCustomers();
  }, [filter, sort]);

  useEffect(() => {
    if (selectedCustomer) {
      loadInteractions(selectedCustomer.id);
    }
  }, [selectedCustomer]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const customersRef = collection(db, 'customers');
      let q = query(customersRef, where('storeId', '==', user.storeId));

      // Apply filters
      if (filter === 'active') {
        q = query(q, where('status', '==', 'active'));
      } else if (filter === 'inactive') {
        q = query(q, where('status', '==', 'inactive'));
      }

      // Apply sorting
      switch (sort) {
        case 'name':
          q = query(q, orderBy('name'));
          break;
        case 'value':
          q = query(q, orderBy('totalSpent', 'desc'));
          break;
        default:
          q = query(q, orderBy('lastInteraction', 'desc'));
      }

      const snapshot = await getDocs(q);
      const customersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setCustomers(customersList);
    } catch (error) {
      console.error('Error loading customers:', error);
      setError('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const loadInteractions = async (customerId) => {
    try {
      const interactionsRef = collection(db, 'interactions');
      const q = query(
        interactionsRef,
        where('customerId', '==', customerId),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);
      const interactionsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setInteractions(interactionsList);
    } catch (error) {
      console.error('Error loading interactions:', error);
      setError('Failed to load interactions');
    }
  };

  const handleAddInteraction = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!newInteraction.content) {
        setError('Please enter interaction content');
        return;
      }

      const interactionData = {
        customerId: selectedCustomer.id,
        userId: user.uid,
        userName: user.displayName,
        ...newInteraction,
        timestamp: serverTimestamp()
      };

      await addDoc(collection(db, 'interactions'), interactionData);
      
      // Update customer's last interaction
      await updateDoc(doc(db, 'customers', selectedCustomer.id), {
        lastInteraction: serverTimestamp()
      });

      setNewInteraction({
        type: 'note',
        content: '',
        followUpDate: ''
      });
      
      await loadInteractions(selectedCustomer.id);
    } catch (error) {
      console.error('Error adding interaction:', error);
      setError('Failed to add interaction');
    } finally {
      setLoading(false);
    }
  };

  const getCustomerStatus = (customer) => {
    const lastOrder = new Date(customer.lastOrder?.toDate());
    const monthsSinceLastOrder = (new Date() - lastOrder) / (1000 * 60 * 60 * 24 * 30);
    
    if (monthsSinceLastOrder <= 1) return 'Active';
    if (monthsSinceLastOrder <= 3) return 'Recent';
    if (monthsSinceLastOrder <= 6) return 'Inactive';
    return 'Lost';
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex space-x-6">
        {/* Customers List */}
        <div className="w-1/3 bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Customers</h2>
              <div className="flex space-x-2">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="text-sm border rounded-lg px-2 py-1"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="text-sm border rounded-lg px-2 py-1"
                >
                  <option value="recent">Recent</option>
                  <option value="name">Name</option>
                  <option value="value">Value</option>
                </select>
              </div>
            </div>

            <input
              type="text"
              placeholder="Search customers..."
              className="w-full p-2 border rounded-lg"
            />
          </div>

          <div className="divide-y max-h-[calc(100vh-200px)] overflow-y-auto">
            {customers.map(customer => (
              <div
                key={customer.id}
                onClick={() => setSelectedCustomer(customer)}
                className={`p-4 cursor-pointer hover:bg-gray-50 ${
                  selectedCustomer?.id === customer.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{customer.name}</h3>
                    <p className="text-sm text-gray-500">{customer.email}</p>
                  </div>
                  <span className={`text-sm px-2 py-1 rounded-full ${
                    getCustomerStatus(customer) === 'Active'
                      ? 'bg-green-100 text-green-800'
                      : getCustomerStatus(customer) === 'Recent'
                      ? 'bg-blue-100 text-blue-800'
                      : getCustomerStatus(customer) === 'Inactive'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {getCustomerStatus(customer)}
                  </span>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  Last order: {customer.lastOrder?.toDate().toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Details */}
        {selectedCustomer ? (
          <div className="w-2/3 space-y-6">
            {/* Customer Info Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{selectedCustomer.name}</h2>
                  <div className="space-y-2">
                    <div className="flex items-center text-gray-500">
                      <EnvelopeIcon className="h-5 w-5 mr-2" />
                      {selectedCustomer.email}
                    </div>
                    <div className="flex items-center text-gray-500">
                      <PhoneIcon className="h-5 w-5 mr-2" />
                      {selectedCustomer.phone}
                    </div>
                    <div className="flex items-center text-gray-500">
                      <MapPinIcon className="h-5 w-5 mr-2" />
                      {selectedCustomer.address}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    ${selectedCustomer.totalSpent.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500">Total Spent</div>
                  <div className="mt-2">
                    <span className="text-lg font-medium">{selectedCustomer.orderCount}</span>
                    <span className="text-gray-500 ml-1">Orders</span>
                  </div>
                </div>
              </div>

              {/* Customer Tags */}
              <div className="mt-4">
                <div className="flex flex-wrap gap-2">
                  {selectedCustomer.tags?.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Interaction Timeline */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">Interaction Timeline</h3>

              {/* Add Interaction */}
              <div className="mb-6">
                <div className="flex space-x-4 mb-4">
                  <select
                    value={newInteraction.type}
                    onChange={(e) => setNewInteraction(prev => ({
                      ...prev,
                      type: e.target.value
                    }))}
                    className="border rounded-lg px-3 py-2"
                  >
                    <option value="note">Note</option>
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                  </select>
                  {(newInteraction.type === 'call' || newInteraction.type === 'meeting') && (
                    <input
                      type="datetime-local"
                      value={newInteraction.followUpDate}
                      onChange={(e) => setNewInteraction(prev => ({
                        ...prev,
                        followUpDate: e.target.value
                      }))}
                      className="border rounded-lg px-3 py-2"
                    />
                  )}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newInteraction.content}
                    onChange={(e) => setNewInteraction(prev => ({
                      ...prev,
                      content: e.target.value
                    }))}
                    placeholder="Add a note, call log, or meeting summary..."
                    className="flex-1 border rounded-lg px-3 py-2"
                  />
                  <button
                    onClick={handleAddInteraction}
                    disabled={loading}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Interactions List */}
              <div className="space-y-4">
                {interactions.map(interaction => (
                  <div
                    key={interaction.id}
                    className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className={`p-2 rounded-full ${
                      interaction.type === 'note'
                        ? 'bg-blue-100 text-blue-600'
                        : interaction.type === 'call'
                        ? 'bg-green-100 text-green-600'
                        : interaction.type === 'email'
                        ? 'bg-purple-100 text-purple-600'
                        : 'bg-orange-100 text-orange-600'
                    }`}>
                      {interaction.type === 'note' && <ChatBubbleLeftRightIcon className="h-5 w-5" />}
                      {interaction.type === 'call' && <PhoneIcon className="h-5 w-5" />}
                      {interaction.type === 'email' && <EnvelopeIcon className="h-5 w-5" />}
                      {interaction.type === 'meeting' && <UserGroupIcon className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{interaction.userName}</span>
                        <span className="text-sm text-gray-500">
                          {interaction.timestamp?.toDate().toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1">{interaction.content}</p>
                      {interaction.followUpDate && (
                        <div className="mt-2 text-sm text-gray-500">
                          Follow-up: {new Date(interaction.followUpDate).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="w-2/3 bg-white rounded-lg shadow p-6 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <UserGroupIcon className="h-12 w-12 mx-auto mb-4" />
              <p>Select a customer to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CRM;
