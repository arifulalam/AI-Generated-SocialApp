import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';
import {
  CalendarIcon,
  ClockIcon,
  VideoCameraIcon,
  UserGroupIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';

const Calendar = ({ user }) => {
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showEventForm, setShowEventForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    type: 'meeting', // meeting, livestream, groupBuy
    participants: [],
    videoUrl: '',
    productId: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadEvents();
  }, [user]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const eventsRef = collection(db, 'events');
      const q = query(
        eventsRef,
        where('participants', 'array-contains', user.uid)
      );
      
      const snapshot = await getDocs(q);
      const eventsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setEvents(eventsList);
    } catch (error) {
      console.error('Error loading events:', error);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!newEvent.title || !newEvent.startTime || !newEvent.endTime) {
        setError('Please fill in all required fields');
        return;
      }

      const eventData = {
        ...newEvent,
        creatorId: user.uid,
        creatorName: user.displayName,
        participants: [user.uid, ...newEvent.participants],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'events'), eventData);
      setShowEventForm(false);
      setNewEvent({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        type: 'meeting',
        participants: [],
        videoUrl: '',
        productId: ''
      });
      await loadEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      setError('Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await deleteDoc(doc(db, 'events', eventId));
      await loadEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      setError('Failed to delete event');
    }
  };

  const generateWeekDays = () => {
    const start = startOfWeek(selectedDate);
    return [...Array(7)].map((_, i) => addDays(start, i));
  };

  const weekDays = generateWeekDays();

  const getEventsForDate = (date) => {
    return events.filter(event => 
      isSameDay(new Date(event.startTime), date)
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow">
        {/* Calendar Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <CalendarIcon className="h-6 w-6 text-blue-500 mr-2" />
              <h1 className="text-2xl font-bold">Calendar</h1>
            </div>
            <button
              onClick={() => setShowEventForm(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-1" />
              New Event
            </button>
          </div>

          {/* Week Navigation */}
          <div className="flex justify-between items-center">
            <button
              onClick={() => setSelectedDate(addDays(selectedDate, -7))}
              className="text-gray-600 hover:text-gray-800"
            >
              Previous Week
            </button>
            <span className="font-medium">
              {format(weekDays[0], 'MMMM d')} - {format(weekDays[6], 'MMMM d, yyyy')}
            </span>
            <button
              onClick={() => setSelectedDate(addDays(selectedDate, 7))}
              className="text-gray-600 hover:text-gray-800"
            >
              Next Week
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {/* Day Headers */}
          {weekDays.map((date, i) => (
            <div key={i} className="bg-gray-50 p-2 text-center">
              <span className="text-sm font-medium text-gray-500">
                {format(date, 'EEE')}
              </span>
              <p className="mt-1 text-lg font-semibold">
                {format(date, 'd')}
              </p>
            </div>
          ))}

          {/* Events Grid */}
          {weekDays.map((date, i) => (
            <div
              key={i}
              className="bg-white p-2 h-48 overflow-y-auto"
              onClick={() => setSelectedDate(date)}
            >
              {getEventsForDate(date).map(event => (
                <div
                  key={event.id}
                  className={`p-2 rounded-lg mb-2 ${
                    event.type === 'meeting'
                      ? 'bg-blue-100'
                      : event.type === 'livestream'
                      ? 'bg-purple-100'
                      : 'bg-green-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm">{event.title}</h3>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="text-gray-500 hover:text-red-500"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <ClockIcon className="h-3 w-3 mr-1" />
                    {format(new Date(event.startTime), 'h:mm a')}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Create Event Modal */}
      {showEventForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Create New Event</h2>
              <button
                onClick={() => setShowEventForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Type
                </label>
                <select
                  value={newEvent.type}
                  onChange={(e) => setNewEvent(prev => ({
                    ...prev,
                    type: e.target.value
                  }))}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="meeting">Meeting</option>
                  <option value="livestream">Livestream</option>
                  <option value="groupBuy">Group Buy</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent(prev => ({
                    ...prev,
                    title: e.target.value
                  }))}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Event title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent(prev => ({
                    ...prev,
                    description: e.target.value
                  }))}
                  className="w-full p-2 border rounded-lg"
                  rows={3}
                  placeholder="Event description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={newEvent.startTime}
                    onChange={(e) => setNewEvent(prev => ({
                      ...prev,
                      startTime: e.target.value
                    }))}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent(prev => ({
                      ...prev,
                      endTime: e.target.value
                    }))}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>

              {newEvent.type === 'livestream' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Video URL
                  </label>
                  <input
                    type="url"
                    value={newEvent.videoUrl}
                    onChange={(e) => setNewEvent(prev => ({
                      ...prev,
                      videoUrl: e.target.value
                    }))}
                    className="w-full p-2 border rounded-lg"
                    placeholder="https://..."
                  />
                </div>
              )}

              {newEvent.type === 'groupBuy' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product ID
                  </label>
                  <input
                    type="text"
                    value={newEvent.productId}
                    onChange={(e) => setNewEvent(prev => ({
                      ...prev,
                      productId: e.target.value
                    }))}
                    className="w-full p-2 border rounded-lg"
                    placeholder="Product ID"
                  />
                </div>
              )}

              <button
                onClick={handleCreateEvent}
                disabled={loading}
                className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
