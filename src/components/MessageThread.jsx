import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import MessageReactions from './MessageReactions';
import { XMarkIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/solid';

const MessageThread = ({ parentMessage, onClose, currentUser }) => {
  const [replies, setReplies] = useState([]);
  const [newReply, setNewReply] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'messages'),
      where('parentId', '==', parentMessage.id),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const repliesList = [];
      snapshot.forEach((doc) => {
        repliesList.push({ id: doc.id, ...doc.data() });
      });
      setReplies(repliesList);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [parentMessage.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newReply.trim()) return;

    try {
      await addDoc(collection(db, 'messages'), {
        parentId: parentMessage.id,
        text: newReply,
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        timestamp: serverTimestamp(),
        reactions: [],
      });

      setNewReply('');
    } catch (error) {
      console.error('Error sending reply:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">Thread</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Original Message */}
        <div className="p-4 bg-gray-50">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
                {parentMessage.senderName?.[0]?.toUpperCase()}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-baseline space-x-2">
                <span className="font-medium">{parentMessage.senderName}</span>
                <span className="text-sm text-gray-500">
                  {parentMessage.timestamp?.toDate().toLocaleString()}
                </span>
              </div>
              <p className="mt-1">{parentMessage.text}</p>
              <MessageReactions
                messageId={parentMessage.id}
                currentUser={currentUser}
              />
            </div>
          </div>
        </div>

        {/* Replies */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : replies.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No replies yet. Be the first to reply!
            </div>
          ) : (
            replies.map((reply) => (
              <div key={reply.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white">
                    {reply.senderName?.[0]?.toUpperCase()}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline space-x-2">
                    <span className="font-medium">{reply.senderName}</span>
                    <span className="text-sm text-gray-500">
                      {reply.timestamp?.toDate().toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1">{reply.text}</p>
                  <MessageReactions
                    messageId={reply.id}
                    currentUser={currentUser}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Reply Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              placeholder="Reply to thread..."
              className="flex-1 input"
            />
            <button
              type="submit"
              disabled={!newReply.trim()}
              className="btn btn-primary flex items-center space-x-1"
            >
              <ArrowUturnLeftIcon className="h-5 w-5" />
              <span>Reply</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MessageThread;
