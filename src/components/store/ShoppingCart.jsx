import { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { doc, updateDoc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { TrashIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline';

const ShoppingCart = ({ user, onClose }) => {
  const [cart, setCart] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedShipping, setSelectedShipping] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('');
  const [shippingAddress, setShippingAddress] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: ''
  });

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      const cartRef = doc(db, 'carts', user.uid);
      const cartDoc = await getDoc(cartRef);
      if (cartDoc.exists()) {
        const cartData = cartDoc.data();
        // Fetch product details for each item in cart
        const cartItemsWithDetails = await Promise.all(
          cartData.items.map(async (item) => {
            const productDoc = await getDoc(doc(db, 'products', item.productId));
            return {
              ...item,
              product: { id: productDoc.id, ...productDoc.data() }
            };
          })
        );
        setCart(cartItemsWithDetails);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
      setError('Failed to load cart items');
    }
  };

  const updateQuantity = async (productId, newQuantity) => {
    if (newQuantity < 1) return;

    try {
      const cartRef = doc(db, 'carts', user.uid);
      const updatedItems = cart.map(item => 
        item.product.id === productId
          ? { ...item, quantity: newQuantity }
          : item
      );

      await updateDoc(cartRef, { items: updatedItems });
      setCart(updatedItems);
    } catch (error) {
      console.error('Error updating quantity:', error);
      setError('Failed to update quantity');
    }
  };

  const removeItem = async (productId) => {
    try {
      const cartRef = doc(db, 'carts', user.uid);
      const updatedItems = cart.filter(item => item.product.id !== productId);
      await updateDoc(cartRef, { items: updatedItems });
      setCart(updatedItems);
    } catch (error) {
      console.error('Error removing item:', error);
      setError('Failed to remove item');
    }
  };

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const calculateShipping = () => {
    // Implement shipping calculation based on selected method and products
    return 0; // Placeholder
  };

  const calculateTax = () => {
    // Implement tax calculation based on location and products
    return calculateSubtotal() * 0.15; // 15% tax rate placeholder
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateShipping() + calculateTax();
  };

  const handleCheckout = async () => {
    if (!selectedShipping || !selectedPayment || !shippingAddress.fullName) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create order
      const orderData = {
        userId: user.uid,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
          name: item.product.name
        })),
        shippingAddress,
        shippingMethod: selectedShipping,
        paymentMethod: selectedPayment,
        subtotal: calculateSubtotal(),
        shipping: calculateShipping(),
        tax: calculateTax(),
        total: calculateTotal(),
        status: 'pending',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'orders'), orderData);

      // Clear cart
      await updateDoc(doc(db, 'carts', user.uid), { items: [] });
      setCart([]);
      onClose();
    } catch (error) {
      console.error('Error creating order:', error);
      setError('Failed to process order');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Shopping Cart</h3>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800"
          >
            ×
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Your cart is empty</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {/* Cart Items */}
            <div className="col-span-2 space-y-4">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center space-x-4 border rounded-lg p-4"
                >
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    className="w-20 h-20 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium">{item.product.name}</h4>
                    <p className="text-gray-600">${item.product.price}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                    >
                      <MinusIcon className="h-4 w-4" />
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removeItem(item.product.id)}
                      className="p-1 rounded-full bg-red-100 hover:bg-red-200 text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-4">Order Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>${calculateShipping().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>${calculateTax().toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 font-medium">
                    <div className="flex justify-between">
                      <span>Total</span>
                      <span>${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-4">Shipping Address</h4>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={shippingAddress.fullName}
                    onChange={(e) => setShippingAddress(prev => ({
                      ...prev,
                      fullName: e.target.value
                    }))}
                    className="input"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={shippingAddress.phone}
                    onChange={(e) => setShippingAddress(prev => ({
                      ...prev,
                      phone: e.target.value
                    }))}
                    className="input"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={shippingAddress.email}
                    onChange={(e) => setShippingAddress(prev => ({
                      ...prev,
                      email: e.target.value
                    }))}
                    className="input"
                  />
                  <input
                    type="text"
                    placeholder="Address"
                    value={shippingAddress.address}
                    onChange={(e) => setShippingAddress(prev => ({
                      ...prev,
                      address: e.target.value
                    }))}
                    className="input"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="City"
                      value={shippingAddress.city}
                      onChange={(e) => setShippingAddress(prev => ({
                        ...prev,
                        city: e.target.value
                      }))}
                      className="input"
                    />
                    <input
                      type="text"
                      placeholder="State/Province"
                      value={shippingAddress.state}
                      onChange={(e) => setShippingAddress(prev => ({
                        ...prev,
                        state: e.target.value
                      }))}
                      className="input"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Postal Code"
                      value={shippingAddress.postalCode}
                      onChange={(e) => setShippingAddress(prev => ({
                        ...prev,
                        postalCode: e.target.value
                      }))}
                      className="input"
                    />
                    <input
                      type="text"
                      placeholder="Country"
                      value={shippingAddress.country}
                      onChange={(e) => setShippingAddress(prev => ({
                        ...prev,
                        country: e.target.value
                      }))}
                      className="input"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Method */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-4">Shipping Method</h4>
                <select
                  value={selectedShipping}
                  onChange={(e) => setSelectedShipping(e.target.value)}
                  className="input"
                >
                  <option value="">Select Shipping Method</option>
                  <option value="standard">Standard Shipping</option>
                  <option value="express">Express Shipping</option>
                  <option value="international">International Shipping</option>
                </select>
              </div>

              {/* Payment Method */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-4">Payment Method</h4>
                <select
                  value={selectedPayment}
                  onChange={(e) => setSelectedPayment(e.target.value)}
                  className="input"
                >
                  <option value="">Select Payment Method</option>
                  <option value="stripe">Credit Card (Stripe)</option>
                  <option value="paypal">PayPal</option>
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="cod">Cash on Delivery</option>
                </select>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600">{error}</p>
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={isLoading || cart.length === 0}
                className="btn bg-blue-600 hover:bg-blue-700 text-white w-full"
              >
                {isLoading ? 'Processing...' : 'Checkout'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShoppingCart;
