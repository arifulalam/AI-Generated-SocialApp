import React from 'react';
import { useEffect, useRef } from 'react';
import { VideoCameraIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/solid';

const CallNotification = ({ caller, onAccept, onReject }) => {
  const audioRef = useRef(null);

  useEffect(() => {
    // Play ringtone
    if (audioRef.current) {
      audioRef.current.play().catch(error => {
        console.error('Error playing ringtone:', error);
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm w-full animate-slide-up z-50">
      <audio
        ref={audioRef}
        src="/ringtone.mp3"
        loop
      />
      
      <div className="flex items-center mb-4">
        <div className="bg-blue-100 p-2 rounded-full mr-4">
          <VideoCameraIcon className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold">Incoming Video Call</h3>
          <p className="text-sm text-gray-600">{caller.displayName}</p>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <button
          onClick={onReject}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 hover:bg-red-200 transition-colors"
        >
          <XMarkIcon className="h-5 w-5 text-red-600" />
        </button>
        <button
          onClick={onAccept}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 hover:bg-green-200 transition-colors"
        >
          <CheckIcon className="h-5 w-5 text-green-600" />
        </button>
      </div>
    </div>
  );
};

export default CallNotification;
