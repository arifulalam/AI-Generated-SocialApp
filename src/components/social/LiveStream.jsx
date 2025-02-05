import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../config/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import {
  VideoCameraIcon,
  MicrophoneIcon,
  XMarkIcon,
  ChatBubbleLeftIcon,
  HeartIcon,
  UsersIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline';

const LiveStream = ({ user, storeId }) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamData, setStreamData] = useState(null);
  const [viewers, setViewers] = useState([]);
  const [comments, setComments] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [reactions, setReactions] = useState({ likes: 0, hearts: 0 });
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    // Load featured products for the stream
    loadProducts();

    // Cleanup on unmount
    return () => {
      if (streamRef.current) {
        stopStream();
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const loadProducts = async () => {
    try {
      const productsRef = collection(db, 'products');
      const q = query(
        productsRef,
        where('storeId', '==', storeId),
        where('isPublished', '==', true)
      );
      
      const snapshot = await getDocs(q);
      setProducts(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const startStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      // Create stream document
      const streamDoc = await addDoc(collection(db, 'livestreams'), {
        userId: user.uid,
        userName: user.displayName,
        userAvatar: user.photoURL,
        storeId,
        title: 'Live Product Showcase',
        startedAt: serverTimestamp(),
        isLive: true,
        viewerCount: 0,
        featuredProducts: products.map(p => p.id)
      });

      setStreamData({ id: streamDoc.id });
      setIsStreaming(true);

      // Initialize WebSocket connection for live streaming
      initializeWebSocket(streamDoc.id);

      // Start recording
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current) {
          wsRef.current.send(event.data);
        }
      };

      mediaRecorder.start(1000); // Send data every second

      // Listen for comments
      listenToComments(streamDoc.id);
      
      // Listen for reactions
      listenToReactions(streamDoc.id);
      
      // Track viewers
      trackViewers(streamDoc.id);
    } catch (error) {
      console.error('Error starting stream:', error);
    }
  };

  const stopStream = async () => {
    try {
      if (streamData) {
        // Update stream document
        await updateDoc(doc(db, 'livestreams', streamData.id), {
          isLive: false,
          endedAt: serverTimestamp()
        });

        // Stop all tracks
        streamRef.current.getTracks().forEach(track => track.stop());
        
        // Close WebSocket
        if (wsRef.current) {
          wsRef.current.close();
        }

        // Stop recording
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stop();
        }

        setIsStreaming(false);
        setStreamData(null);
      }
    } catch (error) {
      console.error('Error stopping stream:', error);
    }
  };

  const initializeWebSocket = (streamId) => {
    // Replace with your WebSocket server URL
    const ws = new WebSocket(process.env.REACT_APP_STREAM_SERVER_URL);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      ws.send(JSON.stringify({
        type: 'init',
        streamId,
        userId: user.uid
      }));
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current = ws;
  };

  const listenToComments = (streamId) => {
    const commentsRef = collection(db, 'livestreams', streamId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const newComments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setComments(newComments);
    });
  };

  const listenToReactions = (streamId) => {
    const reactionsRef = doc(db, 'livestreams', streamId);
    
    return onSnapshot(reactionsRef, (snapshot) => {
      const data = snapshot.data();
      setReactions({
        likes: data.likes || 0,
        hearts: data.hearts || 0
      });
    });
  };

  const trackViewers = (streamId) => {
    const viewersRef = collection(db, 'livestreams', streamId, 'viewers');
    
    return onSnapshot(viewersRef, (snapshot) => {
      const currentViewers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setViewers(currentViewers);

      // Update viewer count
      updateDoc(doc(db, 'livestreams', streamId), {
        viewerCount: currentViewers.length
      });
    });
  };

  const toggleAudio = () => {
    const audioTrack = streamRef.current.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    const videoTrack = streamRef.current.getVideoTracks()[0];
    videoTrack.enabled = !videoTrack.enabled;
    setIsVideoEnabled(!isVideoEnabled);
  };

  const addComment = async (text) => {
    try {
      await addDoc(
        collection(db, 'livestreams', streamData.id, 'comments'),
        {
          userId: user.uid,
          userName: user.displayName,
          userAvatar: user.photoURL,
          text,
          createdAt: serverTimestamp()
        }
      );
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const addReaction = async (type) => {
    try {
      const reactionsRef = doc(db, 'livestreams', streamData.id);
      await updateDoc(reactionsRef, {
        [type]: increment(1)
      });
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Video Container */}
        <div className="relative flex-1 bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isMuted}
            className="w-full h-full object-contain"
          />
          
          {/* Stream Controls */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
            <button
              onClick={toggleAudio}
              className={`p-2 rounded-full ${
                isMuted ? 'bg-red-500' : 'bg-gray-800'
              }`}
            >
              <MicrophoneIcon className="h-6 w-6 text-white" />
            </button>
            <button
              onClick={toggleVideo}
              className={`p-2 rounded-full ${
                !isVideoEnabled ? 'bg-red-500' : 'bg-gray-800'
              }`}
            >
              <VideoCameraIcon className="h-6 w-6 text-white" />
            </button>
            {!isStreaming ? (
              <button
                onClick={startStream}
                className="px-6 py-2 bg-red-500 text-white rounded-full font-medium"
              >
                Start Streaming
              </button>
            ) : (
              <button
                onClick={stopStream}
                className="px-6 py-2 bg-gray-800 text-white rounded-full font-medium"
              >
                End Stream
              </button>
            )}
          </div>

          {/* Stream Info */}
          <div className="absolute top-4 left-4 flex items-center space-x-4">
            <div className="flex items-center bg-gray-900 bg-opacity-75 rounded-full px-4 py-2">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="ml-2 text-white font-medium">LIVE</span>
            </div>
            <div className="flex items-center bg-gray-900 bg-opacity-75 rounded-full px-4 py-2">
              <UsersIcon className="h-5 w-5 text-white" />
              <span className="ml-2 text-white">
                {viewers.length} watching
              </span>
            </div>
          </div>
        </div>

        {/* Featured Products */}
        {isStreaming && (
          <div className="h-24 bg-white border-t flex items-center space-x-4 px-4 overflow-x-auto">
            {products.map(product => (
              <div
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className={`flex-shrink-0 cursor-pointer rounded-lg border p-2 ${
                  selectedProduct?.id === product.id
                    ? 'border-blue-500'
                    : 'border-gray-200'
                }`}
              >
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-16 h-16 object-cover rounded"
                />
                <p className="text-sm mt-1 font-medium">${product.price}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat and Product Details */}
      {isStreaming && (
        <div className="w-96 border-l bg-white flex flex-col">
          <div className="flex-1 flex flex-col">
            {selectedProduct ? (
              // Product Details
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium">{selectedProduct.name}</h3>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                <img
                  src={selectedProduct.images[0]}
                  alt={selectedProduct.name}
                  className="mt-4 w-full h-48 object-cover rounded-lg"
                />
                <p className="mt-4 text-gray-600">
                  {selectedProduct.description}
                </p>
                <p className="mt-4 text-xl font-bold">
                  ${selectedProduct.price}
                </p>
                <button className="mt-4 w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600">
                  Add to Cart
                </button>
              </div>
            ) : (
              // Chat
              <div className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {comments.map(comment => (
                    <div key={comment.id} className="flex items-start space-x-3">
                      <img
                        src={comment.userAvatar || '/default-avatar.png'}
                        alt={comment.userName}
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <p className="font-medium">{comment.userName}</p>
                        <p className="text-gray-600">{comment.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Chat Input */}
                <div className="p-4 border-t">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const input = e.target.elements.comment;
                      if (input.value.trim()) {
                        addComment(input.value.trim());
                        input.value = '';
                      }
                    }}
                    className="flex space-x-2"
                  >
                    <input
                      type="text"
                      name="comment"
                      placeholder="Type a message..."
                      className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>

          {/* Reactions */}
          <div className="border-t p-4 flex justify-around">
            <button
              onClick={() => addReaction('likes')}
              className="flex items-center space-x-2 text-gray-600 hover:text-blue-500"
            >
              <ThumbUpIcon className="h-5 w-5" />
              <span>{reactions.likes}</span>
            </button>
            <button
              onClick={() => addReaction('hearts')}
              className="flex items-center space-x-2 text-gray-600 hover:text-red-500"
            >
              <HeartIcon className="h-5 w-5" />
              <span>{reactions.hearts}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveStream;
