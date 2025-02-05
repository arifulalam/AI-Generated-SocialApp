import { db, storage } from '../config/firebase';
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

class ECommerceService {
  constructor() {
    this.productsCollection = collection(db, 'products');
    this.categoriesCollection = collection(db, 'categories');
    this.ordersCollection = collection(db, 'orders');
    this.cartsCollection = collection(db, 'carts');
    this.reviewsCollection = collection(db, 'reviews');
    this.wishlistsCollection = collection(db, 'wishlists');
    this.promotionsCollection = collection(db, 'promotions');
  }

  // Product Management
  async createProduct(productData, images) {
    try {
      // Upload images first
      const imageUrls = await Promise.all(
        images.map(async (image) => {
          const imageRef = ref(storage, `products/${uuidv4()}`);
          await uploadBytes(imageRef, image);
          return getDownloadURL(imageRef);
        })
      );

      // Create SEO-friendly slug
      const slug = this.createSlug(productData.name);

      // Add product to Firestore
      const productRef = await addDoc(this.productsCollection, {
        ...productData,
        images: imageUrls,
        slug,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // SEO metadata
        meta: {
          title: productData.name,
          description: this.truncate(productData.description, 160),
          keywords: this.generateKeywords(productData),
          structuredData: this.generateProductStructuredData(productData, imageUrls[0])
        }
      });

      return productRef.id;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  async updateProduct(productId, updates, newImages = []) {
    try {
      const productRef = doc(this.productsCollection, productId);
      
      // Upload new images if any
      if (newImages.length > 0) {
        const newImageUrls = await Promise.all(
          newImages.map(async (image) => {
            const imageRef = ref(storage, `products/${uuidv4()}`);
            await uploadBytes(imageRef, image);
            return getDownloadURL(imageRef);
          })
        );
        updates.images = [...(updates.images || []), ...newImageUrls];
      }

      // Update SEO metadata if name or description changed
      if (updates.name || updates.description) {
        updates.meta = {
          title: updates.name,
          description: this.truncate(updates.description, 160),
          keywords: this.generateKeywords({ ...updates }),
          structuredData: this.generateProductStructuredData({ ...updates }, updates.images?.[0])
        };
      }

      await updateDoc(productRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  // Product Retrieval with SEO Support
  async getProduct(productId) {
    try {
      const productRef = doc(this.productsCollection, productId);
      const productDoc = await getDoc(productRef);
      
      if (!productDoc.exists()) {
        throw new Error('Product not found');
      }

      return {
        id: productDoc.id,
        ...productDoc.data()
      };
    } catch (error) {
      console.error('Error getting product:', error);
      throw error;
    }
  }

  async getProductBySlug(slug) {
    try {
      const q = query(this.productsCollection, where('slug', '==', slug));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('Product not found');
      }

      const productDoc = querySnapshot.docs[0];
      return {
        id: productDoc.id,
        ...productDoc.data()
      };
    } catch (error) {
      console.error('Error getting product by slug:', error);
      throw error;
    }
  }

  async searchProducts(params) {
    try {
      let q = this.productsCollection;

      // Apply filters
      if (params.category) {
        q = query(q, where('category', '==', params.category));
      }
      if (params.minPrice) {
        q = query(q, where('price', '>=', params.minPrice));
      }
      if (params.maxPrice) {
        q = query(q, where('price', '<=', params.maxPrice));
      }
      if (params.tags && params.tags.length > 0) {
        q = query(q, where('tags', 'array-contains-any', params.tags));
      }

      // Apply sorting
      if (params.sortBy) {
        q = query(q, orderBy(params.sortBy, params.sortOrder || 'asc'));
      }

      // Apply pagination
      if (params.lastVisible) {
        q = query(q, startAfter(params.lastVisible));
      }
      q = query(q, limit(params.limit || 20));

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }

  // Category Management
  async createCategory(categoryData, image) {
    try {
      // Upload category image
      let imageUrl = null;
      if (image) {
        const imageRef = ref(storage, `categories/${uuidv4()}`);
        await uploadBytes(imageRef, image);
        imageUrl = await getDownloadURL(imageRef);
      }

      // Create SEO-friendly slug
      const slug = this.createSlug(categoryData.name);

      const categoryRef = await addDoc(this.categoriesCollection, {
        ...categoryData,
        image: imageUrl,
        slug,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // SEO metadata
        meta: {
          title: categoryData.name,
          description: this.truncate(categoryData.description, 160),
          keywords: this.generateKeywords(categoryData)
        }
      });

      return categoryRef.id;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  // Order Management
  async createOrder(orderData) {
    try {
      // Add order
      const orderRef = await addDoc(this.ordersCollection, {
        ...orderData,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update product inventory
      await Promise.all(
        orderData.items.map(async (item) => {
          const productRef = doc(this.productsCollection, item.productId);
          await updateDoc(productRef, {
            inventory: increment(-item.quantity)
          });
        })
      );

      return orderRef.id;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  // Cart Management
  async getOrCreateCart(userId) {
    try {
      const q = query(this.cartsCollection, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const cartDoc = querySnapshot.docs[0];
        return {
          id: cartDoc.id,
          ...cartDoc.data()
        };
      }

      // Create new cart if none exists
      const cartRef = await addDoc(this.cartsCollection, {
        userId,
        items: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return {
        id: cartRef.id,
        userId,
        items: []
      };
    } catch (error) {
      console.error('Error getting/creating cart:', error);
      throw error;
    }
  }

  // Review Management
  async addReview(productId, userId, reviewData) {
    try {
      const reviewRef = await addDoc(this.reviewsCollection, {
        productId,
        userId,
        ...reviewData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update product rating
      const q = query(this.reviewsCollection, where('productId', '==', productId));
      const querySnapshot = await getDocs(q);
      
      const reviews = querySnapshot.docs.map(doc => doc.data());
      const avgRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;

      await updateDoc(doc(this.productsCollection, productId), {
        rating: avgRating,
        reviewCount: increment(1)
      });

      return reviewRef.id;
    } catch (error) {
      console.error('Error adding review:', error);
      throw error;
    }
  }

  // Helper Methods
  createSlug(text) {
    return text
      .toLowerCase()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-');
  }

  truncate(text, maxLength) {
    if (!text) return '';
    return text.length <= maxLength ? text : text.substr(0, maxLength - 3) + '...';
  }

  generateKeywords(data) {
    const keywords = new Set();
    
    // Add name words
    data.name?.toLowerCase().split(' ').forEach(word => keywords.add(word));
    
    // Add category
    if (data.category) keywords.add(data.category.toLowerCase());
    
    // Add tags
    data.tags?.forEach(tag => keywords.add(tag.toLowerCase()));
    
    return Array.from(keywords);
  }

  generateProductStructuredData(product, imageUrl) {
    return {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: product.name,
      description: product.description,
      image: imageUrl,
      sku: product.sku,
      mpn: product.mpn,
      brand: {
        '@type': 'Brand',
        name: product.brand
      },
      offers: {
        '@type': 'Offer',
        url: `${window.location.origin}/product/${product.slug}`,
        priceCurrency: 'USD',
        price: product.price,
        availability: product.inventory > 0 ? 'InStock' : 'OutOfStock'
      }
    };
  }
}

export const eCommerceService = new ECommerceService();
