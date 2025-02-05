import { useState } from 'react';
import { db, storage } from '../../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { MapPinIcon, CalendarIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const EventPost = ({ user, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    location: '',
    venue: '',
    category: '', // conference, meetup, concert, fundraiser, etc.
    ticketPrice: '0',
    isFree: true,
    isFundraiser: false,
    fundraiserGoal: '',
    coverImage: null,
    maxAttendees: '',
    isOnline: false,
    meetingLink: '',
    organizer: user.displayName,
    organizerEmail: user.email,
    contactPhone: ''
  });

  const [coverImagePreview, setCoverImagePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const eventCategories = [
    'Conference',
    'Meetup',
    'Workshop',
    'Concert',
    'Exhibition',
    'Fundraiser',
    'Sports',
    'Cultural',
    'Educational',
    'Other'
  ];

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    
    if (type === 'file') {
      if (files[0]) {
        setFormData(prev => ({ ...prev, [name]: files[0] }));
        setCoverImagePreview(URL.createObjectURL(files[0]));
      }
    } else if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDescriptionChange = (content) => {
    setFormData(prev => ({ ...prev, description: content }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let coverImageUrl = '';
      if (formData.coverImage) {
        const imageRef = ref(storage, `events/${user.uid}/${Date.now()}_${formData.coverImage.name}`);
        const snapshot = await uploadBytes(imageRef, formData.coverImage);
        coverImageUrl = await getDownloadURL(snapshot.ref);
      }

      const eventData = {
        ...formData,
        coverImage: coverImageUrl,
        type: 'event',
        authorId: user.uid,
        authorName: user.displayName,
        authorPhoto: user.photoURL,
        timestamp: serverTimestamp(),
        attendees: [],
        interested: [],
        donations: formData.isFundraiser ? [] : undefined,
        totalDonations: formData.isFundraiser ? 0 : undefined,
        status: 'upcoming'
      };

      delete eventData.coverImageFile;

      await addDoc(collection(db, 'posts'), eventData);
      onClose();
    } catch (error) {
      console.error('Error creating event:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
        <h3 className="text-blue-600 font-semibold text-lg mb-2">Create Event</h3>
        <p className="text-blue-500 text-sm">Share your upcoming event with the community</p>
      </div>

      {/* Cover Image Upload */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
        {coverImagePreview ? (
          <div className="relative">
            <img
              src={coverImagePreview}
              alt="Event cover"
              className="w-full h-48 object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={() => {
                setFormData(prev => ({ ...prev, coverImage: null }));
                setCoverImagePreview(null);
              }}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
            >
              ×
            </button>
          </div>
        ) : (
          <div>
            <input
              type="file"
              name="coverImage"
              onChange={handleChange}
              accept="image/*"
              className="hidden"
              id="coverImage"
            />
            <label
              htmlFor="coverImage"
              className="cursor-pointer text-blue-500 hover:text-blue-600"
            >
              Upload Cover Image
            </label>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">Event Title</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="input"
            placeholder="Give your event a name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Start Date & Time</label>
          <div className="mt-1 relative">
            <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="datetime-local"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              required
              className="input pl-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">End Date & Time</label>
          <div className="mt-1 relative">
            <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="datetime-local"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              required
              className="input pl-10"
            />
          </div>
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
            {eventCategories.map(category => (
              <option key={category} value={category.toLowerCase()}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Max Attendees</label>
          <input
            type="number"
            name="maxAttendees"
            value={formData.maxAttendees}
            onChange={handleChange}
            min="1"
            className="input"
            placeholder="Leave empty for unlimited"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">Venue</label>
          <div className="mt-1 relative">
            <MapPinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              name="venue"
              value={formData.venue}
              onChange={handleChange}
              required={!formData.isOnline}
              className="input pl-10"
              placeholder="Event venue name"
            />
          </div>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">Location</label>
          <div className="mt-1 relative">
            <MapPinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required={!formData.isOnline}
              className="input pl-10"
              placeholder="Full address"
            />
          </div>
        </div>

        <div className="col-span-2">
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="isOnline"
                checked={formData.isOnline}
                onChange={handleChange}
                className="form-checkbox h-4 w-4 text-blue-600"
              />
              <span className="ml-2 text-sm text-gray-700">Online Event</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                name="isFree"
                checked={formData.isFree}
                onChange={handleChange}
                className="form-checkbox h-4 w-4 text-blue-600"
              />
              <span className="ml-2 text-sm text-gray-700">Free Event</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                name="isFundraiser"
                checked={formData.isFundraiser}
                onChange={handleChange}
                className="form-checkbox h-4 w-4 text-blue-600"
              />
              <span className="ml-2 text-sm text-gray-700">Fundraiser Event</span>
            </label>
          </div>
        </div>

        {formData.isOnline && (
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">Meeting Link</label>
            <input
              type="url"
              name="meetingLink"
              value={formData.meetingLink}
              onChange={handleChange}
              required={formData.isOnline}
              className="input"
              placeholder="Online meeting link"
            />
          </div>
        )}

        {!formData.isFree && (
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">Ticket Price</label>
            <div className="mt-1 relative">
              <CurrencyDollarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="number"
                name="ticketPrice"
                value={formData.ticketPrice}
                onChange={handleChange}
                required={!formData.isFree}
                min="0"
                step="0.01"
                className="input pl-10"
              />
            </div>
          </div>
        )}

        {formData.isFundraiser && (
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">Fundraising Goal</label>
            <div className="mt-1 relative">
              <CurrencyDollarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="number"
                name="fundraiserGoal"
                value={formData.fundraiserGoal}
                onChange={handleChange}
                required={formData.isFundraiser}
                min="0"
                step="0.01"
                className="input pl-10"
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Event Description</label>
        <ReactQuill
          value={formData.description}
          onChange={handleDescriptionChange}
          className="h-48 mb-12"
        />
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
          disabled={isLoading}
          className="btn bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isLoading ? 'Creating Event...' : 'Create Event'}
        </button>
      </div>
    </form>
  );
};

export default EventPost;
