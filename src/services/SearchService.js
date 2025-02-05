import { db } from '../config/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
  or,
  and
} from 'firebase/firestore';

export class SearchService {
  static async searchAll(searchQuery, filters = {}, lastVisible = null, itemsPerPage = 20) {
    try {
      const results = {
        users: [],
        pages: [],
        groups: [],
        products: [],
        posts: []
      };

      // Normalize search query
      const normalizedQuery = searchQuery.toLowerCase().trim();
      
      // Run searches in parallel
      const [users, pages, groups, products, posts] = await Promise.all([
        this.searchUsers(normalizedQuery, filters, lastVisible, itemsPerPage),
        this.searchPages(normalizedQuery, filters, lastVisible, itemsPerPage),
        this.searchGroups(normalizedQuery, filters, lastVisible, itemsPerPage),
        this.searchProducts(normalizedQuery, filters, lastVisible, itemsPerPage),
        this.searchPosts(normalizedQuery, filters, lastVisible, itemsPerPage)
      ]);

      results.users = users;
      results.pages = pages;
      results.groups = groups;
      results.products = products;
      results.posts = posts;

      return results;
    } catch (error) {
      console.error('Error in global search:', error);
      throw error;
    }
  }

  static async searchUsers(searchQuery, filters = {}, lastVisible = null, itemsPerPage = 20) {
    try {
      const usersRef = collection(db, 'users');
      let q = query(
        usersRef,
        or(
          where('username', '>=', searchQuery),
          where('username', '<=', searchQuery + '\uf8ff'),
          where('displayName', '>=', searchQuery),
          where('displayName', '<=', searchQuery + '\uf8ff'),
          where('searchTags', 'array-contains', searchQuery)
        )
      );

      if (filters.location) {
        q = query(q, where('location', '==', filters.location));
      }

      if (lastVisible) {
        q = query(q, startAfter(lastVisible));
      }

      q = query(q, limit(itemsPerPage));

      const snapshot = await getDocs(q);
      return {
        items: snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: 'user'
        })),
        lastVisible: snapshot.docs[snapshot.docs.length - 1]
      };
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  static async searchPages(searchQuery, filters = {}, lastVisible = null, itemsPerPage = 20) {
    try {
      const pagesRef = collection(db, 'pages');
      let q = query(
        pagesRef,
        or(
          where('username', '>=', searchQuery),
          where('username', '<=', searchQuery + '\uf8ff'),
          where('name', '>=', searchQuery),
          where('name', '<=', searchQuery + '\uf8ff'),
          where('searchTags', 'array-contains', searchQuery)
        )
      );

      if (filters.category) {
        q = query(q, where('category', '==', filters.category));
      }

      if (lastVisible) {
        q = query(q, startAfter(lastVisible));
      }

      q = query(q, limit(itemsPerPage));

      const snapshot = await getDocs(q);
      return {
        items: snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: 'page'
        })),
        lastVisible: snapshot.docs[snapshot.docs.length - 1]
      };
    } catch (error) {
      console.error('Error searching pages:', error);
      throw error;
    }
  }

  static async searchGroups(searchQuery, filters = {}, lastVisible = null, itemsPerPage = 20) {
    try {
      const groupsRef = collection(db, 'groups');
      let q = query(
        groupsRef,
        or(
          where('username', '>=', searchQuery),
          where('username', '<=', searchQuery + '\uf8ff'),
          where('name', '>=', searchQuery),
          where('name', '<=', searchQuery + '\uf8ff'),
          where('searchTags', 'array-contains', searchQuery)
        )
      );

      if (filters.category) {
        q = query(q, where('category', '==', filters.category));
      }

      if (filters.privacy) {
        q = query(q, where('privacy', '==', filters.privacy));
      }

      if (lastVisible) {
        q = query(q, startAfter(lastVisible));
      }

      q = query(q, limit(itemsPerPage));

      const snapshot = await getDocs(q);
      return {
        items: snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: 'group'
        })),
        lastVisible: snapshot.docs[snapshot.docs.length - 1]
      };
    } catch (error) {
      console.error('Error searching groups:', error);
      throw error;
    }
  }

  static async searchProducts(searchQuery, filters = {}, lastVisible = null, itemsPerPage = 20) {
    try {
      const productsRef = collection(db, 'products');
      let q = query(
        productsRef,
        and(
          where('isPublished', '==', true),
          or(
            where('name', '>=', searchQuery),
            where('name', '<=', searchQuery + '\uf8ff'),
            where('searchTags', 'array-contains', searchQuery)
          )
        )
      );

      if (filters.category) {
        q = query(q, where('category', '==', filters.category));
      }

      if (filters.minPrice) {
        q = query(q, where('price', '>=', filters.minPrice));
      }

      if (filters.maxPrice) {
        q = query(q, where('price', '<=', filters.maxPrice));
      }

      if (filters.storeId) {
        q = query(q, where('storeId', '==', filters.storeId));
      }

      if (lastVisible) {
        q = query(q, startAfter(lastVisible));
      }

      q = query(q, limit(itemsPerPage));

      const snapshot = await getDocs(q);
      return {
        items: snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: 'product'
        })),
        lastVisible: snapshot.docs[snapshot.docs.length - 1]
      };
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }

  static async searchPosts(searchQuery, filters = {}, lastVisible = null, itemsPerPage = 20) {
    try {
      const postsRef = collection(db, 'posts');
      let q = query(
        postsRef,
        or(
          where('content', '>=', searchQuery),
          where('content', '<=', searchQuery + '\uf8ff'),
          where('searchTags', 'array-contains', searchQuery)
        )
      );

      if (filters.type) {
        q = query(q, where('type', '==', filters.type));
      }

      if (filters.userId) {
        q = query(q, where('userId', '==', filters.userId));
      }

      if (lastVisible) {
        q = query(q, startAfter(lastVisible));
      }

      q = query(q, orderBy('createdAt', 'desc'), limit(itemsPerPage));

      const snapshot = await getDocs(q);
      return {
        items: snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: 'post'
        })),
        lastVisible: snapshot.docs[snapshot.docs.length - 1]
      };
    } catch (error) {
      console.error('Error searching posts:', error);
      throw error;
    }
  }

  static async getMentionSuggestions(query, type = 'all') {
    try {
      const suggestions = [];
      const normalizedQuery = query.toLowerCase().trim();

      if (type === 'all' || type === 'user') {
        const users = await this.searchUsers(normalizedQuery, {}, null, 5);
        suggestions.push(...users.items);
      }

      if (type === 'all' || type === 'page') {
        const pages = await this.searchPages(normalizedQuery, {}, null, 5);
        suggestions.push(...pages.items);
      }

      if (type === 'all' || type === 'group') {
        const groups = await this.searchGroups(normalizedQuery, {}, null, 5);
        suggestions.push(...groups.items);
      }

      return suggestions.map(item => ({
        id: item.id,
        username: item.username,
        displayName: item.displayName || item.name,
        avatar: item.avatar || item.photo,
        type: item.type
      }));
    } catch (error) {
      console.error('Error getting mention suggestions:', error);
      throw error;
    }
  }

  static async validateUsername(username, type = 'user') {
    try {
      // Check username format
      const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
      if (!usernameRegex.test(username)) {
        throw new Error('Username must be 3-30 characters long and can only contain letters, numbers, and underscores');
      }

      // Check if username is reserved
      const reservedUsernames = ['admin', 'support', 'help', 'system'];
      if (reservedUsernames.includes(username.toLowerCase())) {
        throw new Error('This username is reserved');
      }

      // Check if username exists in any collection
      const collections = ['users', 'pages', 'groups'];
      for (const collectionName of collections) {
        const collectionRef = collection(db, collectionName);
        const q = query(collectionRef, where('username', '==', username.toLowerCase()));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          throw new Error('Username is already taken');
        }
      }

      return true;
    } catch (error) {
      console.error('Error validating username:', error);
      throw error;
    }
  }

  static generateSearchTags(item) {
    const tags = new Set();
    const addToTags = (text) => {
      if (!text) return;
      // Split text into words and add to tags
      text.toLowerCase()
        .split(/[\s,.-]+/)
        .filter(word => word.length >= 3)
        .forEach(word => tags.add(word));
    };

    // Add relevant fields to search tags based on item type
    switch (item.type) {
      case 'user':
        addToTags(item.username);
        addToTags(item.displayName);
        addToTags(item.bio);
        break;
      case 'page':
      case 'group':
        addToTags(item.username);
        addToTags(item.name);
        addToTags(item.description);
        addToTags(item.category);
        break;
      case 'product':
        addToTags(item.name);
        addToTags(item.description);
        addToTags(item.category);
        item.tags?.forEach(tag => addToTags(tag));
        break;
      case 'post':
        addToTags(item.content);
        item.tags?.forEach(tag => addToTags(tag));
        break;
    }

    return Array.from(tags);
  }
}
