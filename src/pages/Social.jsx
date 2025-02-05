import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import PostEditor from '../components/PostEditor';
import PostCard from '../components/PostCard';
import {
  PencilSquareIcon,
  NewspaperIcon,
  BookmarkIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

const Social = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [showEditor, setShowEditor] = useState(false);
  const [isArticle, setIsArticle] = useState(false);
  const [activeTab, setActiveTab] = useState('feed'); // feed, articles, saved, friends
  const [friends, setFriends] = useState([]);

  useEffect(() => {
    // Get user's friends
    const fetchFriends = async () => {
      const friendsRef = collection(db, 'friends');
      const q = query(
        friendsRef,
        where('users', 'array-contains', user.uid)
      );
      const snapshot = await getDocs(q);
      const friendsList = snapshot.docs.map(doc => doc.data());
      setFriends(friendsList);
    };

    fetchFriends();
  }, [user.uid]);

  useEffect(() => {
    let postsQuery;

    switch (activeTab) {
      case 'articles':
        postsQuery = query(
          collection(db, 'posts'),
          where('type', '==', 'article'),
          where('privacy', '==', 'public'),
          orderBy('timestamp', 'desc'),
          limit(20)
        );
        break;
      case 'saved':
        postsQuery = query(
          collection(db, 'posts'),
          where('bookmarks', 'array-contains', user.uid),
          orderBy('timestamp', 'desc'),
          limit(20)
        );
        break;
      case 'friends':
        const friendIds = friends.map(f => 
          f.users.find(id => id !== user.uid)
        );
        postsQuery = query(
          collection(db, 'posts'),
          where('authorId', 'in', friendIds),
          orderBy('timestamp', 'desc'),
          limit(20)
        );
        break;
      default: // feed
        postsQuery = query(
          collection(db, 'posts'),
          where('privacy', '==', 'public'),
          orderBy('timestamp', 'desc'),
          limit(20)
        );
    }

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const postsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPosts(postsList);
    });

    return () => unsubscribe();
  }, [activeTab, user.uid, friends]);

  const handleComment = (post) => {
    // Implement comment modal/form
    console.log('Comment on post:', post.id);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveTab('feed')}
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  activeTab === 'feed'
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Feed
              </button>
              <button
                onClick={() => setActiveTab('articles')}
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  activeTab === 'articles'
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Articles
              </button>
              <button
                onClick={() => setActiveTab('saved')}
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  activeTab === 'saved'
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Saved
              </button>
              <button
                onClick={() => setActiveTab('friends')}
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  activeTab === 'friends'
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Friends
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create Post Buttons */}
        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => {
              setIsArticle(false);
              setShowEditor(true);
            }}
            className="flex-1 btn btn-primary flex items-center justify-center space-x-2"
          >
            <PencilSquareIcon className="h-5 w-5" />
            <span>Create Post</span>
          </button>
          <button
            onClick={() => {
              setIsArticle(true);
              setShowEditor(true);
            }}
            className="flex-1 btn bg-green-600 hover:bg-green-700 text-white flex items-center justify-center space-x-2"
          >
            <NewspaperIcon className="h-5 w-5" />
            <span>Write Article</span>
          </button>
        </div>

        {/* Post Editor Modal */}
        {showEditor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <PostEditor
              user={user}
              onClose={() => {
                setShowEditor(false);
                setIsArticle(false);
              }}
              isArticle={isArticle}
            />
          </div>
        )}

        {/* Posts Feed */}
        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={user}
              onComment={handleComment}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Social;
