import { useState, useEffect } from 'react';
import { ShippingService } from '../../services/ShippingService';
import {
  TruckIcon,
  MapPinIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const ShippingManager = ({ order, store, onShippingSelect }) => {
  const [shippingRates, setShippingRates] = useState([]);
  const [selectedRate, setSelectedRate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shipment, setShipment] = useState(null);
  const [isAddressValid, setIsAddressValid] = useState(true);
  const [standardizedAddress, setStandardizedAddress] = useState(null);

  useEffect(() => {
    if (order?.shippingAddress) {
      validateAddress();
      calculateRates();
    }
  }, [order]);

  const validateAddress = async () => {
    try {
      const result = await ShippingService.validateAddress(order.shippingAddress);
      setIsAddressValid(result.isValid);
      setStandardizedAddress(result.standardized);
    } catch (error) {
      console.error('Error validating address:', error);
      setIsAddressValid(false);
    }
  };

  const calculateRates = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const rates = await ShippingService.calculateShippingRates({
        items: order.items,
        shippingAddress: order.shippingAddress,
        storeAddress: store.address,
        preferredCarrier: store.preferredCarrier
      });

      setShippingRates(rates);
      
      // Select the cheapest rate by default
      if (rates.length > 0 && !selectedRate) {
        handleRateSelect(rates[0]);
      }
    } catch (error) {
      console.error('Error calculating shipping rates:', error);
      setError('Failed to calculate shipping rates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRateSelect = (rate) => {
    setSelectedRate(rate);
    onShippingSelect(rate);
  };

  const createShipment = async () => {
    if (!selectedRate || !isAddressValid) return;

    try {
      const shipmentDetails = {
        orderId: order.id,
        carrier: selectedRate.carrierId,
        service: selectedRate.serviceId,
        storeAddress: store.address,
        shippingAddress: standardizedAddress || order.shippingAddress,
        items: order.items,
        weight: order.items.reduce((sum, item) => sum + (item.weight || 0) * item.quantity, 0),
        dimensions: {
          length: Math.max(...order.items.map(item => item.dimensions?.length || 0)),
          width: Math.max(...order.items.map(item => item.dimensions?.width || 0)),
          height: Math.max(...order.items.map(item => item.dimensions?.height || 0))
        },
        shippingCost: selectedRate.rate
      };

      const newShipment = await ShippingService.createShipment(shipmentDetails);
      setShipment(newShipment);
    } catch (error) {
      console.error('Error creating shipment:', error);
      setError('Failed to create shipment');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered':
        return 'text-green-600 bg-green-100';
      case 'in_transit':
        return 'text-blue-600 bg-blue-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Address Validation */}
      {!isAddressValid && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <XCircleIcon className="h-5 w-5 text-red-500" />
            <span className="text-red-700">Invalid shipping address</span>
          </div>
          <p className="mt-1 text-sm text-red-600">
            Please verify the shipping address and try again.
          </p>
        </div>
      )}

      {/* Shipping Rates */}
      {isLoading ? (
        <div className="text-center py-8">
          <ArrowPathIcon className="h-8 w-8 text-blue-500 animate-spin mx-auto" />
          <p className="mt-2">Calculating shipping rates...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-600">
          <p>{error}</p>
          <button
            onClick={calculateRates}
            className="mt-2 btn bg-red-100 hover:bg-red-200 text-red-700"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {shippingRates.map((rate) => (
            <div
              key={`${rate.carrierId}-${rate.serviceId}`}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedRate?.carrierId === rate.carrierId &&
                selectedRate?.serviceId === rate.serviceId
                  ? 'border-blue-500 bg-blue-50'
                  : 'hover:border-gray-300'
              }`}
              onClick={() => handleRateSelect(rate)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <TruckIcon className="h-6 w-6 text-gray-600" />
                  <div>
                    <h3 className="font-medium">{rate.carrierName}</h3>
                    <p className="text-sm text-gray-600">{rate.serviceName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">${rate.rate.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">
                    {rate.estimatedDays.min}-{rate.estimatedDays.max} days
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Shipment Details */}
      {shipment && (
        <div className="border rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Shipment Details</h3>
            <div className={`px-3 py-1 rounded-full text-sm ${getStatusColor(shipment.status)}`}>
              {shipment.status.charAt(0).toUpperCase() + shipment.status.slice(1)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Tracking Number</p>
              <p className="font-medium">{shipment.trackingNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Carrier</p>
              <p className="font-medium">
                {shipment.carrier} - {shipment.service}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-600">Shipping Events</p>
            <div className="space-y-4">
              {shipment.events.map((event, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className={`p-2 rounded-full ${getStatusColor(event.status)}`}>
                    {event.status === 'delivered' ? (
                      <CheckCircleIcon className="h-5 w-5" />
                    ) : event.status === 'in_transit' ? (
                      <TruckIcon className="h-5 w-5" />
                    ) : event.status === 'pending' ? (
                      <ClockIcon className="h-5 w-5" />
                    ) : (
                      <MapPinIcon className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{event.description}</p>
                    <p className="text-sm text-gray-600">{event.location}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(event.timestamp.toDate()).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {selectedRate && !shipment && (
        <div className="flex justify-end">
          <button
            onClick={createShipment}
            disabled={!isAddressValid}
            className="btn bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300"
          >
            Create Shipment
          </button>
        </div>
      )}
    </div>
  );
};

export default ShippingManager;
