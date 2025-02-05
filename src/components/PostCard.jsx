import { useState } from 'react';
import { db } from '../config/firebase';
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
} from 'firebase/firestore';
import {
  HeartIcon,
  ChatBubbleLeftIcon,
  ShareIcon,
  BookmarkIcon,
} from '@heroicons/react/24/outline';
import {
  HeartIcon as HeartIconSolid,
  BookmarkIcon as BookmarkIconSolid,
} from '@heroicons/react/24/solid';
import MessageReactions from './MessageReactions';
import { formatDistanceToNow } from 'date-fns';

const PostCard = ({ post, currentUser, onComment }) => {
  const [isBookmarked, setIsBookmarked] = useState(
    post.bookmarks?.includes(currentUser.uid)
  );

  const handleLike = async () => {
    const postRef = doc(db, 'posts', post.id);
    if (post.likes.includes(currentUser.uid)) {
      await updateDoc(postRef, {
        likes: arrayRemove(currentUser.uid),
      });
    } else {
      await updateDoc(postRef, {
        likes: arrayUnion(currentUser.uid),
      });
    }
  };

  const handleShare = async () => {
    const postRef = doc(db, 'posts', post.id);
    await updateDoc(postRef, {
      shares: increment(1),
    });

    // Create a share URL
    const shareUrl = `${window.location.origin}/post/${post.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title || 'Check out this post',
          text: post.content.slice(0, 100) + '...',
          url: shareUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    }
  };

  const handleBookmark = async () => {
    const postRef = doc(db, 'posts', post.id);
    if (isBookmarked) {
      await updateDoc(postRef, {
        bookmarks: arrayRemove(currentUser.uid),
      });
    } else {
      await updateDoc(postRef, {
        bookmarks: arrayUnion(currentUser.uid),
      });
    }
    setIsBookmarked(!isBookmarked);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      {/* Author Info */}
      <div className="flex items-center mb-4">
        <img
          src={post.authorPhoto || `https://ui-avatars.com/api/?name=${post.authorName}`}
          alt={post.authorName}
          className="w-10 h-10 rounded-full mr-3"
        />
        <div>
          <h3 className="font-semibold">{post.authorName}</h3>
          <p className="text-sm text-gray-500">
            {post.timestamp && formatDistanceToNow(post.timestamp.toDate(), { addSuffix: true })}
            {' · '}
            {post.privacy}
          </p>
        </div>
      </div>

      {/* Post Content */}
      {post.type === 'article' && (
        <h2 className="text-2xl font-bold mb-4">{post.title}</h2>
      )}
      
      <div
        className="prose max-w-none mb-4"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {/* Media */}
      {post.media && post.media.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {post.media.map((item, index) => (
            <div key={index} className="relative">
              {item.type === 'image' ? (
                <img
                  src={item.url}
                  alt=""
                  className="rounded-lg w-full h-40 object-cover"
                />
              ) : (
                <video
                  src={item.url}
                  className="rounded-lg w-full h-40 object-cover"
                  controls
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
        <div>{post.likes.length} likes</div>
        <div>{post.comments.length} comments</div>
        <div>{post.shares} shares</div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-b py-2 mb-4">
        <button
          onClick={handleLike}
          className={`flex items-center space-x-2 ${
            post.likes.includes(currentUser.uid)
              ? 'text-red-500'
              : 'text-gray-500 hover:text-red-500'
          }`}
        >
          {post.likes.includes(currentUser.uid) ? (
            <HeartIconSolid className="h-6 w-6" />
          ) : (
            <HeartIcon className="h-6 w-6" />
          )}
          <span>Like</span>
        </button>

        <button
          onClick={() => onComment(post)}
          className="flex items-center space-x-2 text-gray-500 hover:text-blue-500"
        >
          <ChatBubbleLeftIcon className="h-6 w-6" />
          <span>Comment</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center space-x-2 text-gray-500 hover:text-green-500"
        >
          <ShareIcon className="h-6 w-6" />
          <span>Share</span>
        </button>

        <button
          onClick={handleBookmark}
          className={`flex items-center space-x-2 ${
            isBookmarked ? 'text-yellow-500' : 'text-gray-500 hover:text-yellow-500'
          }`}
        >
          {isBookmarked ? (
            <BookmarkIconSolid className="h-6 w-6" />
          ) : (
            <BookmarkIcon className="h-6 w-6" />
          )}
          <span>Save</span>
        </button>
      </div>

      {/* Reactions */}
      <MessageReactions messageId={post.id} currentUser={currentUser} />

      {/* Comments Preview */}
      {post.comments.length > 0 && (
        <div className="mt-4 space-y-2">
          {post.comments.slice(0, 3).map((comment, index) => (
            <div key={index} className="flex items-start space-x-2">
              <img
                src={comment.authorPhoto || `https://ui-avatars.com/api/?name=${comment.authorName}`}
                alt={comment.authorName}
                className="w-8 h-8 rounded-full"
              />
              <div className="flex-1 bg-gray-100 rounded-lg p-2">
                <div className="font-semibold">{comment.authorName}</div>
                <p>{comment.content}</p>
              </div>
            </div>
          ))}
          {post.comments.length > 3 && (
            <button
              onClick={() => onComment(post)}
              className="text-blue-500 hover:text-blue-700 text-sm"
            >
              View all {post.comments.length} comments
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PostCard;
