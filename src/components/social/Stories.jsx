import React, { useState, useEffect, useRef } from 'react';
import { storage, db } from '../../config/firebase';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { CameraIcon, XMarkIcon } from '@heroicons/react/24/outline';

const Stories = ({ user }) => {
  const [stories, setStories] = useState([]);
  const [activeStory, setActiveStory] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);
  const storyTimerRef = useRef(null);

  useEffect(() => {
    loadStories();
    // Cleanup expired stories every hour
    const cleanup = setInterval(cleanupExpiredStories, 3600000);
    return () => clearInterval(cleanup);
  }, []);

  const loadStories = async () => {
    try {
      const storiesRef = collection(db, 'stories');
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const q = query(
        storiesRef,
        where('createdAt', '>=', twentyFourHoursAgo)
      );
      
      const snapshot = await getDocs(q);
      const loadedStories = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Group stories by user
      const groupedStories = loadedStories.reduce((acc, story) => {
        if (!acc[story.userId]) {
          acc[story.userId] = [];
        }
        acc[story.userId].push(story);
        return acc;
      }, {});

      setStories(Object.values(groupedStories));
    } catch (error) {
      console.error('Error loading stories:', error);
    }
  };

  const cleanupExpiredStories = async () => {
    try {
      const storiesRef = collection(db, 'stories');
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const q = query(
        storiesRef,
        where('createdAt', '<', twentyFourHoursAgo)
      );
      
      const snapshot = await getDocs(q);
      
      // Delete expired stories in parallel
      await Promise.all(
        snapshot.docs.map(async (doc) => {
          await deleteDoc(doc.ref);
          // Also delete the story media from storage
          const story = doc.data();
          if (story.mediaUrl) {
            const storageRef = ref(storage, story.mediaUrl);
            await deleteObject(storageRef);
          }
        })
      );
    } catch (error) {
      console.error('Error cleaning up expired stories:', error);
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setIsUploading(true);
      
      // Upload media
      const storageRef = ref(storage, `stories/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const mediaUrl = await getDownloadURL(storageRef);

      // Create story document
      const storyData = {
        userId: user.uid,
        userName: user.displayName,
        userAvatar: user.photoURL,
        mediaUrl,
        mediaType: file.type.startsWith('image/') ? 'image' : 'video',
        createdAt: serverTimestamp(),
        views: [],
        reactions: []
      };

      await addDoc(collection(db, 'stories'), storyData);
      await loadStories();
    } catch (error) {
      console.error('Error uploading story:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const viewStory = (story) => {
    setActiveStory(story);
    // Start timer for story duration
    if (storyTimerRef.current) {
      clearTimeout(storyTimerRef.current);
    }
    storyTimerRef.current = setTimeout(() => {
      setActiveStory(null);
    }, 5000); // 5 seconds for images, video duration for videos
  };

  const closeStory = () => {
    setActiveStory(null);
    if (storyTimerRef.current) {
      clearTimeout(storyTimerRef.current);
    }
  };

  return (
    <div className="w-full">
      {/* Stories List */}
      <div className="flex overflow-x-auto space-x-4 p-4 bg-white rounded-lg shadow">
        {/* Add Story Button */}
        <div className="flex-shrink-0">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-20 h-20 rounded-full border-2 border-blue-500 flex items-center justify-center bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <CameraIcon className="h-8 w-8 text-blue-500" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,video/*"
            className="hidden"
          />
          <p className="text-xs text-center mt-2">Add Story</p>
        </div>

        {/* Story Previews */}
        {stories.map((userStories, index) => (
          <div key={index} className="flex-shrink-0">
            <button
              onClick={() => viewStory(userStories[0])}
              className="w-20 h-20 rounded-full border-2 border-gray-200 overflow-hidden"
            >
              <img
                src={userStories[0].userAvatar || '/default-avatar.png'}
                alt={userStories[0].userName}
                className="w-full h-full object-cover"
              />
            </button>
            <p className="text-xs text-center mt-2">{userStories[0].userName}</p>
          </div>
        ))}
      </div>

      {/* Story Viewer */}
      {activeStory && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
          <div className="relative max-w-lg w-full">
            <button
              onClick={closeStory}
              className="absolute top-4 right-4 text-white z-10"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>

            {/* Progress Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gray-600">
              <div
                className="h-full bg-white transition-all duration-[5000ms] ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Story Content */}
            <div className="aspect-video relative">
              {activeStory.mediaType === 'image' ? (
                <img
                  src={activeStory.mediaUrl}
                  alt="Story"
                  className="w-full h-full object-contain"
                />
              ) : (
                <video
                  src={activeStory.mediaUrl}
                  className="w-full h-full"
                  autoPlay
                  controls={false}
                  onTimeUpdate={(e) => {
                    const video = e.target;
                    setProgress((video.currentTime / video.duration) * 100);
                  }}
                  onEnded={closeStory}
                />
              )}

              {/* Story Info */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
                <div className="flex items-center">
                  <img
                    src={activeStory.userAvatar || '/default-avatar.png'}
                    alt={activeStory.userName}
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="ml-2 text-white font-medium">
                    {activeStory.userName}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg">
          <p className="text-sm font-medium">Uploading story...</p>
          <div className="mt-2 h-2 bg-gray-200 rounded-full">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Stories;
