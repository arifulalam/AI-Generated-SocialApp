import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { eCommerceService } from '../../services/ECommerceService';
import { Helmet } from 'react-helmet';
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ShoppingCartIcon,
  HeartIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { debounce } from 'lodash';

const Shop = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    category: '',
    minPrice: '',
    maxPrice: '',
    tags: [],
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState(null);
  const [wishlist, setWishlist] = useState([]);

  // SEO metadata
  const pageTitle = 'Shop - Your One-Stop E-Commerce Destination';
  const pageDescription = 'Discover our wide range of products. From electronics to fashion, find everything you need with great deals and fast shipping.';
  const keywords = 'e-commerce, online shopping, deals, electronics, fashion, accessories';

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        eCommerceService.searchProducts({ limit: 20 }),
        loadCategories()
      ]);

      setProducts(productsData);
      setCategories(categoriesData);

      // Load cart and wishlist for logged-in users
      if (user) {
        const [cartData, wishlistData] = await Promise.all([
          eCommerceService.getOrCreateCart(user.uid),
          loadWishlist()
        ]);
        setCart(cartData);
        setWishlist(wishlistData);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const querySnapshot = await getDocs(eCommerceService.categoriesCollection);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error loading categories:', error);
      return [];
    }
  };

  const loadWishlist = async () => {
    try {
      const querySnapshot = await getDocs(
        query(eCommerceService.wishlistsCollection, where('userId', '==', user.uid))
      );
      return querySnapshot.docs.map(doc => doc.data().productId);
    } catch (error) {
      console.error('Error loading wishlist:', error);
      return [];
    }
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchTerm) => {
      try {
        setLoading(true);
        const results = await eCommerceService.searchProducts({
          ...filters,
          searchTerm,
          limit: 20
        });
        setProducts(results);
      } catch (error) {
        console.error('Error searching products:', error);
      } finally {
        setLoading(false);
      }
    }, 500),
    [filters]
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
    return () => debouncedSearch.cancel();
  }, [searchQuery, debouncedSearch]);

  const handleFilterChange = async (newFilters) => {
    setFilters(newFilters);
    try {
      setLoading(true);
      const results = await eCommerceService.searchProducts({
        ...newFilters,
        searchTerm: searchQuery,
        limit: 20
      });
      setProducts(results);
    } catch (error) {
      console.error('Error applying filters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (productId) => {
    if (!user) {
      // Show login prompt
      return;
    }

    try {
      await eCommerceService.addToCart(cart.id, productId);
      const updatedCart = await eCommerceService.getOrCreateCart(user.uid);
      setCart(updatedCart);
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const handleToggleWishlist = async (productId) => {
    if (!user) {
      // Show login prompt
      return;
    }

    try {
      if (wishlist.includes(productId)) {
        await eCommerceService.removeFromWishlist(user.uid, productId);
        setWishlist(wishlist.filter(id => id !== productId));
      } else {
        await eCommerceService.addToWishlist(user.uid, productId);
        setWishlist([...wishlist, productId]);
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
    }
  };

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="keywords" content={keywords} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <link rel="canonical" href={window.location.href} />
      </Helmet>

      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        {/* Header */}
        <header className={`sticky top-0 z-50 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              {/* Search Bar */}
              <div className="flex-1 max-w-lg">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className={`w-full pl-10 pr-4 py-2 rounded-lg
                      ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}
                      focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => {/* Show filters modal */}}
                  className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  <AdjustmentsHorizontalIcon className="h-6 w-6 text-gray-500" />
                </button>

                {user && (
                  <>
                    <button
                      onClick={() => {/* Show cart */}}
                      className="relative p-2 rounded-lg hover:bg-gray-100"
                    >
                      <ShoppingCartIcon className="h-6 w-6 text-gray-500" />
                      {cart?.items.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-blue-500 text-white
                          text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {cart.items.length}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => {/* Show wishlist */}}
                      className="p-2 rounded-lg hover:bg-gray-100"
                    >
                      <HeartIcon className="h-6 w-6 text-gray-500" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Categories */}
          <div className="mb-8">
            <h2 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Categories
            </h2>
            <div className="flex space-x-4 overflow-x-auto pb-4">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleFilterChange({ ...filters, category: category.id })}
                  className={`px-4 py-2 rounded-full whitespace-nowrap
                    ${filters.category === category.id
                      ? 'bg-blue-500 text-white'
                      : isDark
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? (
              // Loading skeletons
              Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className={`animate-pulse rounded-lg overflow-hidden
                    ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}
                >
                  <div className="h-48 bg-gray-300" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-300 rounded w-3/4" />
                    <div className="h-4 bg-gray-300 rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : (
              products.map((product) => (
                <div
                  key={product.id}
                  className={`rounded-lg overflow-hidden shadow-lg
                    ${isDark ? 'bg-gray-800' : 'bg-white'}`}
                >
                  {/* Product Image */}
                  <div className="relative group">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30
                      transition-opacity duration-200" />
                    
                    {/* Quick Actions */}
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2
                      opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={() => handleAddToCart(product.id)}
                        className="p-2 rounded-full bg-white text-gray-900 hover:bg-gray-100
                          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <ShoppingCartIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleToggleWishlist(product.id)}
                        className="p-2 rounded-full bg-white text-gray-900 hover:bg-gray-100
                          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <HeartIcon
                          className={`h-5 w-5 ${wishlist.includes(product.id) ? 'text-red-500' : ''}`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className={`text-lg font-medium mb-2
                      ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {product.name}
                    </h3>
                    
                    <div className="flex items-center mb-2">
                      <div className="flex items-center">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <StarIcon
                            key={index}
                            className={`h-4 w-4 ${
                              index < Math.floor(product.rating)
                                ? 'text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className={`ml-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        ({product.reviewCount})
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        ${product.price}
                      </span>
                      {product.inventory <= 5 && product.inventory > 0 && (
                        <span className="text-sm text-red-500">
                          Only {product.inventory} left!
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default Shop;
