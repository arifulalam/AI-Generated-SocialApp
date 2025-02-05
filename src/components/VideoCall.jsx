import { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import { db } from '../config/firebase';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  onSnapshot,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import CallControls from './CallControls';
import CallNotification from './CallNotification';

const VideoCall = ({ user, selectedFriend, onClose }) => {
  const [stream, setStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [callId, setCallId] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [caller, setCaller] = useState(null);

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  useEffect(() => {
    // Get user's video and audio stream
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);
        if (myVideo.current) {
          myVideo.current.srcObject = currentStream;
        }
      });

    // Listen for incoming calls
    const callsQuery = query(
      collection(db, 'calls'),
      where('to', '==', user.uid),
      where('status', '==', 'calling')
    );

    const unsubscribe = onSnapshot(callsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          setCallId(change.doc.id);
          setCallerSignal(data.signalData);
          setCaller(data.fromUser);
          setReceivingCall(true);
        }
      });
    });

    return () => {
      // Clean up
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (screenStream) {
        screenStream.getTracks().forEach((track) => track.stop());
      }
      if (connectionRef.current) {
        connectionRef.current.destroy();
      }
      unsubscribe();
    };
  }, [user.uid]);

  const callUser = async () => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: isScreenSharing ? screenStream : stream,
    });

    peer.on('signal', async (data) => {
      // Create a call document in Firestore
      const callDoc = await addDoc(collection(db, 'calls'), {
        from: user.uid,
        to: selectedFriend.users.find(id => id !== user.uid),
        signalData: data,
        status: 'calling',
        fromUser: {
          uid: user.uid,
          displayName: user.displayName,
        },
      });
      setCallId(callDoc.id);
    });

    peer.on('stream', (remoteStream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = remoteStream;
      }
    });

    // Listen for answer
    const callDoc = doc(db, 'calls', callId);
    onSnapshot(callDoc, (snapshot) => {
      const data = snapshot.data();
      if (data?.status === 'accepted' && data?.answerSignal) {
        peer.signal(data.answerSignal);
        setCallAccepted(true);
      }
    });

    connectionRef.current = peer;
  };

  const answerCall = async () => {
    setCallAccepted(true);
    setReceivingCall(false);

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: isScreenSharing ? screenStream : stream,
    });

    peer.on('signal', async (data) => {
      // Update call document with answer signal
      const callDoc = doc(db, 'calls', callId);
      await updateDoc(callDoc, {
        status: 'accepted',
        answerSignal: data,
      });
    });

    peer.on('stream', (remoteStream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = remoteStream;
      }
    });

    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  const endCall = async () => {
    setCallEnded(true);
    if (connectionRef.current) {
      connectionRef.current.destroy();
    }
    if (callId) {
      await deleteDoc(doc(db, 'calls', callId));
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
    }
    onClose();
  };

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenCaptureStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        setScreenStream(screenCaptureStream);
        
        if (connectionRef.current) {
          const videoTrack = screenCaptureStream.getVideoTracks()[0];
          const sender = connectionRef.current.getSenders().find(s => s.track.kind === 'video');
          sender.replaceTrack(videoTrack);
        }
        
        setIsScreenSharing(true);
      } catch (error) {
        console.error('Error sharing screen:', error);
      }
    } else {
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        
        if (connectionRef.current) {
          const videoTrack = stream.getVideoTracks()[0];
          const sender = connectionRef.current.getSenders().find(s => s.track.kind === 'video');
          sender.replaceTrack(videoTrack);
        }
      }
      setScreenStream(null);
      setIsScreenSharing(false);
    }
  };

  const toggleSpeaker = () => {
    if (userVideo.current) {
      userVideo.current.muted = !isSpeakerOff;
      setIsSpeakerOff(!isSpeakerOff);
    }
  };

  return (
    <>
      {receivingCall && !callAccepted && (
        <CallNotification
          caller={caller}
          onAccept={answerCall}
          onReject={endCall}
        />
      )}
      
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-4 max-w-4xl w-full">
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* My Video */}
            <div className="relative bg-gray-900 rounded-lg overflow-hidden">
              <video
                playsInline
                muted
                ref={myVideo}
                autoPlay
                className={`w-full ${isVideoOff ? 'hidden' : ''}`}
              />
              {isVideoOff && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 bg-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-2xl text-white">
                      {user.displayName?.[0]?.toUpperCase()}
                    </span>
                  </div>
                </div>
              )}
              <p className="absolute bottom-2 left-2 text-white bg-black bg-opacity-50 px-2 py-1 rounded">
                You {isScreenSharing ? '(Screen)' : ''}
              </p>
            </div>

            {/* User's Video */}
            {callAccepted && !callEnded && (
              <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                <video
                  playsInline
                  ref={userVideo}
                  autoPlay
                  className="w-full"
                  muted={isSpeakerOff}
                />
                <p className="absolute bottom-2 left-2 text-white bg-black bg-opacity-50 px-2 py-1 rounded">
                  {selectedFriend.users.find(id => id !== user.uid)}
                </p>
              </div>
            )}
          </div>

          <CallControls
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            isScreenSharing={isScreenSharing}
            isSpeakerOff={isSpeakerOff}
            onToggleMute={toggleMute}
            onToggleVideo={toggleVideo}
            onToggleScreenShare={toggleScreenShare}
            onToggleSpeaker={toggleSpeaker}
            onEndCall={endCall}
          />
        </div>
      </div>
    </>
  );
};

export default VideoCall;
