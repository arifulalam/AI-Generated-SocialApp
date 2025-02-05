import { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const LocationMarker = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position ? (
    <Marker position={position}>
      <Popup>Selected Location</Popup>
    </Marker>
  ) : null;
};

const MapPost = ({ user, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '', // restaurant, landmark, event_location, warning, etc.
    position: null,
    address: '',
    tags: [],
    rating: 0,
    privacy: 'public'
  });

  const [position, setPosition] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  const categories = [
    'Restaurant',
    'Landmark',
    'Event Location',
    'Warning',
    'Traffic Update',
    'Scenic Spot',
    'Shopping',
    'Service',
    'Emergency',
    'Other'
  ];

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
        },
        (error) => {
          console.error('Error getting location:', error);
          // Default to a central location if geolocation fails
          setUserLocation([23.8103, 90.4125]); // Default to Dhaka, Bangladesh
        }
      );
    }
  }, []);

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
    if (!position) {
      alert('Please select a location on the map');
      return;
    }

    setIsLoading(true);
    try {
      const postData = {
        ...formData,
        position: {
          lat: position.lat,
          lng: position.lng
        },
        type: 'map',
        authorId: user.uid,
        authorName: user.displayName,
        authorPhoto: user.photoURL,
        timestamp: serverTimestamp(),
        likes: [],
        comments: [],
        shares: 0
      };

      await addDoc(collection(db, 'posts'), postData);
      onClose();
    } catch (error) {
      console.error('Error creating map post:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!userLocation) {
    return <div>Loading map...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-4">
        <h3 className="text-indigo-600 font-semibold text-lg mb-2">Create Map Post</h3>
        <p className="text-indigo-500 text-sm">Share a location with your community</p>
      </div>

      {/* Map */}
      <div className="h-[400px] rounded-lg overflow-hidden border border-gray-200">
        <MapContainer
          center={userLocation}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <LocationMarker position={position} setPosition={setPosition} />
        </MapContainer>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="input"
            placeholder="Give your location a title"
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
          <label className="block text-sm font-medium text-gray-700">Privacy</label>
          <select
            name="privacy"
            value={formData.privacy}
            onChange={handleChange}
            required
            className="input"
          >
            <option value="public">Public</option>
            <option value="friends">Friends Only</option>
            <option value="private">Private</option>
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">Address</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="input"
            placeholder="Enter the address or location details"
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

        <div className="col-span-2">
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
                  className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-indigo-100 text-indigo-700"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 text-indigo-500 hover:text-indigo-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {['restaurant', 'landmark', 'scenic_spot'].includes(formData.category) && (
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">Rating</label>
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                  className={`text-2xl ${
                    star <= formData.rating ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

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
          disabled={isLoading || !position}
          className="btn bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {isLoading ? 'Creating Post...' : 'Create Post'}
        </button>
      </div>
    </form>
  );
};

export default MapPost;
