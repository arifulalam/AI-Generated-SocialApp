import { useState, useRef } from 'react';
import { db, storage } from '../../config/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { PhotoIcon, TrashIcon } from '@heroicons/react/24/outline';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const ProductManager = ({ user, storeId, onClose, editProduct = null }) => {
  const [formData, setFormData] = useState({
    name: editProduct?.name || '',
    description: editProduct?.description || '',
    category: editProduct?.category || '',
    price: editProduct?.price || '',
    comparePrice: editProduct?.comparePrice || '',
    cost: editProduct?.cost || '',
    sku: editProduct?.sku || '',
    barcode: editProduct?.barcode || '',
    quantity: editProduct?.quantity || 0,
    weight: editProduct?.weight || '',
    unit: editProduct?.unit || 'piece',
    images: editProduct?.images || [],
    variants: editProduct?.variants || [],
    tags: editProduct?.tags || [],
    isPublished: editProduct?.isPublished || false,
    isFeatured: editProduct?.isFeatured || false,
    specifications: editProduct?.specifications || {},
    shippingInfo: editProduct?.shippingInfo || {
      width: '',
      height: '',
      length: '',
      weight: '',
      freeShipping: false,
      shippingClass: 'standard'
    }
  });

  const [images, setImages] = useState(editProduct?.images || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

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

  const units = [
    'piece',
    'kg',
    'gram',
    'meter',
    'liter',
    'pack',
    'pair',
    'set',
    'box'
  ];

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    setIsLoading(true);
    setError(null);

    try {
      // Validate file types and sizes
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      for (const file of files) {
        if (!validTypes.includes(file.type)) {
          throw new Error('Please upload valid image files (JPEG, PNG, or WebP)');
        }
        if (file.size > maxSize) {
          throw new Error('Image size should be less than 5MB');
        }
      }

      const uploadPromises = files.map(async (file) => {
        const storageRef = ref(storage, `products/${storeId}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        return { url, name: file.name };
      });

      const uploadedImages = await Promise.all(uploadPromises);
      setImages([...images, ...uploadedImages]);
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedImages.map(img => img.url)]
      }));
    } catch (error) {
      console.error('Error uploading images:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleDescriptionChange = (content) => {
    setFormData(prev => ({
      ...prev,
      description: content
    }));
  };

  const handleTagInput = (e) => {
    if (e.key === 'Enter' && e.target.value) {
      e.preventDefault();
      const newTag = e.target.value.trim();
      if (newTag && !formData.tags.includes(newTag)) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, newTag]
        }));
      }
      e.target.value = '';
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const productData = {
        ...formData,
        storeId,
        updatedAt: serverTimestamp(),
        price: parseFloat(formData.price),
        comparePrice: formData.comparePrice ? parseFloat(formData.comparePrice) : null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        quantity: parseInt(formData.quantity),
      };

      if (editProduct) {
        // Update existing product
        const productRef = doc(db, 'products', editProduct.id);
        await updateDoc(productRef, productData);
      } else {
        // Create new product
        productData.createdAt = serverTimestamp();
        productData.createdBy = user.uid;
        await addDoc(collection(db, 'products'), productData);
      }

      onClose();
    } catch (error) {
      console.error('Error saving product:', error);
      setError('Failed to save product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
        <h3 className="text-blue-600 font-semibold text-lg mb-2">
          {editProduct ? 'Edit Product' : 'Add New Product'}
        </h3>
        <p className="text-blue-500 text-sm">
          {editProduct ? 'Update your product information' : 'Create a new product listing'}
        </p>
      </div>

      {/* Basic Information */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">Product Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="input"
            placeholder="Enter product name"
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
          <label className="block text-sm font-medium text-gray-700">Unit</label>
          <select
            name="unit"
            value={formData.unit}
            onChange={handleChange}
            required
            className="input"
          >
            {units.map(unit => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pricing */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Price</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
              $
            </span>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              className="input pl-7"
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Compare Price</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
              $
            </span>
            <input
              type="number"
              name="comparePrice"
              value={formData.comparePrice}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="input pl-7"
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Cost per item</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
              $
            </span>
            <input
              type="number"
              name="cost"
              value={formData.cost}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="input pl-7"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      {/* Inventory */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">SKU</label>
          <input
            type="text"
            name="sku"
            value={formData.sku}
            onChange={handleChange}
            className="input"
            placeholder="Stock Keeping Unit"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Barcode</label>
          <input
            type="text"
            name="barcode"
            value={formData.barcode}
            onChange={handleChange}
            className="input"
            placeholder="Product barcode"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Quantity</label>
          <input
            type="number"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            required
            min="0"
            className="input"
            placeholder="Available quantity"
          />
        </div>
      </div>

      {/* Images */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Product Images
        </label>
        <div className="grid grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <img
                src={image.url || image}
                alt={`Product ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
          {images.length < 8 && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-center">
              <label className="cursor-pointer text-center">
                <PhotoIcon className="h-8 w-8 text-gray-400 mx-auto" />
                <span className="mt-2 block text-sm text-gray-600">Add Image</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Tags</label>
        <div className="mt-1">
          <input
            type="text"
            onKeyPress={handleTagInput}
            className="input"
            placeholder="Type tag and press Enter"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {formData.tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-blue-100 text-blue-700"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 text-blue-500 hover:text-blue-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Shipping Information */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Shipping Information</h4>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-600">Width (cm)</label>
            <input
              type="number"
              name="shippingInfo.width"
              value={formData.shippingInfo.width}
              onChange={handleChange}
              min="0"
              step="0.1"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600">Height (cm)</label>
            <input
              type="number"
              name="shippingInfo.height"
              value={formData.shippingInfo.height}
              onChange={handleChange}
              min="0"
              step="0.1"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600">Length (cm)</label>
            <input
              type="number"
              name="shippingInfo.length"
              value={formData.shippingInfo.length}
              onChange={handleChange}
              min="0"
              step="0.1"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600">Weight (kg)</label>
            <input
              type="number"
              name="shippingInfo.weight"
              value={formData.shippingInfo.weight}
              onChange={handleChange}
              min="0"
              step="0.1"
              className="input"
            />
          </div>
        </div>
        <div className="mt-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="shippingInfo.freeShipping"
              checked={formData.shippingInfo.freeShipping}
              onChange={handleChange}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Free Shipping</span>
          </label>
        </div>
      </div>

      {/* Publishing Options */}
      <div className="flex items-center space-x-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="isPublished"
            checked={formData.isPublished}
            onChange={handleChange}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Publish Product</span>
        </label>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="isFeatured"
            checked={formData.isFeatured}
            onChange={handleChange}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Feature Product</span>
        </label>
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
          {isLoading ? 'Saving...' : editProduct ? 'Update Product' : 'Add Product'}
        </button>
      </div>
    </form>
  );
};

export default ProductManager;
