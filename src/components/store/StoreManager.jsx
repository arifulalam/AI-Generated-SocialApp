import { useState } from 'react';
import { db, storage } from '../../config/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { PhotoIcon, MapPinIcon } from '@heroicons/react/24/outline';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const StoreManager = ({ user, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    phone: '',
    email: '',
    website: '',
    logo: null,
    coverImage: null,
    businessType: 'retail', // retail, wholesale, both
    paymentMethods: [],
    shippingMethods: [],
    taxRegistration: '',
    businessRegistration: '',
    status: 'pending', // pending, active, suspended
    rating: 0,
    reviews: [],
    followers: [],
    isVerified: false
  });

  const [images, setImages] = useState({
    logo: null,
    cover: null
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const categories = [
    'Fashion & Apparel',
    'Electronics & Gadgets',
    'Home & Living',
    'Health & Beauty',
    'Sports & Fitness',
    'Books & Stationery',
    'Toys & Games',
    'Food & Beverages',
    'Art & Crafts',
    'Automotive',
    'Pet Supplies',
    'Garden & Outdoor',
    'Office Supplies',
    'Musical Instruments',
    'Baby & Kids'
  ];

  const paymentOptions = [
    { id: 'stripe', name: 'Stripe (International)' },
    { id: 'paypal', name: 'PayPal (International)' },
    { id: 'bkash', name: 'bKash (Bangladesh)' },
    { id: 'nagad', name: 'Nagad (Bangladesh)' },
    { id: 'rocket', name: 'Rocket (Bangladesh)' },
    { id: 'bank_transfer', name: 'Bank Transfer' },
    { id: 'cash_on_delivery', name: 'Cash on Delivery' }
  ];

  const shippingOptions = [
    { id: 'dhl', name: 'DHL Express (International)' },
    { id: 'fedex', name: 'FedEx (International)' },
    { id: 'pathao', name: 'Pathao (Local)' },
    { id: 'steadfast', name: 'Steadfast (Local)' },
    { id: 'sundorban', name: 'Sundorban Courier (Local)' },
    { id: 'sa_poribahan', name: 'S.A Poribahan (Local)' },
    { id: 'store_pickup', name: 'Store Pickup' }
  ];

  const handleImageChange = async (e, imageType) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type and size
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!validTypes.includes(file.type)) {
        setError('Please upload a valid image file (JPEG, PNG, or WebP)');
        return;
      }

      if (file.size > maxSize) {
        setError('Image size should be less than 5MB');
        return;
      }

      setImages(prev => ({
        ...prev,
        [imageType]: URL.createObjectURL(file)
      }));
      setFormData(prev => ({
        ...prev,
        [imageType === 'logo' ? 'logo' : 'coverImage']: file
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDescriptionChange = (content) => {
    setFormData(prev => ({
      ...prev,
      description: content
    }));
  };

  const handlePaymentMethodChange = (e) => {
    const { value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      paymentMethods: checked
        ? [...prev.paymentMethods, value]
        : prev.paymentMethods.filter(method => method !== value)
    }));
  };

  const handleShippingMethodChange = (e) => {
    const { value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      shippingMethods: checked
        ? [...prev.shippingMethods, value]
        : prev.shippingMethods.filter(method => method !== value)
    }));
  };

  const validateStore = async (name) => {
    const storeRef = collection(db, 'stores');
    const q = query(storeRef, where('name', '==', name.toLowerCase()));
    const snapshot = await getDocs(q);
    return snapshot.empty;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate store name uniqueness
      const isNameAvailable = await validateStore(formData.name);
      if (!isNameAvailable) {
        setError('Store name is already taken. Please choose a different name.');
        setIsLoading(false);
        return;
      }

      // Upload images
      let logoUrl = '';
      let coverImageUrl = '';

      if (formData.logo) {
        const logoRef = ref(storage, `stores/${user.uid}/${Date.now()}_logo_${formData.logo.name}`);
        const logoSnapshot = await uploadBytes(logoRef, formData.logo);
        logoUrl = await getDownloadURL(logoSnapshot.ref);
      }

      if (formData.coverImage) {
        const coverRef = ref(storage, `stores/${user.uid}/${Date.now()}_cover_${formData.coverImage.name}`);
        const coverSnapshot = await uploadBytes(coverRef, formData.coverImage);
        coverImageUrl = await getDownloadURL(coverSnapshot.ref);
      }

      const storeData = {
        ...formData,
        name: formData.name.toLowerCase(),
        displayName: formData.name,
        logo: logoUrl,
        coverImage: coverImageUrl,
        ownerId: user.uid,
        ownerName: user.displayName,
        ownerPhoto: user.photoURL,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        products: [],
        orders: [],
        revenue: 0,
        status: 'pending',
        isVerified: false,
        rating: 0,
        reviews: [],
        followers: []
      };

      // Remove file objects
      delete storeData.logoFile;
      delete storeData.coverImageFile;

      await addDoc(collection(db, 'stores'), storeData);
      onClose();
    } catch (error) {
      console.error('Error creating store:', error);
      setError('Failed to create store. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
        <h3 className="text-blue-600 font-semibold text-lg mb-2">Create Your Store</h3>
        <p className="text-blue-500 text-sm">
          Start selling your products by creating your online store
        </p>
      </div>

      {/* Store Images */}
      <div className="space-y-4">
        {/* Cover Image */}
        <div className="relative h-48 bg-gray-100 rounded-lg overflow-hidden">
          {images.cover ? (
            <img
              src={images.cover}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <label className="cursor-pointer text-center">
                <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto" />
                <span className="mt-2 block text-sm text-gray-600">Upload Cover Photo</span>
                <input
                  type="file"
                  onChange={(e) => handleImageChange(e, 'cover')}
                  accept="image/*"
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {/* Logo */}
        <div className="relative -mt-16 ml-4">
          <div className="w-32 h-32 rounded-full border-4 border-white bg-gray-100 overflow-hidden">
            {images.logo ? (
              <img
                src={images.logo}
                alt="Logo"
                className="w-full h-full object-cover"
              />
            ) : (
              <label className="cursor-pointer flex items-center justify-center h-full">
                <div className="text-center">
                  <PhotoIcon className="h-8 w-8 text-gray-400 mx-auto" />
                  <span className="mt-1 block text-xs text-gray-600">Store Logo</span>
                </div>
                <input
                  type="file"
                  onChange={(e) => handleImageChange(e, 'logo')}
                  accept="image/*"
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">Store Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="input"
            placeholder="Enter your store name"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <ReactQuill
            value={formData.description}
            onChange={handleDescriptionChange}
            className="h-32 mb-12"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
            className="input"
          >
            <option value="">Select Category</option>
            {categories.map(category => (
              <option key={category} value={category.toLowerCase()}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Business Type</label>
          <select
            name="businessType"
            value={formData.businessType}
            onChange={handleChange}
            required
            className="input"
          >
            <option value="retail">Retail</option>
            <option value="wholesale">Wholesale</option>
            <option value="both">Both</option>
          </select>
        </div>
      </div>

      {/* Contact Information */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            className="input"
            placeholder="Contact phone number"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="input"
            placeholder="Business email"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">Website</label>
          <input
            type="url"
            name="website"
            value={formData.website}
            onChange={handleChange}
            className="input"
            placeholder="Store website (optional)"
          />
        </div>
      </div>

      {/* Address */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">Address</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
            className="input"
            placeholder="Street address"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">City</label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            required
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">State/Division</label>
          <input
            type="text"
            name="state"
            value={formData.state}
            onChange={handleChange}
            required
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Postal Code</label>
          <input
            type="text"
            name="postalCode"
            value={formData.postalCode}
            onChange={handleChange}
            required
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Country</label>
          <input
            type="text"
            name="country"
            value={formData.country}
            onChange={handleChange}
            required
            className="input"
          />
        </div>
      </div>

      {/* Payment Methods */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Payment Methods
        </label>
        <div className="grid grid-cols-2 gap-2">
          {paymentOptions.map(option => (
            <label key={option.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                value={option.id}
                checked={formData.paymentMethods.includes(option.id)}
                onChange={handlePaymentMethodChange}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{option.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Shipping Methods */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Shipping Methods
        </label>
        <div className="grid grid-cols-2 gap-2">
          {shippingOptions.map(option => (
            <label key={option.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                value={option.id}
                checked={formData.shippingMethods.includes(option.id)}
                onChange={handleShippingMethodChange}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{option.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Business Registration */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Business Registration Number
          </label>
          <input
            type="text"
            name="businessRegistration"
            value={formData.businessRegistration}
            onChange={handleChange}
            className="input"
            placeholder="Optional"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Tax Registration Number
          </label>
          <input
            type="text"
            name="taxRegistration"
            value={formData.taxRegistration}
            onChange={handleChange}
            className="input"
            placeholder="Optional"
          />
        </div>
      </div>

      {/* Error Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Submit Buttons */}
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onClose}
          className="btn bg-gray-100 hover:bg-gray-200 text-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="btn bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isLoading ? 'Creating Store...' : 'Create Store'}
        </button>
      </div>
    </form>
  );
};

export default StoreManager;
