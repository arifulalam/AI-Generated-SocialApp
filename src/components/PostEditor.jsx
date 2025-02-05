import React from 'react';
import { useState, useRef } from 'react';
import { storage, db } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import {
  PhotoIcon,
  VideoCameraIcon,
  MapPinIcon,
  LinkIcon,
  DocumentTextIcon,
  HeartIcon,
  UserGroupIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { validateContent } from '../services/contentModeration';
import BloodDonationPost from './posts/BloodDonationPost';
import EventPost from './posts/EventPost';
import MapPost from './posts/MapPost';
import PageCreator from './pages/PageCreator';

const PostEditor = ({ user, onClose }) => {
  const [postType, setPostType] = useState('text'); // text, media, link, map, blood, event, page, group
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [media, setMedia] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [privacy, setPrivacy] = useState('public');
  const [error, setError] = useState(null);
  const [link, setLink] = useState('');
  const [linkPreview, setLinkPreview] = useState(null);
  const fileInputRef = useRef(null);

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
      ['link', 'image'],
      ['clean']
    ],
  };

  const postTypes = [
    { id: 'text', icon: DocumentTextIcon, label: 'Text Post' },
    { id: 'media', icon: PhotoIcon, label: 'Media Post' },
    { id: 'link', icon: LinkIcon, label: 'Link Post' },
    { id: 'map', icon: MapPinIcon, label: 'Map Post' },
    { id: 'blood', icon: HeartIcon, label: 'Blood Donation' },
    { id: 'event', icon: CalendarIcon, label: 'Event' },
    { id: 'page', icon: UserGroupIcon, label: 'Create Page' },
    { id: 'group', icon: UserGroupIcon, label: 'Create Group' }
  ];

  const handleMediaUpload = async (e) => {
    const files = Array.from(e.target.files);
    setIsLoading(true);
    setError(null);

    try {
      const contentCheck = await validateContent({ media: files });
      if (!contentCheck.safe) {
        setError(contentCheck.issues.join('\n'));
        return;
      }

      const uploadPromises = files.map(async (file) => {
        const storageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        return {
          url,
          type: file.type.startsWith('image/') ? 'image' : 'video',
          name: file.name
        };
      });

      const uploadedMedia = await Promise.all(uploadPromises);
      setMedia([...media, ...uploadedMedia]);
    } catch (error) {
      console.error('Error uploading media:', error);
      setError('Failed to upload media. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkPreview = async () => {
    if (!link) return;

    try {
      // You would typically call an API to get link preview data
      // For now, we'll just create a basic preview
      setLinkPreview({
        title: 'Link Preview',
        description: 'Link preview description',
        image: null,
        url: link
      });
    } catch (error) {
      console.error('Error fetching link preview:', error);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && media.length === 0 && !link) return;

    setIsLoading(true);
    setError(null);

    try {
      const contentCheck = await validateContent({
        text: content,
        media: []  // Media is already validated during upload
      });

      if (!contentCheck.safe) {
        setError(contentCheck.issues.join('\n'));
        setIsLoading(false);
        return;
      }

      const postData = {
        content,
        media,
        authorId: user.uid,
        authorName: user.displayName,
        authorPhoto: user.photoURL,
        timestamp: serverTimestamp(),
        privacy,
        likes: [],
        comments: [],
        shares: 0,
        type: postType,
        ...(link && { link, linkPreview }),
      };

      await addDoc(collection(db, 'posts'), postData);
      onClose();
    } catch (error) {
      console.error('Error creating post:', error);
      setError('Failed to create post. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Render different post types
  const renderPostContent = () => {
    switch (postType) {
      case 'blood':
        return <BloodDonationPost user={user} onClose={onClose} />;
      case 'event':
        return <EventPost user={user} onClose={onClose} />;
      case 'map':
        return <MapPost user={user} onClose={onClose} />;
      case 'page':
        return <PageCreator user={user} onClose={onClose} type="page" />;
      case 'group':
        return <PageCreator user={user} onClose={onClose} type="group" />;
      default:
        return (
          <div className="space-y-4">
            {/* Post Type Selector */}
            <div className="flex flex-wrap gap-2">
              {postTypes.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPostType(id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                    postType === id
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Content Editor */}
            <ReactQuill
              theme="snow"
              value={content}
              onChange={setContent}
              modules={modules}
              placeholder="What's on your mind?"
              className="h-32 mb-12"
            />

            {/* Media Upload */}
            {postType === 'media' && (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleMediaUpload}
                  className="hidden"
                  multiple
                  accept="image/*,video/*"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  Add Media
                </button>

                {/* Media Preview */}
                {media.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {media.map((item, index) => (
                      <div key={index} className="relative group">
                        {item.type === 'image' ? (
                          <img
                            src={item.url}
                            alt={item.name}
                            className="rounded-lg w-full h-40 object-cover"
                          />
                        ) : (
                          <video
                            src={item.url}
                            className="rounded-lg w-full h-40 object-cover"
                            controls
                          />
                        )}
                        <button
                          onClick={() => setMedia(media.filter((_, i) => i !== index))}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Link Input */}
            {postType === 'link' && (
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <input
                    type="url"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    onBlur={handleLinkPreview}
                    placeholder="Enter URL"
                    className="input flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleLinkPreview}
                    className="btn bg-gray-100 hover:bg-gray-200 text-gray-700"
                  >
                    Preview
                  </button>
                </div>

                {linkPreview && (
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold">{linkPreview.title}</h3>
                    <p className="text-gray-600">{linkPreview.description}</p>
                    {linkPreview.image && (
                      <img
                        src={linkPreview.image}
                        alt="Link preview"
                        className="mt-2 rounded"
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Privacy Selector */}
            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value)}
              className="input mt-4"
            >
              <option value="public">Public</option>
              <option value="friends">Friends Only</option>
              <option value="private">Private</option>
            </select>

            {/* Error Messages */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-red-600 mb-2">
                  <ExclamationTriangleIcon className="h-5 w-5" />
                  <span className="font-medium">Content Warning</span>
                </div>
                <p className="text-red-600 whitespace-pre-line">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="btn bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading || (!content.trim() && media.length === 0 && !link)}
                className="btn btn-primary"
              >
                {isLoading ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 max-w-2xl w-full">
      {renderPostContent()}
    </div>
  );
};

export default PostEditor;
