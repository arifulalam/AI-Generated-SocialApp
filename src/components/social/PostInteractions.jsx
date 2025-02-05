import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { socialInteractionService } from '../../services/SocialInteractionService';
import {
  HandThumbUpIcon,
  HeartIcon,
  FaceSmileIcon,
  FaceSurpriseIcon,
  FaceFrownIcon,
  FaceAngryIcon,
  ChatBubbleLeftIcon,
  ShareIcon,
  FlagIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import Modal from 'react-native-modal';

const PostInteractions = ({ post }) => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [userReaction, setUserReaction] = useState(null);
  const [comments, setComments] = useState([]);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');

  useEffect(() => {
    if (user) {
      loadUserReaction();
    }
    if (showComments) {
      loadComments();
    }
  }, [user, post.id, showComments]);

  const loadUserReaction = async () => {
    try {
      const reaction = await socialInteractionService.getUserReaction(user.uid, post.id);
      setUserReaction(reaction);
    } catch (error) {
      console.error('Error loading user reaction:', error);
    }
  };

  const loadComments = async () => {
    try {
      const commentsData = await socialInteractionService.getComments(post.id);
      setComments(commentsData);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleReaction = async (reactionType) => {
    if (!user) {
      // Show login prompt
      return;
    }

    try {
      if (userReaction?.type === reactionType) {
        await socialInteractionService.removeReaction(user.uid, post.id);
        setUserReaction(null);
      } else {
        await socialInteractionService.addReaction(user.uid, post.id, reactionType);
        setUserReaction({ type: reactionType });
      }
      setShowReactionPicker(false);
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  const handleComment = async () => {
    if (!user || !newComment.trim()) return;

    try {
      await socialInteractionService.addComment(
        user.uid,
        post.id,
        newComment,
        replyingTo?.id
      );
      setNewComment('');
      setReplyingTo(null);
      loadComments();
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleShare = async (platform) => {
    if (!user) {
      // Show login prompt
      return;
    }

    try {
      await socialInteractionService.sharePost(user.uid, post.id, platform);
      setShowShareModal(false);
    } catch (error) {
      console.error('Error sharing post:', error);
    }
  };

  const handleReport = async () => {
    if (!user || !reportReason) return;

    try {
      await socialInteractionService.reportContent(
        user.uid,
        'post',
        post.id,
        reportReason,
        reportDetails
      );
      setShowReportModal(false);
      setReportReason('');
      setReportDetails('');
    } catch (error) {
      console.error('Error reporting post:', error);
    }
  };

  const renderReactionPicker = () => (
    <div
      className={`absolute bottom-full left-0 mb-2 p-2 rounded-lg shadow-lg
        ${isDark ? 'bg-gray-800' : 'bg-white'} flex space-x-2`}
    >
      <button
        onClick={() => handleReaction('like')}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <HandThumbUpIcon className="h-6 w-6 text-blue-500" />
      </button>
      <button
        onClick={() => handleReaction('love')}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <HeartIcon className="h-6 w-6 text-red-500" />
      </button>
      <button
        onClick={() => handleReaction('haha')}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <FaceSmileIcon className="h-6 w-6 text-yellow-500" />
      </button>
      <button
        onClick={() => handleReaction('wow')}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <FaceSurpriseIcon className="h-6 w-6 text-yellow-500" />
      </button>
      <button
        onClick={() => handleReaction('sad')}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <FaceFrownIcon className="h-6 w-6 text-yellow-500" />
      </button>
      <button
        onClick={() => handleReaction('angry')}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <FaceAngryIcon className="h-6 w-6 text-red-500" />
      </button>
    </div>
  );

  const renderComment = (comment, isReply = false) => (
    <div
      key={comment.id}
      className={`${isReply ? 'ml-12' : 'border-t'} py-4`}
    >
      <div className="flex items-start space-x-3">
        <img
          src={comment.user.photoURL}
          alt={comment.user.displayName}
          className="w-8 h-8 rounded-full"
        />
        <div className="flex-1">
          <div className={`rounded-lg p-3 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {comment.user.displayName}
            </p>
            <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>
              {comment.content}
            </p>
          </div>
          
          <div className="flex items-center space-x-4 mt-2 text-sm">
            <button
              onClick={() => handleReaction('like', comment.id)}
              className={`flex items-center space-x-1
                ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <HandThumbUpIcon className="h-4 w-4" />
              <span>{comment.reactions.like}</span>
            </button>
            
            <button
              onClick={() => setReplyingTo(comment)}
              className={isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}
            >
              Reply
            </button>
            
            <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>
              {format(new Date(comment.createdAt), 'MMM d, yyyy')}
            </span>
          </div>

          {/* Nested Replies */}
          {comment.replyCount > 0 && (
            <div className="mt-2">
              <button
                onClick={() => loadCommentReplies(comment.id)}
                className="text-blue-500 text-sm"
              >
                View {comment.replyCount} replies
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="mt-4">
      {/* Reaction Bar */}
      <div className="flex items-center justify-between border-t border-b py-2">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <button
              onMouseEnter={() => setShowReactionPicker(true)}
              onMouseLeave={() => setShowReactionPicker(false)}
              className={`flex items-center space-x-1 ${
                userReaction ? 'text-blue-500' : isDark ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              <HandThumbUpIcon className="h-5 w-5" />
              <span>React</span>
            </button>
            {showReactionPicker && renderReactionPicker()}
          </div>

          <button
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center space-x-1
              ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <ChatBubbleLeftIcon className="h-5 w-5" />
            <span>Comment</span>
          </button>

          <button
            onClick={() => setShowShareModal(true)}
            className={`flex items-center space-x-1
              ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <ShareIcon className="h-5 w-5" />
            <span>Share</span>
          </button>
        </div>

        <button
          onClick={() => setShowReportModal(true)}
          className={isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}
        >
          <FlagIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4">
          {/* Comment Input */}
          <div className="flex items-start space-x-3 mb-4">
            {user && (
              <>
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="w-8 h-8 rounded-full"
                />
                <div className="flex-1">
                  {replyingTo && (
                    <div className="text-sm text-blue-500 mb-2">
                      Replying to {replyingTo.user.displayName}
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="ml-2 text-gray-500"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className={`w-full p-3 rounded-lg resize-none
                      ${isDark
                        ? 'bg-gray-800 text-white placeholder-gray-400'
                        : 'bg-gray-100 text-gray-900 placeholder-gray-500'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    rows={3}
                  />
                  <button
                    onClick={handleComment}
                    disabled={!newComment.trim()}
                    className={`mt-2 px-4 py-2 rounded-lg
                      ${newComment.trim()
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                  >
                    Comment
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Comments List */}
          <div className="space-y-4">
            {comments.map((comment) => renderComment(comment))}
          </div>
        </div>
      )}

      {/* Share Modal */}
      <Modal
        isVisible={showShareModal}
        onBackdropPress={() => setShowShareModal(false)}
        className="m-6"
      >
        <div className={`rounded-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Share Post
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {['Facebook', 'Twitter', 'WhatsApp', 'Telegram'].map((platform) => (
              <button
                key={platform}
                onClick={() => handleShare(platform.toLowerCase())}
                className={`p-4 rounded-lg text-center
                  ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                {platform}
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Report Modal */}
      <Modal
        isVisible={showReportModal}
        onBackdropPress={() => setShowReportModal(false)}
        className="m-6"
      >
        <div className={`rounded-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Report Post
          </h3>
          
          <select
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            className={`w-full p-3 rounded-lg mb-4
              ${isDark
                ? 'bg-gray-700 text-white'
                : 'bg-gray-100 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          >
            <option value="">Select a reason</option>
            <option value="spam">Spam</option>
            <option value="harassment">Harassment</option>
            <option value="inappropriate">Inappropriate Content</option>
            <option value="violence">Violence</option>
            <option value="other">Other</option>
          </select>

          <textarea
            value={reportDetails}
            onChange={(e) => setReportDetails(e.target.value)}
            placeholder="Provide additional details..."
            className={`w-full p-3 rounded-lg mb-4 resize-none
              ${isDark
                ? 'bg-gray-700 text-white placeholder-gray-400'
                : 'bg-gray-100 text-gray-900 placeholder-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            rows={4}
          />

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowReportModal(false)}
              className={`px-4 py-2 rounded-lg
                ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}
            >
              Cancel
            </button>
            <button
              onClick={handleReport}
              disabled={!reportReason}
              className={`px-4 py-2 rounded-lg
                ${reportReason
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
            >
              Report
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PostInteractions;
