import React from 'react';
import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import {
  collection,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
} from 'firebase/firestore';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const MessageReactions = ({ messageId, currentUser }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [reactions, setReactions] = useState([]);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'messages', messageId),
      (doc) => {
        if (doc.exists() && doc.data().reactions) {
          setReactions(doc.data().reactions);
        }
      }
    );

    return () => unsubscribe();
  }, [messageId]);

  const addReaction = async (emoji) => {
    const reaction = {
      emoji,
      userId: currentUser.uid,
      timestamp: Date.now(),
    };

    const messageRef = doc(db, 'messages', messageId);
    await updateDoc(messageRef, {
      reactions: arrayUnion(reaction),
    });
    setShowPicker(false);
  };

  const removeReaction = async (reaction) => {
    const messageRef = doc(db, 'messages', messageId);
    await updateDoc(messageRef, {
      reactions: arrayRemove(reaction),
    });
  };

  const groupedReactions = reactions.reduce((acc, reaction) => {
    const key = reaction.emoji;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(reaction);
    return acc;
  }, {});

  return (
    <div className="relative">
      {/* Quick Reactions */}
      {isHovered && (
        <div 
          className="absolute bottom-full left-0 mb-2 bg-white rounded-full shadow-lg px-2 py-1 flex space-x-1 animate-fade-in"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => addReaction(emoji)}
              className="hover:bg-gray-100 p-1 rounded-full transition-colors"
            >
              {emoji}
            </button>
          ))}
          <button
            onClick={() => setShowPicker(true)}
            className="hover:bg-gray-100 p-1 rounded-full transition-colors text-gray-600"
          >
            +
          </button>
        </div>
      )}

      {/* Existing Reactions */}
      <div 
        className="flex flex-wrap gap-1 mt-1"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {Object.entries(groupedReactions).map(([emoji, reactions]) => (
          <button
            key={emoji}
            onClick={() => {
              const userReaction = reactions.find(r => r.userId === currentUser.uid);
              if (userReaction) {
                removeReaction(userReaction);
              } else {
                addReaction(emoji);
              }
            }}
            className={`
              inline-flex items-center space-x-1 px-2 py-1 rounded-full text-sm
              ${reactions.some(r => r.userId === currentUser.uid)
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 hover:bg-gray-200'
              }
            `}
          >
            <span>{emoji}</span>
            <span>{reactions.length}</span>
          </button>
        ))}
      </div>

      {/* Emoji Picker */}
      {showPicker && (
        <div className="absolute bottom-full left-0 mb-2 z-50">
          <div 
            className="fixed inset-0"
            onClick={() => setShowPicker(false)}
          />
          <Picker
            data={data}
            onEmojiSelect={(emoji) => addReaction(emoji.native)}
            theme="light"
            set="native"
            skinTone={1}
            maxFrequentRows={2}
          />
        </div>
      )}
    </div>
  );
};

export default MessageReactions;
