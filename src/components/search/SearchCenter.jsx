import { useState, useEffect, useRef } from 'react';
import { SearchService } from '../../services/SearchService';
import {
  MagnifyingGlassIcon,
  UserIcon,
  UserGroupIcon,
  BuildingStorefrontIcon,
  ChatBubbleLeftIcon,
  HashtagIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

const SearchCenter = ({ user }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    type: 'all',
    category: '',
    minPrice: '',
    maxPrice: '',
    location: '',
    privacy: ''
  });
  const [results, setResults] = useState({
    users: { items: [], lastVisible: null },
    pages: { items: [], lastVisible: null },
    groups: { items: [], lastVisible: null },
    products: { items: [], lastVisible: null },
    posts: { items: [], lastVisible: null }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const searchTimeout = useRef(null);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      // Debounce search
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
      searchTimeout.current = setTimeout(() => {
        performSearch();
      }, 300);
    } else {
      setResults({
        users: { items: [], lastVisible: null },
        pages: { items: [], lastVisible: null },
        groups: { items: [], lastVisible: null },
        products: { items: [], lastVisible: null },
        posts: { items: [], lastVisible: null }
      });
    }

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchQuery, filters]);

  const performSearch = async (loadMore = false) => {
    if (searchQuery.length < 2) return;

    setIsLoading(true);
    try {
      const searchResults = await SearchService.searchAll(
        searchQuery,
        filters,
        loadMore ? results[activeTab].lastVisible : null
      );

      if (loadMore) {
        setResults(prev => ({
          ...prev,
          [activeTab]: {
            items: [...prev[activeTab].items, ...searchResults[activeTab].items],
            lastVisible: searchResults[activeTab].lastVisible
          }
        }));
      } else {
        setResults(searchResults);
      }
    } catch (error) {
      console.error('Error performing search:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const renderUserResult = (user) => (
    <Link
      to={`/profile/${user.username}`}
      className="flex items-center p-4 hover:bg-gray-50 rounded-lg"
    >
      <img
        src={user.avatar || '/default-avatar.png'}
        alt={user.displayName}
        className="w-12 h-12 rounded-full"
      />
      <div className="ml-4">
        <h3 className="font-medium">{user.displayName}</h3>
        <p className="text-sm text-gray-600">@{user.username}</p>
      </div>
    </Link>
  );

  const renderPageResult = (page) => (
    <Link
      to={`/page/${page.username}`}
      className="flex items-center p-4 hover:bg-gray-50 rounded-lg"
    >
      <img
        src={page.photo || '/default-page.png'}
        alt={page.name}
        className="w-12 h-12 rounded-lg"
      />
      <div className="ml-4">
        <h3 className="font-medium">{page.name}</h3>
        <p className="text-sm text-gray-600">@{page.username}</p>
        <p className="text-sm text-gray-500">{page.category}</p>
      </div>
    </Link>
  );

  const renderGroupResult = (group) => (
    <Link
      to={`/group/${group.username}`}
      className="flex items-center p-4 hover:bg-gray-50 rounded-lg"
    >
      <img
        src={group.photo || '/default-group.png'}
        alt={group.name}
        className="w-12 h-12 rounded-lg"
      />
      <div className="ml-4">
        <h3 className="font-medium">{group.name}</h3>
        <p className="text-sm text-gray-600">@{group.username}</p>
        <div className="flex items-center text-sm text-gray-500">
          <span>{group.category}</span>
          <span className="mx-2">•</span>
          <span>{group.privacy}</span>
        </div>
      </div>
    </Link>
  );

  const renderProductResult = (product) => (
    <Link
      to={`/product/${product.id}`}
      className="flex items-center p-4 hover:bg-gray-50 rounded-lg"
    >
      <img
        src={product.images[0] || '/default-product.png'}
        alt={product.name}
        className="w-16 h-16 object-cover rounded-lg"
      />
      <div className="ml-4 flex-1">
        <h3 className="font-medium">{product.name}</h3>
        <p className="text-sm text-gray-600">{product.category}</p>
        <p className="text-sm font-medium text-blue-600">
          ${product.price.toFixed(2)}
        </p>
      </div>
    </Link>
  );

  const renderPostResult = (post) => (
    <Link
      to={`/post/${post.id}`}
      className="block p-4 hover:bg-gray-50 rounded-lg"
    >
      <div className="flex items-center mb-2">
        <img
          src={post.userAvatar || '/default-avatar.png'}
          alt={post.userName}
          className="w-8 h-8 rounded-full"
        />
        <div className="ml-2">
          <span className="font-medium">{post.userName}</span>
          <span className="text-sm text-gray-500 ml-2">
            {new Date(post.createdAt.toDate()).toLocaleDateString()}
          </span>
        </div>
      </div>
      <p className="text-gray-800">{post.content}</p>
      {post.image && (
        <img
          src={post.image}
          alt="Post"
          className="mt-2 rounded-lg max-h-48 object-cover"
        />
      )}
    </Link>
  );

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Search Input */}
      <div className="relative">
        <div className="flex items-center border rounded-lg focus-within:ring-2 focus-within:ring-blue-500">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 ml-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for people, pages, groups, products..."
            className="w-full p-3 focus:outline-none"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-3 hover:bg-gray-100 rounded-r-lg"
          >
            <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="absolute z-10 mt-2 w-full bg-white rounded-lg shadow-lg border p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Type
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="user">Users</option>
                  <option value="page">Pages</option>
                  <option value="group">Groups</option>
                  <option value="product">Products</option>
                  <option value="post">Posts</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Category
                </label>
                <input
                  type="text"
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter category"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Min Price
                </label>
                <input
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Min price"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Max Price
                </label>
                <input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Max price"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Tabs */}
      {searchQuery.length >= 2 && (
        <div className="mt-6">
          <div className="border-b">
            <nav className="flex space-x-4">
              <button
                onClick={() => setActiveTab('all')}
                className={`py-2 px-4 ${
                  activeTab === 'all'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All Results
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`py-2 px-4 ${
                  activeTab === 'users'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Users
              </button>
              <button
                onClick={() => setActiveTab('pages')}
                className={`py-2 px-4 ${
                  activeTab === 'pages'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Pages
              </button>
              <button
                onClick={() => setActiveTab('groups')}
                className={`py-2 px-4 ${
                  activeTab === 'groups'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Groups
              </button>
              <button
                onClick={() => setActiveTab('products')}
                className={`py-2 px-4 ${
                  activeTab === 'products'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Products
              </button>
              <button
                onClick={() => setActiveTab('posts')}
                className={`py-2 px-4 ${
                  activeTab === 'posts'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Posts
              </button>
            </nav>
          </div>

          {/* Results */}
          <div className="mt-4">
            {isLoading && searchQuery.length >= 2 ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-gray-500">Searching...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeTab === 'all' && (
                  <>
                    {results.users.items.map(user => renderUserResult(user))}
                    {results.pages.items.map(page => renderPageResult(page))}
                    {results.groups.items.map(group => renderGroupResult(group))}
                    {results.products.items.map(product => renderProductResult(product))}
                    {results.posts.items.map(post => renderPostResult(post))}
                  </>
                )}
                {activeTab === 'users' && results.users.items.map(user => renderUserResult(user))}
                {activeTab === 'pages' && results.pages.items.map(page => renderPageResult(page))}
                {activeTab === 'groups' && results.groups.items.map(group => renderGroupResult(group))}
                {activeTab === 'products' && results.products.items.map(product => renderProductResult(product))}
                {activeTab === 'posts' && results.posts.items.map(post => renderPostResult(post))}

                {results[activeTab]?.items.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No results found
                  </div>
                )}

                {results[activeTab]?.lastVisible && (
                  <div className="text-center py-4">
                    <button
                      onClick={() => performSearch(true)}
                      className="btn bg-gray-100 hover:bg-gray-200 text-gray-700"
                    >
                      Load More
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchCenter;
