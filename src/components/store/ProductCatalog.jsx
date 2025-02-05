import { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, orderBy, limit, startAfter } from 'firebase/firestore';
import { StarIcon, HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

const ProductCatalog = ({ storeId = null, user }) => {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    category: '',
    minPrice: '',
    maxPrice: '',
    sortBy: 'newest',
    inStock: false
  });
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [wishlist, setWishlist] = useState([]);

  const categories = [
    'Fashion & Apparel',
    'Electronics & Gadgets',
    'Home & Living',
    'Health & Beauty',
    'Sports & Fitness',
    'Books & Stationery',
    'Toys & Games',
    'Food & Beverages',
    'Art & Crafts',
    'Automotive',
    'Pet Supplies',
    'Garden & Outdoor',
    'Office Supplies',
    'Musical Instruments',
    'Baby & Kids'
  ];

  useEffect(() => {
    loadProducts();
    if (user) {
      loadWishlist();
    }
  }, [filters]);

  const loadWishlist = async () => {
    try {
      const wishlistRef = collection(db, 'wishlists');
      const q = query(wishlistRef, where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const wishlistData = snapshot.docs[0].data();
        setWishlist(wishlistData.products || []);
      }
    } catch (error) {
      console.error('Error loading wishlist:', error);
    }
  };

  const loadProducts = async (loadMore = false) => {
    setIsLoading(true);
    try {
      const productsRef = collection(db, 'products');
      let q = query(productsRef, where('isPublished', '==', true));

      // Apply store filter
      if (storeId) {
        q = query(q, where('storeId', '==', storeId));
      }

      // Apply category filter
      if (filters.category) {
        q = query(q, where('category', '==', filters.category.toLowerCase()));
      }

      // Apply price filters
      if (filters.minPrice) {
        q = query(q, where('price', '>=', parseFloat(filters.minPrice)));
      }
      if (filters.maxPrice) {
        q = query(q, where('price', '<=', parseFloat(filters.maxPrice)));
      }

      // Apply stock filter
      if (filters.inStock) {
        q = query(q, where('quantity', '>', 0));
      }

      // Apply sorting
      switch (filters.sortBy) {
        case 'newest':
          q = query(q, orderBy('createdAt', 'desc'));
          break;
        case 'price-low':
          q = query(q, orderBy('price', 'asc'));
          break;
        case 'price-high':
          q = query(q, orderBy('price', 'desc'));
          break;
        case 'popular':
          q = query(q, orderBy('rating', 'desc'));
          break;
      }

      // Apply pagination
      q = query(q, limit(12));
      if (loadMore && lastVisible) {
        q = query(q, startAfter(lastVisible));
      }

      const snapshot = await getDocs(q);
      const lastVisible = snapshot.docs[snapshot.docs.length - 1];
      setLastVisible(lastVisible);
      setHasMore(snapshot.docs.length === 12);

      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setProducts(loadMore ? [...products, ...productsData] : productsData);
    } catch (error) {
      console.error('Error loading products:', error);
      setError('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setLastVisible(null); // Reset pagination when filters change
  };

  const toggleWishlist = async (productId) => {
    if (!user) return;

    try {
      const wishlistRef = collection(db, 'wishlists');
      const q = query(wishlistRef, where('userId', '==', user.uid));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        // Create new wishlist
        await addDoc(wishlistRef, {
          userId: user.uid,
          products: [productId]
        });
        setWishlist([productId]);
      } else {
        // Update existing wishlist
        const wishlistDoc = snapshot.docs[0];
        const currentProducts = wishlistDoc.data().products || [];
        const updatedProducts = currentProducts.includes(productId)
          ? currentProducts.filter(id => id !== productId)
          : [...currentProducts, productId];

        await updateDoc(wishlistDoc.ref, { products: updatedProducts });
        setWishlist(updatedProducts);
      }
    } catch (error) {
      console.error('Error updating wishlist:', error);
    }
  };

  const addToCart = async (product) => {
    if (!user) return;

    try {
      const cartRef = doc(db, 'carts', user.uid);
      const cartDoc = await getDoc(cartRef);

      if (!cartDoc.exists()) {
        // Create new cart
        await setDoc(cartRef, {
          userId: user.uid,
          items: [{
            productId: product.id,
            quantity: 1
          }]
        });
      } else {
        // Update existing cart
        const currentItems = cartDoc.data().items || [];
        const existingItem = currentItems.find(item => item.productId === product.id);

        if (existingItem) {
          existingItem.quantity += 1;
          await updateDoc(cartRef, { items: currentItems });
        } else {
          await updateDoc(cartRef, {
            items: [...currentItems, {
              productId: product.id,
              quantity: 1
            }]
          });
        }
      }
    } catch (error) {
      console.error('Error updating cart:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      {/* Filters */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
        <select
          value={filters.category}
          onChange={(e) => handleFilterChange('category', e.target.value)}
          className="input"
        >
          <option value="">All Categories</option>
          {categories.map(category => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Min Price"
          value={filters.minPrice}
          onChange={(e) => handleFilterChange('minPrice', e.target.value)}
          className="input"
        />

        <input
          type="number"
          placeholder="Max Price"
          value={filters.maxPrice}
          onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
          className="input"
        />

        <select
          value={filters.sortBy}
          onChange={(e) => handleFilterChange('sortBy', e.target.value)}
          className="input"
        >
          <option value="newest">Newest First</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
          <option value="popular">Most Popular</option>
        </select>

        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={filters.inStock}
            onChange={(e) => handleFilterChange('inStock', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span>In Stock Only</span>
        </label>
      </div>

      {/* Products Grid */}
      {isLoading && products.length === 0 ? (
        <div className="text-center py-8">
          <p>Loading products...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-600">
          <p>{error}</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-8">
          <p>No products found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map(product => (
            <div
              key={product.id}
              className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="relative">
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-48 object-cover"
                />
                <button
                  onClick={() => toggleWishlist(product.id)}
                  className="absolute top-2 right-2 p-2 rounded-full bg-white shadow-md hover:bg-gray-100"
                >
                  {wishlist.includes(product.id) ? (
                    <HeartSolidIcon className="h-5 w-5 text-red-500" />
                  ) : (
                    <HeartIcon className="h-5 w-5 text-gray-500" />
                  )}
                </button>
              </div>

              <div className="p-4">
                <h3 className="font-medium mb-1 truncate">{product.name}</h3>
                <div className="flex items-center mb-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <StarIcon
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.floor(product.rating)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600 ml-1">
                    ({product.reviews?.length || 0})
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-lg">
                      ${product.price.toFixed(2)}
                    </span>
                    {product.comparePrice && (
                      <span className="text-sm text-gray-500 line-through ml-2">
                        ${product.comparePrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => addToCart(product)}
                    disabled={product.quantity === 0}
                    className={`btn ${
                      product.quantity === 0
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {product.quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center mt-8">
          <button
            onClick={() => loadProducts(true)}
            disabled={isLoading}
            className="btn bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductCatalog;
