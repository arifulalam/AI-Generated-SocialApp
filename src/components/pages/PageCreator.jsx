import { useState } from 'react';
import { db, storage } from '../../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { PhotoIcon, GlobeAltIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const PageCreator = ({ user, onClose, type = 'page' }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    profileImage: null,
    coverImage: null,
    privacy: 'public', // public, private, closed
    location: '',
    website: '',
    email: '',
    phone: '',
    rules: '',
    isVerified: false
  });

  const [images, setImages] = useState({
    profile: null,
    cover: null
  });

  const [isLoading, setIsLoading] = useState(false);

  const categories = type === 'page' ? [
    'Author',
    'Book',
    'Business',
    'Organization',
    'Education',
    'Entertainment',
    'Cause',
    'Community',
    'Brand',
    'Event Organizer'
  ] : [
    'Community',
    'Club',
    'Support',
    'Learning',
    'Business',
    'Gaming',
    'Hobby',
    'Sports',
    'Professional',
    'Social'
  ];

  const handleImageChange = async (e, imageType) => {
    const file = e.target.files[0];
    if (file) {
      setImages(prev => ({
        ...prev,
        [imageType]: URL.createObjectURL(file)
      }));
      setFormData(prev => ({
        ...prev,
        [imageType === 'profile' ? 'profileImage' : 'coverImage']: file
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

  const handleRulesChange = (content) => {
    setFormData(prev => ({
      ...prev,
      rules: content
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Upload images
      let profileImageUrl = '';
      let coverImageUrl = '';

      if (formData.profileImage) {
        const profileRef = ref(storage, `${type}s/${user.uid}/${Date.now()}_profile_${formData.profileImage.name}`);
        const profileSnapshot = await uploadBytes(profileRef, formData.profileImage);
        profileImageUrl = await getDownloadURL(profileSnapshot.ref);
      }

      if (formData.coverImage) {
        const coverRef = ref(storage, `${type}s/${user.uid}/${Date.now()}_cover_${formData.coverImage.name}`);
        const coverSnapshot = await uploadBytes(coverRef, formData.coverImage);
        coverImageUrl = await getDownloadURL(coverSnapshot.ref);
      }

      const pageData = {
        ...formData,
        type,
        profileImage: profileImageUrl,
        coverImage: coverImageUrl,
        creatorId: user.uid,
        creatorName: user.displayName,
        creatorPhoto: user.photoURL,
        timestamp: serverTimestamp(),
        members: [user.uid],
        admins: [user.uid],
        followers: [],
        posts: [],
        events: [],
        status: 'active'
      };

      // Remove file objects
      delete pageData.profileImageFile;
      delete pageData.coverImageFile;

      await addDoc(collection(db, type === 'page' ? 'pages' : 'groups'), pageData);
      onClose();
    } catch (error) {
      console.error(`Error creating ${type}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className={`bg-${type === 'page' ? 'purple' : 'green'}-50 border border-${type === 'page' ? 'purple' : 'green'}-100 rounded-lg p-4 mb-4`}>
        <h3 className={`text-${type === 'page' ? 'purple' : 'green'}-600 font-semibold text-lg mb-2`}>
          Create {type === 'page' ? 'Page' : 'Group'}
        </h3>
        <p className={`text-${type === 'page' ? 'purple' : 'green'}-500 text-sm`}>
          {type === 'page' 
            ? 'Create a page to promote your brand, organization, or cause'
            : 'Create a group to build a community around shared interests'
          }
        </p>
      </div>

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

      {/* Profile Image */}
      <div className="relative -mt-16 ml-4">
        <div className="w-32 h-32 rounded-full border-4 border-white bg-gray-100 overflow-hidden">
          {images.profile ? (
            <img
              src={images.profile}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <label className="cursor-pointer flex items-center justify-center h-full">
              <div className="text-center">
                <PhotoIcon className="h-8 w-8 text-gray-400 mx-auto" />
                <span className="mt-1 block text-xs text-gray-600">Profile Photo</span>
              </div>
              <input
                type="file"
                onChange={(e) => handleImageChange(e, 'profile')}
                accept="image/*"
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            {type === 'page' ? 'Page Name' : 'Group Name'}
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="input"
            placeholder={`Enter ${type} name`}
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
            <option value="private">Private</option>
            {type === 'group' && <option value="closed">Closed</option>}
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">Location</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            className="input"
            placeholder="Location (optional)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Website</label>
          <div className="mt-1 relative">
            <GlobeAltIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="url"
              name="website"
              value={formData.website}
              onChange={handleChange}
              className="input pl-10"
              placeholder="Website URL (optional)"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="input"
            placeholder="Contact email (optional)"
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

        {type === 'group' && (
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">Group Rules</label>
            <ReactQuill
              value={formData.rules}
              onChange={handleRulesChange}
              className="h-32 mb-12"
            />
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
          disabled={isLoading}
          className={`btn bg-${type === 'page' ? 'purple' : 'green'}-600 hover:bg-${type === 'page' ? 'purple' : 'green'}-700 text-white`}
        >
          {isLoading ? `Creating ${type}...` : `Create ${type}`}
        </button>
      </div>
    </form>
  );
};

export default PageCreator;
