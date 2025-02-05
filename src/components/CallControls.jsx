import React from 'react';
import {
  MicrophoneIcon,
  VideoCameraIcon,
  ComputerDesktopIcon,
  SpeakerWaveIcon,
  XMarkIcon,
} from '@heroicons/react/24/solid';
import {
  MicrophoneIcon as MicrophoneIconOutline,
  VideoCameraIcon as VideoCameraIconOutline,
  SpeakerWaveIcon as SpeakerWaveIconOutline,
} from '@heroicons/react/24/outline';

const CallControls = ({
  isMuted,
  isVideoOff,
  isScreenSharing,
  isSpeakerOff,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleSpeaker,
  onEndCall,
}) => {
  const buttonClass = "p-3 rounded-full transition-all duration-200 hover:bg-gray-700";
  const iconClass = "h-6 w-6";

  return (
    <div className="flex items-center justify-center space-x-4 bg-gray-800 p-4 rounded-lg">
      {/* Microphone Toggle */}
      <button
        onClick={onToggleMute}
        className={`${buttonClass} ${isMuted ? 'bg-red-600' : 'bg-gray-600'}`}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? (
          <MicrophoneIconOutline className={iconClass} />
        ) : (
          <MicrophoneIcon className={iconClass} />
        )}
      </button>

      {/* Camera Toggle */}
      <button
        onClick={onToggleVideo}
        className={`${buttonClass} ${isVideoOff ? 'bg-red-600' : 'bg-gray-600'}`}
        title={isVideoOff ? 'Turn On Camera' : 'Turn Off Camera'}
      >
        {isVideoOff ? (
          <VideoCameraIconOutline className={iconClass} />
        ) : (
          <VideoCameraIcon className={iconClass} />
        )}
      </button>

      {/* Screen Share */}
      <button
        onClick={onToggleScreenShare}
        className={`${buttonClass} ${isScreenSharing ? 'bg-green-600' : 'bg-gray-600'}`}
        title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
      >
        <ComputerDesktopIcon className={iconClass} />
      </button>

      {/* Speaker Toggle */}
      <button
        onClick={onToggleSpeaker}
        className={`${buttonClass} ${isSpeakerOff ? 'bg-red-600' : 'bg-gray-600'}`}
        title={isSpeakerOff ? 'Turn On Speaker' : 'Turn Off Speaker'}
      >
        {isSpeakerOff ? (
          <SpeakerWaveIconOutline className={iconClass} />
        ) : (
          <SpeakerWaveIcon className={iconClass} />
        )}
      </button>

      {/* End Call */}
      <button
        onClick={onEndCall}
        className={`${buttonClass} bg-red-600 hover:bg-red-700`}
        title="End Call"
      >
        <XMarkIcon className={iconClass} />
      </button>
    </div>
  );
};

export default CallControls;
