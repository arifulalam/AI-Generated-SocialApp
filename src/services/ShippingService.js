import { db } from '../config/firebase';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';

export class ShippingService {
  // Supported carriers and their base rates
  static carriers = {
    'fedex': {
      name: 'FedEx',
      services: {
        'ground': { name: 'Ground', baseRate: 5.99 },
        'express': { name: '2-Day Express', baseRate: 12.99 },
        'priority': { name: 'Priority Overnight', baseRate: 24.99 }
      }
    },
    'ups': {
      name: 'UPS',
      services: {
        'ground': { name: 'Ground', baseRate: 6.99 },
        'express': { name: '2-Day Air', baseRate: 14.99 },
        'priority': { name: 'Next Day Air', baseRate: 26.99 }
      }
    },
    'dhl': {
      name: 'DHL',
      services: {
        'ground': { name: 'Ground', baseRate: 7.99 },
        'express': { name: 'Express', baseRate: 15.99 },
        'priority': { name: 'Priority', baseRate: 27.99 }
      }
    },
    'pathao': {
      name: 'Pathao',
      services: {
        'regular': { name: 'Regular Delivery', baseRate: 2.99 },
        'express': { name: 'Express Delivery', baseRate: 4.99 }
      }
    },
    'steadfast': {
      name: 'Steadfast',
      services: {
        'regular': { name: 'Regular Delivery', baseRate: 2.49 },
        'express': { name: 'Express Delivery', baseRate: 4.49 }
      }
    }
  };

  static async calculateShippingRates(orderDetails) {
    const {
      items,
      shippingAddress,
      storeAddress,
      preferredCarrier = null
    } = orderDetails;

    try {
      // Calculate total weight and dimensions
      const totalWeight = items.reduce((sum, item) => sum + (item.weight || 0) * item.quantity, 0);
      const totalVolume = items.reduce((sum, item) => {
        const volume = (item.dimensions?.length || 0) *
                      (item.dimensions?.width || 0) *
                      (item.dimensions?.height || 0);
        return sum + volume * item.quantity;
      }, 0);

      // Calculate distance-based rate using coordinates
      const distance = await this.calculateDistance(storeAddress, shippingAddress);
      
      // Get available rates from all carriers or specific carrier
      const rates = [];
      const carriersToCheck = preferredCarrier 
        ? { [preferredCarrier]: this.carriers[preferredCarrier] }
        : this.carriers;

      for (const [carrierId, carrier] of Object.entries(carriersToCheck)) {
        for (const [serviceId, service] of Object.entries(carrier.services)) {
          // Calculate final rate based on multiple factors
          const rate = this.calculateRate({
            baseRate: service.baseRate,
            weight: totalWeight,
            volume: totalVolume,
            distance,
            service: serviceId
          });

          rates.push({
            carrierId,
            carrierName: carrier.name,
            serviceId,
            serviceName: service.name,
            rate,
            estimatedDays: this.getEstimatedDeliveryDays(serviceId),
          });
        }
      }

      return rates.sort((a, b) => a.rate - b.rate);
    } catch (error) {
      console.error('Error calculating shipping rates:', error);
      throw error;
    }
  }

  static calculateRate({ baseRate, weight, volume, distance, service }) {
    // Weight factor
    const weightRate = weight * 0.1; // $0.10 per unit weight

    // Volume factor
    const volumeRate = volume * 0.01; // $0.01 per cubic unit

    // Distance factor
    const distanceRate = distance * 0.05; // $0.05 per km

    // Service multiplier
    const serviceMultiplier = service.includes('priority') ? 2 :
                             service.includes('express') ? 1.5 :
                             1;

    // Calculate final rate
    const rate = (baseRate + weightRate + volumeRate + distanceRate) * serviceMultiplier;

    return Math.round(rate * 100) / 100; // Round to 2 decimal places
  }

  static async calculateDistance(origin, destination) {
    try {
      // In a real implementation, this would use a mapping service API
      // For now, return a mock distance based on coordinates
      const lat1 = origin.latitude;
      const lon1 = origin.longitude;
      const lat2 = destination.latitude;
      const lon2 = destination.longitude;

      const R = 6371; // Earth's radius in km
      const dLat = this.deg2rad(lat2 - lat1);
      const dLon = this.deg2rad(lon2 - lon1);
      const a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;

      return distance;
    } catch (error) {
      console.error('Error calculating distance:', error);
      return 10; // Default to 10km if calculation fails
    }
  }

  static deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  static getEstimatedDeliveryDays(service) {
    switch (service) {
      case 'priority':
        return { min: 1, max: 2 };
      case 'express':
        return { min: 2, max: 3 };
      case 'ground':
      case 'regular':
        return { min: 3, max: 5 };
      default:
        return { min: 3, max: 7 };
    }
  }

  static async createShipment(orderDetails) {
    try {
      const shipment = {
        orderId: orderDetails.orderId,
        carrier: orderDetails.carrier,
        service: orderDetails.service,
        trackingNumber: this.generateTrackingNumber(),
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        estimatedDelivery: this.calculateEstimatedDelivery(orderDetails.service),
        origin: orderDetails.storeAddress,
        destination: orderDetails.shippingAddress,
        items: orderDetails.items,
        weight: orderDetails.weight,
        dimensions: orderDetails.dimensions,
        cost: orderDetails.shippingCost,
        events: [{
          status: 'pending',
          location: orderDetails.storeAddress.city,
          timestamp: new Date(),
          description: 'Shipment created'
        }]
      };

      const docRef = await addDoc(collection(db, 'shipments'), shipment);
      return { ...shipment, id: docRef.id };
    } catch (error) {
      console.error('Error creating shipment:', error);
      throw error;
    }
  }

  static generateTrackingNumber() {
    const prefix = 'TRACK';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  static calculateEstimatedDelivery(service) {
    const days = this.getEstimatedDeliveryDays(service);
    const date = new Date();
    date.setDate(date.getDate() + days.max);
    return date;
  }

  static async updateShipmentStatus(shipmentId, status, location, description) {
    try {
      const shipmentRef = doc(db, 'shipments', shipmentId);
      const event = {
        status,
        location,
        timestamp: new Date(),
        description
      };

      await updateDoc(shipmentRef, {
        status,
        updatedAt: new Date(),
        events: firebase.firestore.FieldValue.arrayUnion(event)
      });
    } catch (error) {
      console.error('Error updating shipment status:', error);
      throw error;
    }
  }

  static async getShipmentsByOrder(orderId) {
    try {
      const shipmentsRef = collection(db, 'shipments');
      const q = query(shipmentsRef, where('orderId', '==', orderId));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting shipments:', error);
      throw error;
    }
  }

  static async validateAddress(address) {
    try {
      // In a real implementation, this would use an address validation service
      const required = ['street', 'city', 'state', 'postalCode', 'country'];
      const missing = required.filter(field => !address[field]);

      if (missing.length > 0) {
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
      }

      // Mock validation result
      return {
        isValid: true,
        standardized: {
          street: address.street.toUpperCase(),
          city: address.city.toUpperCase(),
          state: address.state.toUpperCase(),
          postalCode: address.postalCode,
          country: address.country.toUpperCase()
        }
      };
    } catch (error) {
      console.error('Error validating address:', error);
      throw error;
    }
  }
}
