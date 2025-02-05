import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

export class PaymentService {
  static async processStripePayment(amount, currency = 'usd') {
    try {
      const stripe = await stripePromise;
      
      // Create a payment intent on your backend
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency,
        }),
      });

      const { clientSecret } = await response.json();

      // Confirm the payment with Stripe.js
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement('card'),
          billing_details: {
            name: 'Customer Name',
          },
        },
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      return result.paymentIntent;
    } catch (error) {
      console.error('Payment processing error:', error);
      throw error;
    }
  }

  static async processBkashPayment(amount, phoneNumber) {
    try {
      // Implement bKash payment integration
      const response = await fetch('/api/bkash/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          phoneNumber,
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message);
      }

      return result;
    } catch (error) {
      console.error('bKash payment error:', error);
      throw error;
    }
  }

  static async processNagadPayment(amount, phoneNumber) {
    try {
      // Implement Nagad payment integration
      const response = await fetch('/api/nagad/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          phoneNumber,
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message);
      }

      return result;
    } catch (error) {
      console.error('Nagad payment error:', error);
      throw error;
    }
  }

  static async processPayPalPayment(amount, currency = 'USD') {
    try {
      // Create PayPal order
      const response = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency,
        }),
      });

      const order = await response.json();

      // Handle the PayPal response
      if (!order.id) {
        throw new Error('Failed to create PayPal order');
      }

      return order;
    } catch (error) {
      console.error('PayPal payment error:', error);
      throw error;
    }
  }

  static async verifyPayment(paymentId, paymentMethod) {
    try {
      const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId,
          paymentMethod,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message);
      }

      return result;
    } catch (error) {
      console.error('Payment verification error:', error);
      throw error;
    }
  }

  static async refundPayment(paymentId, amount, reason) {
    try {
      const response = await fetch('/api/refund-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId,
          amount,
          reason,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message);
      }

      return result;
    } catch (error) {
      console.error('Refund processing error:', error);
      throw error;
    }
  }

  static async getPaymentMethods(userId) {
    try {
      const response = await fetch(`/api/payment-methods/${userId}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message);
      }

      return result.paymentMethods;
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      throw error;
    }
  }

  static async savePaymentMethod(userId, paymentMethod) {
    try {
      const response = await fetch('/api/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          paymentMethod,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message);
      }

      return result;
    } catch (error) {
      console.error('Error saving payment method:', error);
      throw error;
    }
  }

  static async deletePaymentMethod(userId, paymentMethodId) {
    try {
      const response = await fetch(`/api/payment-methods/${paymentMethodId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message);
      }

      return result;
    } catch (error) {
      console.error('Error deleting payment method:', error);
      throw error;
    }
  }
}
