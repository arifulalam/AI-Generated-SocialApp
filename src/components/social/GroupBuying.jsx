import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import {
  UserGroupIcon,
  ClockIcon,
  ShoppingCartIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

const GroupBuying = ({ user, product }) => {
  const [groupBuys, setGroupBuys] = useState([]);
  const [activeGroupBuy, setActiveGroupBuy] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (product) {
      loadGroupBuys();
    }
  }, [product]);

  useEffect(() => {
    if (activeGroupBuy) {
      const timer = setInterval(() => {
        updateTimeLeft();
      }, 1000);

      loadParticipants();

      return () => clearInterval(timer);
    }
  }, [activeGroupBuy]);

  const loadGroupBuys = async () => {
    try {
      const groupBuysRef = collection(db, 'groupBuys');
      const q = query(
        groupBuysRef,
        where('productId', '==', product.id),
        where('status', '==', 'active')
      );

      onSnapshot(q, (snapshot) => {
        const groups = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setGroupBuys(groups);
      });
    } catch (error) {
      console.error('Error loading group buys:', error);
    }
  };

  const loadParticipants = async () => {
    if (!activeGroupBuy) return;

    try {
      const participantsRef = collection(db, 'groupBuys', activeGroupBuy.id, 'participants');
      
      onSnapshot(participantsRef, (snapshot) => {
        const users = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setParticipants(users);

        // Check if group buy target is reached
        if (users.length >= activeGroupBuy.targetParticipants) {
          completeGroupBuy(activeGroupBuy.id);
        }
      });
    } catch (error) {
      console.error('Error loading participants:', error);
    }
  };

  const createGroupBuy = async () => {
    try {
      const groupBuyData = {
        productId: product.id,
        productName: product.name,
        productImage: product.images[0],
        originalPrice: product.price,
        discountedPrice: product.price * 0.8, // 20% discount
        targetParticipants: 5,
        createdBy: user.uid,
        creatorName: user.displayName,
        status: 'active',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'groupBuys'), groupBuyData);
      
      // Add creator as first participant
      await addDoc(collection(db, 'groupBuys', docRef.id, 'participants'), {
        userId: user.uid,
        userName: user.displayName,
        userAvatar: user.photoURL,
        joinedAt: serverTimestamp()
      });

      setActiveGroupBuy({ id: docRef.id, ...groupBuyData });
    } catch (error) {
      console.error('Error creating group buy:', error);
    }
  };

  const joinGroupBuy = async (groupBuyId) => {
    try {
      // Check if user is already a participant
      const participantsRef = collection(db, 'groupBuys', groupBuyId, 'participants');
      const q = query(participantsRef, where('userId', '==', user.uid));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        console.log('User already joined this group buy');
        return;
      }

      // Add user as participant
      await addDoc(participantsRef, {
        userId: user.uid,
        userName: user.displayName,
        userAvatar: user.photoURL,
        joinedAt: serverTimestamp()
      });

      const groupBuy = groupBuys.find(g => g.id === groupBuyId);
      setActiveGroupBuy(groupBuy);
    } catch (error) {
      console.error('Error joining group buy:', error);
    }
  };

  const leaveGroupBuy = async (groupBuyId) => {
    try {
      const participantsRef = collection(db, 'groupBuys', groupBuyId, 'participants');
      const q = query(participantsRef, where('userId', '==', user.uid));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        await deleteDoc(doc(participantsRef, snapshot.docs[0].id));
      }

      setActiveGroupBuy(null);
    } catch (error) {
      console.error('Error leaving group buy:', error);
    }
  };

  const completeGroupBuy = async (groupBuyId) => {
    try {
      await updateDoc(doc(db, 'groupBuys', groupBuyId), {
        status: 'completed',
        completedAt: serverTimestamp()
      });

      // Create orders for all participants
      const participantsRef = collection(db, 'groupBuys', groupBuyId, 'participants');
      const snapshot = await getDocs(participantsRef);

      const orderPromises = snapshot.docs.map(async (participantDoc) => {
        const participant = participantDoc.data();
        
        await addDoc(collection(db, 'orders'), {
          userId: participant.userId,
          productId: product.id,
          quantity: 1,
          price: activeGroupBuy.discountedPrice,
          status: 'pending',
          groupBuyId: groupBuyId,
          createdAt: serverTimestamp()
        });
      });

      await Promise.all(orderPromises);
    } catch (error) {
      console.error('Error completing group buy:', error);
    }
  };

  const updateTimeLeft = () => {
    if (!activeGroupBuy) return;

    const now = new Date();
    const expiresAt = activeGroupBuy.expiresAt.toDate();
    const diff = expiresAt - now;

    if (diff <= 0) {
      setTimeLeft('Expired');
      // Cancel group buy if not enough participants
      if (participants.length < activeGroupBuy.targetParticipants) {
        cancelGroupBuy(activeGroupBuy.id);
      }
    } else {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    }
  };

  const cancelGroupBuy = async (groupBuyId) => {
    try {
      await updateDoc(doc(db, 'groupBuys', groupBuyId), {
        status: 'cancelled',
        cancelledAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error cancelling group buy:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Group Buying</h2>

      {/* Active Group Buys */}
      {groupBuys.length > 0 && !activeGroupBuy && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Active Group Buys</h3>
          {groupBuys.map(group => (
            <div
              key={group.id}
              className="border rounded-lg p-4 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <UserGroupIcon className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">
                    {group.creatorName}'s Group
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {group.targetParticipants} participants needed
                </p>
                <div className="mt-2">
                  <span className="text-lg font-bold text-green-500">
                    ${group.discountedPrice}
                  </span>
                  <span className="text-sm text-gray-500 line-through ml-2">
                    ${group.originalPrice}
                  </span>
                </div>
              </div>
              <button
                onClick={() => joinGroupBuy(group.id)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
              >
                Join Group
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create New Group Buy */}
      {!activeGroupBuy && groupBuys.length === 0 && (
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            No active group buys. Start one and save 20%!
          </p>
          <button
            onClick={createGroupBuy}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
          >
            Start Group Buy
          </button>
        </div>
      )}

      {/* Active Group Buy Details */}
      {activeGroupBuy && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Your Active Group Buy</h3>
            <div className="flex items-center text-gray-600">
              <ClockIcon className="h-5 w-5 mr-2" />
              <span>{timeLeft}</span>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-medium">Progress</p>
                <p className="text-sm text-gray-600">
                  {participants.length} of {activeGroupBuy.targetParticipants} joined
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium text-green-500">
                  ${activeGroupBuy.discountedPrice}
                </p>
                <p className="text-sm text-gray-500 line-through">
                  ${activeGroupBuy.originalPrice}
                </p>
              </div>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 rounded-full h-2 transition-all duration-500"
                style={{
                  width: `${(participants.length / activeGroupBuy.targetParticipants) * 100}%`
                }}
              />
            </div>
          </div>

          {/* Participants */}
          <div>
            <h4 className="font-medium mb-3">Participants</h4>
            <div className="space-y-2">
              {participants.map(participant => (
                <div
                  key={participant.id}
                  className="flex items-center space-x-3"
                >
                  <img
                    src={participant.userAvatar || '/default-avatar.png'}
                    alt={participant.userName}
                    className="w-8 h-8 rounded-full"
                  />
                  <span>{participant.userName}</span>
                  {participant.userId === user.uid && (
                    <span className="text-sm text-blue-500">(You)</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Share */}
          <div className="flex justify-between items-center">
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `Join my group buy for ${product.name} and save 20%!`
                );
              }}
              className="text-blue-500 hover:text-blue-600"
            >
              Share with friends
            </button>
            <button
              onClick={() => leaveGroupBuy(activeGroupBuy.id)}
              className="text-red-500 hover:text-red-600"
            >
              Leave Group
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupBuying;
