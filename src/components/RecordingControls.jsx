import { useState, useRef, useEffect } from 'react';
import { storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  VideoCameraIcon,
  StopIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/solid';

const RecordingControls = ({ stream, chatId, onRecordingStart, onRecordingStop }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const mediaRecorderRef = useRef(null);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  const startRecording = () => {
    setRecordedChunks([]);
    setDownloadUrl(null);

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9,opus',
    });

    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        setRecordedChunks((prev) => [...prev, event.data]);
      }
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunks, {
        type: 'video/webm',
      });

      // Upload to Firebase Storage
      const fileName = `recordings/${chatId}/${Date.now()}.webm`;
      const storageRef = ref(storage, fileName);
      
      try {
        const snapshot = await uploadBytes(storageRef, blob);
        const url = await getDownloadURL(snapshot.ref);
        setDownloadUrl(url);
        onRecordingStop?.(url);
      } catch (error) {
        console.error('Error uploading recording:', error);
      }
    };

    mediaRecorder.start(1000); // Collect data every second
    setIsRecording(true);
    onRecordingStart?.();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const downloadRecording = () => {
    if (recordedChunks.length === 0) return;

    const blob = new Blob(recordedChunks, {
      type: 'video/webm',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.style = 'display: none';
    a.href = url;
    a.download = `chat-recording-${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center space-x-2">
      {!isRecording ? (
        <button
          onClick={startRecording}
          className="control-button bg-red-600 hover:bg-red-700 group"
          title="Start Recording"
        >
          <VideoCameraIcon className="h-5 w-5 text-white" />
          <span className="absolute invisible group-hover:visible bg-gray-900 text-white text-xs px-2 py-1 rounded -top-8 left-1/2 transform -translate-x-1/2">
            Start Recording
          </span>
        </button>
      ) : (
        <button
          onClick={stopRecording}
          className="control-button bg-gray-600 hover:bg-gray-700 animate-pulse group"
          title="Stop Recording"
        >
          <StopIcon className="h-5 w-5 text-white" />
          <span className="absolute invisible group-hover:visible bg-gray-900 text-white text-xs px-2 py-1 rounded -top-8 left-1/2 transform -translate-x-1/2">
            Stop Recording
          </span>
        </button>
      )}

      {downloadUrl && (
        <button
          onClick={downloadRecording}
          className="control-button bg-green-600 hover:bg-green-700 group"
          title="Download Recording"
        >
          <ArrowDownTrayIcon className="h-5 w-5 text-white" />
          <span className="absolute invisible group-hover:visible bg-gray-900 text-white text-xs px-2 py-1 rounded -top-8 left-1/2 transform -translate-x-1/2">
            Download Recording
          </span>
        </button>
      )}
    </div>
  );
};

export default RecordingControls;
