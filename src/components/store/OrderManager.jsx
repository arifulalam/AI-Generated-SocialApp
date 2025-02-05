import { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, updateDoc, doc, orderBy } from 'firebase/firestore';
import { ClockIcon, TruckIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

const OrderManager = ({ user, isStore = false }) => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadOrders();
  }, [filter]);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const ordersRef = collection(db, 'orders');
      let q;

      if (isStore) {
        // For store view - get orders for store's products
        q = query(
          ordersRef,
          where('storeId', '==', user.storeId),
          orderBy('createdAt', 'desc')
        );
      } else {
        // For customer view - get user's orders
        q = query(
          ordersRef,
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
      }

      if (filter !== 'all') {
        q = query(q, where('status', '==', filter));
      }

      const querySnapshot = await getDocs(q);
      const ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setOrders(ordersData);
    } catch (error) {
      console.error('Error loading orders:', error);
      setError('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: new Date()
      });

      setOrders(orders.map(order =>
        order.id === orderId
          ? { ...order, status: newStatus }
          : order
      ));

      // Close order details if it was the selected order
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      setError('Failed to update order status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'processing':
        return 'text-blue-600 bg-blue-100';
      case 'shipped':
        return 'text-purple-600 bg-purple-100';
      case 'delivered':
        return 'text-green-600 bg-green-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return ClockIcon;
      case 'processing':
      case 'shipped':
        return TruckIcon;
      case 'delivered':
        return CheckCircleIcon;
      case 'cancelled':
        return XCircleIcon;
      default:
        return ClockIcon;
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">
          {isStore ? 'Store Orders' : 'My Orders'}
        </h2>
        <div className="flex space-x-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input"
          >
            <option value="all">All Orders</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <p>Loading orders...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-600">
          <p>{error}</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-8">
          <p>No orders found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map(order => (
            <div
              key={order.id}
              className="border rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedOrder(order)}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="font-medium">Order #{order.id.slice(-6)}</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm ${getStatusColor(order.status)}`}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Items</span>
                  <span>{order.items.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total</span>
                  <span className="font-medium">${order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-semibold">
                    Order #{selectedOrder.id.slice(-6)}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {formatDate(selectedOrder.createdAt)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>

              {/* Order Status */}
              <div className="mb-6">
                <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full ${getStatusColor(selectedOrder.status)}`}>
                  {React.createElement(getStatusIcon(selectedOrder.status), {
                    className: 'h-5 w-5'
                  })}
                  <span>{selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}</span>
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-6">
                <h4 className="font-medium mb-2">Items</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center border-b pb-2"
                    >
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-600">
                          Quantity: {item.quantity}
                        </p>
                      </div>
                      <p className="font-medium">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="mb-6">
                <h4 className="font-medium mb-2">Order Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>${selectedOrder.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Shipping</span>
                    <span>${selectedOrder.shipping.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax</span>
                    <span>${selectedOrder.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium pt-2 border-t">
                    <span>Total</span>
                    <span>${selectedOrder.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Shipping Information */}
              <div className="mb-6">
                <h4 className="font-medium mb-2">Shipping Information</h4>
                <div className="text-sm">
                  <p>{selectedOrder.shippingAddress.fullName}</p>
                  <p>{selectedOrder.shippingAddress.address}</p>
                  <p>
                    {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.postalCode}
                  </p>
                  <p>{selectedOrder.shippingAddress.country}</p>
                  <p>Phone: {selectedOrder.shippingAddress.phone}</p>
                  <p>Email: {selectedOrder.shippingAddress.email}</p>
                </div>
              </div>

              {/* Action Buttons (for store view) */}
              {isStore && selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' && (
                <div className="flex space-x-2">
                  {selectedOrder.status === 'pending' && (
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'processing')}
                      className="btn bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Process Order
                    </button>
                  )}
                  {selectedOrder.status === 'processing' && (
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'shipped')}
                      className="btn bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      Mark as Shipped
                    </button>
                  )}
                  {selectedOrder.status === 'shipped' && (
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'delivered')}
                      className="btn bg-green-600 hover:bg-green-700 text-white"
                    >
                      Mark as Delivered
                    </button>
                  )}
                  <button
                    onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled')}
                    className="btn bg-red-600 hover:bg-red-700 text-white"
                  >
                    Cancel Order
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManager;
