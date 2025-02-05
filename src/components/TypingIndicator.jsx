import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';

const TypingIndicator = ({ chatId, currentUser }) => {
  const [typingUsers, setTypingUsers] = useState([]);
  let typingTimeout = null;

  useEffect(() => {
    // Listen for typing indicators
    const q = query(
      collection(db, 'typing'),
      where('chatId', '==', chatId),
      where('userId', '!=', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = [];
      snapshot.forEach((doc) => {
        users.push(doc.data());
      });
      setTypingUsers(users);
    });

    // Cleanup typing indicators when component unmounts
    return () => {
      unsubscribe();
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      removeTypingIndicator();
    };
  }, [chatId, currentUser.uid]);

  const setTypingIndicator = async () => {
    const q = query(
      collection(db, 'typing'),
      where('chatId', '==', chatId),
      where('userId', '==', currentUser.uid)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      await addDoc(collection(db, 'typing'), {
        chatId,
        userId: currentUser.uid,
        displayName: currentUser.displayName,
        timestamp: serverTimestamp(),
      });
    }

    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    typingTimeout = setTimeout(removeTypingIndicator, 3000);
  };

  const removeTypingIndicator = async () => {
    const q = query(
      collection(db, 'typing'),
      where('chatId', '==', chatId),
      where('userId', '==', currentUser.uid)
    );
    
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      deleteDoc(doc.ref);
    });
  };

  if (typingUsers.length === 0) return null;

  return (
    <div className="flex items-center space-x-2 text-sm text-gray-500 italic p-2">
      <div className="flex space-x-1">
        <span className="animate-bounce">•</span>
        <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>•</span>
        <span className="animate-bounce" style={{ animationDelay: "0.4s" }}>•</span>
      </div>
      <span>
        {typingUsers.length === 1
          ? `${typingUsers[0].displayName} is typing...`
          : `${typingUsers.length} people are typing...`}
      </span>
    </div>
  );
};

export default TypingIndicator;
