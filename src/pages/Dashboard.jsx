import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../config/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDocs,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import { 
  VideoCameraIcon, 
  PaperClipIcon, 
  PaperAirplaneIcon,
  UserPlusIcon,
  NewspaperIcon,
} from '@heroicons/react/24/solid';
import VideoCall from '../components/VideoCall';
import MessageReactions from '../components/MessageReactions';
import TypingIndicator from '../components/TypingIndicator';
import MessageThread from '../components/MessageThread';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [friendRequests, setFriendRequests] = useState([]);
  const [file, setFile] = useState(null);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingIndicatorRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    // Listen to friend requests
    const requestsQuery = query(
      collection(db, 'friendRequests'),
      where('to', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
      const requests = [];
      snapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() });
      });
      setFriendRequests(requests);
    });

    // Listen to friends list
    const friendsQuery = query(
      collection(db, 'friends'),
      where('users', 'array-contains', user.uid)
    );

    const unsubscribeFriends = onSnapshot(friendsQuery, (snapshot) => {
      const friendsList = [];
      snapshot.forEach((doc) => {
        friendsList.push({ id: doc.id, ...doc.data() });
      });
      setFriends(friendsList);
    });

    return () => {
      unsubscribeRequests();
      unsubscribeFriends();
    };
  }, [user]);

  useEffect(() => {
    if (!selectedFriend) return;

    const messagesQuery = query(
      collection(db, 'messages'),
      where('chatId', '==', selectedFriend.id),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesList = [];
      snapshot.forEach((doc) => {
        messagesList.push({ id: doc.id, ...doc.data() });
      });
      setMessages(messagesList);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [selectedFriend]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() && !file) return;

    try {
      let fileUrl = '';
      let fileType = '';

      if (file) {
        const fileRef = ref(storage, `files/${selectedFriend.id}/${file.name}`);
        await uploadBytes(fileRef, file);
        fileUrl = await getDownloadURL(fileRef);
        fileType = file.type.split('/')[0]; // 'image', 'video', 'audio'
      }

      await addDoc(collection(db, 'messages'), {
        chatId: selectedFriend.id,
        senderId: user.uid,
        text: message,
        fileUrl,
        fileType,
        timestamp: serverTimestamp(),
      });

      setMessage('');
      setFile(null);
      fileInputRef.current.value = '';
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
    if (typingIndicatorRef.current) {
      typingIndicatorRef.current.setTypingIndicator();
    }
  };

  const sendFriendRequest = async (email) => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        alert('User not found');
        return;
      }

      const toUser = querySnapshot.docs[0];
      
      await addDoc(collection(db, 'friendRequests'), {
        from: user.uid,
        to: toUser.id,
        status: 'pending',
        timestamp: serverTimestamp(),
      });

      alert('Friend request sent!');
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const handleFriendRequest = async (requestId, status) => {
    try {
      // Update request status
      await updateDoc(doc(db, 'friendRequests', requestId), { status });

      if (status === 'accepted') {
        const request = friendRequests.find(req => req.id === requestId);
        
        // Create friends document
        await addDoc(collection(db, 'friends'), {
          users: [request.from, request.to],
          timestamp: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error handling friend request:', error);
    }
  };

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">Chat App</h2>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          <button
            onClick={() => navigate('/social')}
            className="w-full flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100"
          >
            <NewspaperIcon className="h-5 w-5 text-gray-500" />
            <span>Social Feed</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100"
          >
            Logout
          </button>
        </nav>

        {/* Friend Requests */}
        {friendRequests.length > 0 && (
          <div className="mb-4 p-4">
            <h3 className="text-lg font-semibold mb-2">Friend Requests</h3>
            {friendRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between mb-2">
                <span>{request.from}</span>
                <div>
                  <button
                    onClick={() => handleFriendRequest(request.id, 'accepted')}
                    className="btn btn-primary text-sm mr-2"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleFriendRequest(request.id, 'rejected')}
                    className="btn btn-danger text-sm"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Friends List */}
        <div className="space-y-2 p-4">
          {friends.map((friend) => (
            <button
              key={friend.id}
              onClick={() => setSelectedFriend(friend)}
              className={`w-full p-3 rounded-lg text-left hover:bg-gray-100 ${
                selectedFriend?.id === friend.id ? 'bg-gray-100' : ''
              }`}
            >
              {friend.users.find(id => id !== user.uid)}
            </button>
          ))}
        </div>

        {/* Add Friend Button */}
        <button
          onClick={() => {
            const email = prompt('Enter friend\'s email:');
            if (email) sendFriendRequest(email);
          }}
          className="mt-4 flex items-center text-sm text-gray-500 hover:text-gray-700 p-4"
        >
          <UserPlusIcon className="h-5 w-5 mr-2" />
          Add Friend
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedFriend ? (
          <>
            {/* Chat Header */}
            <div className="bg-white shadow p-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                {selectedFriend.users.find(id => id !== user.uid)}
              </h3>
              <button 
                className="text-gray-600 hover:text-gray-800"
                onClick={() => setShowVideoCall(true)}
              >
                <VideoCameraIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Video Call Modal */}
            {showVideoCall && (
              <VideoCall
                user={user}
                selectedFriend={selectedFriend}
                onClose={() => setShowVideoCall(false)}
              />
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.senderId === user.uid ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      msg.senderId === user.uid
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200'
                    }`}
                  >
                    {msg.fileUrl && (
                      <div className="mb-2">
                        {msg.fileType === 'image' && (
                          <img
                            src={msg.fileUrl}
                            alt="Shared image"
                            className="max-w-full rounded"
                          />
                        )}
                        {msg.fileType === 'video' && (
                          <video
                            src={msg.fileUrl}
                            controls
                            className="max-w-full rounded"
                          />
                        )}
                        {msg.fileType === 'audio' && (
                          <audio src={msg.fileUrl} controls />
                        )}
                      </div>
                    )}
                    <div className="flex items-end space-x-2">
                      <p>{msg.text}</p>
                      <span className="text-xs opacity-75">
                        {msg.timestamp?.toDate().toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Message Actions */}
                    <div className="mt-2 flex items-center justify-between">
                      <MessageReactions
                        messageId={msg.id}
                        currentUser={user}
                      />
                      <button
                        onClick={() => setSelectedMessage(msg)}
                        className="text-xs opacity-75 hover:opacity-100"
                      >
                        {msg.replyCount || 0} replies
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Typing Indicator */}
            <TypingIndicator
              ref={typingIndicatorRef}
              chatId={selectedFriend.id}
              currentUser={user}
            />

            {/* Message Thread Modal */}
            {selectedMessage && (
              <MessageThread
                parentMessage={selectedMessage}
                onClose={() => setSelectedMessage(null)}
                currentUser={user}
              />
            )}

            {/* Message Input */}
            <form onSubmit={sendMessage} className="p-4 bg-white shadow-top">
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <PaperClipIcon className="h-6 w-6" />
                </button>
                <input
                  type="text"
                  value={message}
                  onChange={handleMessageChange}
                  placeholder="Type a message..."
                  className="flex-1 input"
                />
                <button
                  type="submit"
                  className="text-blue-600 hover:text-blue-800"
                >
                  <PaperAirplaneIcon className="h-6 w-6" />
                </button>
              </div>
              {file && (
                <div className="mt-2 text-sm text-gray-600">
                  Selected file: {file.name}
                </div>
              )}
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a friend to start chatting
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
