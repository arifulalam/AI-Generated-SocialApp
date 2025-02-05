import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { enhancedSocialService } from '../../services/EnhancedSocialService';
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftEllipsisIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const ModerationDashboard = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('queue');
  const [reports, setReports] = useState([]);
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [note, setNote] = useState('');
  const [actionType, setActionType] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      switch (activeTab) {
        case 'queue':
          await loadReportQueue();
          break;
        case 'cases':
          await loadActiveCases();
          break;
        case 'analytics':
          await loadAnalytics();
          break;
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadReportQueue = async () => {
    // Load pending reports
    const querySnapshot = await getDocs(
      query(
        collection(db, 'reports'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      )
    );
    
    setReports(querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })));
  };

  const loadActiveCases = async () => {
    // Load active moderation cases
    const querySnapshot = await getDocs(
      query(
        collection(db, 'moderation'),
        where('status', '==', 'under_review'),
        orderBy('createdAt', 'desc')
      )
    );
    
    setCases(querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })));
  };

  const loadAnalytics = async () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
    
    const data = await enhancedSocialService.getAnalytics(
      'moderation',
      thirtyDaysAgo,
      new Date()
    );
    
    setAnalytics(data);
  };

  const handleCreateCase = async (reportId) => {
    try {
      await enhancedSocialService.createModerationCase(reportId, user.uid);
      await loadReportQueue();
    } catch (error) {
      console.error('Error creating case:', error);
    }
  };

  const handleAddNote = async () => {
    if (!selectedCase || !note.trim()) return;

    try {
      await enhancedSocialService.addModerationNote(
        selectedCase.id,
        user.uid,
        note
      );
      setNote('');
      await loadActiveCases();
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const handleTakeAction = async () => {
    if (!selectedCase || !actionType || !actionReason.trim()) return;

    try {
      await enhancedSocialService.takeModerationAction(
        selectedCase.id,
        user.uid,
        actionType,
        actionReason
      );
      setActionType('');
      setActionReason('');
      setSelectedCase(null);
      await loadActiveCases();
    } catch (error) {
      console.error('Error taking action:', error);
    }
  };

  const renderReportQueue = () => (
    <div className="space-y-4">
      {reports.map((report) => (
        <div
          key={report.id}
          className={`p-4 rounded-lg ${
            isDark ? 'bg-gray-800' : 'bg-white'
          } shadow`}
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {report.reason}
              </h3>
              <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                {report.details}
              </p>
              <div className="mt-2 flex items-center space-x-4 text-sm">
                <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>
                  Reported {format(new Date(report.createdAt), 'MMM d, yyyy')}
                </span>
                <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>
                  Content Type: {report.contentType}
                </span>
              </div>
            </div>
            <button
              onClick={() => handleCreateCase(report.id)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg
                hover:bg-blue-600 focus:outline-none focus:ring-2
                focus:ring-blue-500 focus:ring-offset-2"
            >
              Review
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderActiveCases = () => (
    <div className="grid grid-cols-3 gap-6">
      {/* Cases List */}
      <div className="col-span-1 space-y-4">
        {cases.map((case_) => (
          <div
            key={case_.id}
            onClick={() => setSelectedCase(case_)}
            className={`p-4 rounded-lg cursor-pointer ${
              selectedCase?.id === case_.id
                ? isDark ? 'bg-blue-900' : 'bg-blue-50'
                : isDark ? 'bg-gray-800' : 'bg-white'
            } shadow`}
          >
            <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Case #{case_.id.slice(0, 8)}
            </h3>
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
              {case_.reason}
            </p>
            <div className="mt-2 text-sm">
              <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>
                Opened {format(new Date(case_.createdAt), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Case Details */}
      {selectedCase && (
        <div className="col-span-2 space-y-6">
          {/* Content Preview */}
          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <h3 className={`font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Reported Content
            </h3>
            {/* Render content preview based on contentType */}
          </div>

          {/* Notes */}
          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <h3 className={`font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Case Notes
            </h3>
            <div className="space-y-4">
              {selectedCase.notes.map((note, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className={`flex-1 p-3 rounded-lg ${
                    isDark ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      {note.note}
                    </p>
                    <div className="mt-2 text-sm">
                      <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>
                        Added by {note.moderatorId} on{' '}
                        {format(new Date(note.timestamp), 'MMM d, yyyy HH:mm')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note..."
                className={`w-full p-3 rounded-lg resize-none ${
                  isDark
                    ? 'bg-gray-700 text-white placeholder-gray-400'
                    : 'bg-gray-100 text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                rows={3}
              />
              <button
                onClick={handleAddNote}
                disabled={!note.trim()}
                className={`mt-2 px-4 py-2 rounded-lg ${
                  note.trim()
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Add Note
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <h3 className={`font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Take Action
            </h3>
            <div className="space-y-4">
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className={`w-full p-3 rounded-lg ${
                  isDark
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-100 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="">Select action...</option>
                <option value="remove_content">Remove Content</option>
                <option value="warn_user">Warn User</option>
                <option value="suspend_user">Suspend User</option>
                <option value="ban_user">Ban User</option>
              </select>

              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Reason for action..."
                className={`w-full p-3 rounded-lg resize-none ${
                  isDark
                    ? 'bg-gray-700 text-white placeholder-gray-400'
                    : 'bg-gray-100 text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                rows={3}
              />

              <button
                onClick={handleTakeAction}
                disabled={!actionType || !actionReason.trim()}
                className={`w-full px-4 py-2 rounded-lg ${
                  actionType && actionReason.trim()
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Take Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderAnalytics = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Analytics cards */}
      {analytics && (
        <>
          <div className={`p-6 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Reports Overview
            </h3>
            {/* Add charts and statistics */}
          </div>

          <div className={`p-6 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Action Distribution
            </h3>
            {/* Add charts and statistics */}
          </div>

          <div className={`p-6 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Response Times
            </h3>
            {/* Add charts and statistics */}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Moderation Dashboard
          </h1>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('queue')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'queue'
                  ? isDark
                    ? 'border-blue-500 text-blue-500'
                    : 'border-blue-500 text-blue-600'
                  : isDark
                    ? 'border-transparent text-gray-400 hover:text-gray-300'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              Report Queue
            </button>
            <button
              onClick={() => setActiveTab('cases')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'cases'
                  ? isDark
                    ? 'border-blue-500 text-blue-500'
                    : 'border-blue-500 text-blue-600'
                  : isDark
                    ? 'border-transparent text-gray-400 hover:text-gray-300'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              Active Cases
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'analytics'
                  ? isDark
                    ? 'border-blue-500 text-blue-500'
                    : 'border-blue-500 text-blue-600'
                  : isDark
                    ? 'border-transparent text-gray-400 hover:text-gray-300'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              Analytics
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'queue' && renderReportQueue()}
        {activeTab === 'cases' && renderActiveCases()}
        {activeTab === 'analytics' && renderAnalytics()}
      </div>
    </div>
  );
};

export default ModerationDashboard;
