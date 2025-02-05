import { db } from '../config/firebase';
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  increment,
  serverTimestamp
} from 'firebase/firestore';

class EnhancedSocialService {
  constructor() {
    this.hashtagsCollection = collection(db, 'hashtags');
    this.mentionsCollection = collection(db, 'mentions');
    this.moderationCollection = collection(db, 'moderation');
    this.analyticsCollection = collection(db, 'analytics');
    this.trendingCollection = collection(db, 'trending');
  }

  // Hashtag Management
  async processHashtags(content, postId) {
    try {
      // Extract hashtags from content
      const hashtags = content.match(/#[\w]+/g) || [];
      const uniqueHashtags = [...new Set(hashtags.map(tag => tag.toLowerCase()))];

      // Update hashtag collection
      await Promise.all(uniqueHashtags.map(async (tag) => {
        const hashtagRef = doc(this.hashtagsCollection, tag.slice(1));
        const hashtagDoc = await getDoc(hashtagRef);

        if (hashtagDoc.exists()) {
          await updateDoc(hashtagRef, {
            count: increment(1),
            posts: arrayUnion(postId),
            lastUsed: serverTimestamp()
          });
        } else {
          await addDoc(this.hashtagsCollection, {
            tag: tag.slice(1),
            count: 1,
            posts: [postId],
            createdAt: serverTimestamp(),
            lastUsed: serverTimestamp()
          });
        }
      }));

      return uniqueHashtags;
    } catch (error) {
      console.error('Error processing hashtags:', error);
      throw error;
    }
  }

  async getTrendingHashtags(limit = 10) {
    try {
      const q = query(
        this.hashtagsCollection,
        orderBy('count', 'desc'),
        limit(limit)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting trending hashtags:', error);
      throw error;
    }
  }

  // Mention Management
  async processMentions(content, postId, authorId) {
    try {
      // Extract mentions from content
      const mentions = content.match(/@[\w]+/g) || [];
      const uniqueMentions = [...new Set(mentions.map(mention => mention.slice(1)))];

      // Create mention notifications
      await Promise.all(uniqueMentions.map(async (username) => {
        const userQuery = query(
          collection(db, 'users'),
          where('username', '==', username)
        );
        const userSnapshot = await getDocs(userQuery);

        if (!userSnapshot.empty) {
          const mentionedUser = userSnapshot.docs[0];
          await addDoc(this.mentionsCollection, {
            mentionedUserId: mentionedUser.id,
            mentionedByUserId: authorId,
            postId,
            read: false,
            createdAt: serverTimestamp()
          });
        }
      }));

      return uniqueMentions;
    } catch (error) {
      console.error('Error processing mentions:', error);
      throw error;
    }
  }

  async getUserMentions(userId, limit = 20) {
    try {
      const q = query(
        this.mentionsCollection,
        where('mentionedUserId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limit)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting user mentions:', error);
      throw error;
    }
  }

  // Moderation Management
  async createModerationCase(reportId, moderatorId) {
    try {
      const reportRef = doc(collection(db, 'reports'), reportId);
      const reportDoc = await getDoc(reportRef);
      const reportData = reportDoc.data();

      const caseRef = await addDoc(this.moderationCollection, {
        reportId,
        moderatorId,
        contentType: reportData.contentType,
        contentId: reportData.contentId,
        reason: reportData.reason,
        status: 'under_review',
        notes: [],
        actions: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await updateDoc(reportRef, {
        status: 'under_review',
        moderationCaseId: caseRef.id
      });

      return caseRef.id;
    } catch (error) {
      console.error('Error creating moderation case:', error);
      throw error;
    }
  }

  async addModerationNote(caseId, moderatorId, note) {
    try {
      const caseRef = doc(this.moderationCollection, caseId);
      await updateDoc(caseRef, {
        notes: arrayUnion({
          moderatorId,
          note,
          timestamp: serverTimestamp()
        }),
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error adding moderation note:', error);
      throw error;
    }
  }

  async takeModerationAction(caseId, moderatorId, action, reason) {
    try {
      const caseRef = doc(this.moderationCollection, caseId);
      const caseDoc = await getDoc(caseRef);
      const caseData = caseDoc.data();

      // Record the action
      await updateDoc(caseRef, {
        actions: arrayUnion({
          moderatorId,
          action,
          reason,
          timestamp: serverTimestamp()
        }),
        status: 'resolved',
        updatedAt: serverTimestamp()
      });

      // Apply the action
      switch (action) {
        case 'remove_content':
          await this.removeContent(caseData.contentType, caseData.contentId);
          break;
        case 'warn_user':
          await this.warnUser(caseData.contentId);
          break;
        case 'suspend_user':
          await this.suspendUser(caseData.contentId);
          break;
        case 'ban_user':
          await this.banUser(caseData.contentId);
          break;
      }

      return true;
    } catch (error) {
      console.error('Error taking moderation action:', error);
      throw error;
    }
  }

  // Analytics Management
  async trackAnalytics(eventType, data) {
    try {
      await addDoc(this.analyticsCollection, {
        eventType,
        ...data,
        timestamp: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error tracking analytics:', error);
      throw error;
    }
  }

  async getAnalytics(eventType, startDate, endDate) {
    try {
      const q = query(
        this.analyticsCollection,
        where('eventType', '==', eventType),
        where('timestamp', '>=', startDate),
        where('timestamp', '<=', endDate)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw error;
    }
  }

  // Trending Management
  async updateTrending() {
    try {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Get recent posts
      const recentPostsQuery = query(
        collection(db, 'posts'),
        where('createdAt', '>=', hourAgo)
      );
      const recentPosts = await getDocs(recentPostsQuery);

      // Calculate engagement scores
      const scores = {};
      recentPosts.forEach(post => {
        const data = post.data();
        scores[post.id] = this.calculateEngagementScore(data);
      });

      // Update trending collection
      await updateDoc(doc(this.trendingCollection, 'current'), {
        posts: Object.entries(scores)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([id]) => id),
        updatedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error updating trending:', error);
      throw error;
    }
  }

  // Helper Methods
  calculateEngagementScore(post) {
    const now = new Date();
    const postAge = (now - post.createdAt.toDate()) / (60 * 60 * 1000); // in hours

    // Weights for different engagement types
    const weights = {
      like: 1,
      love: 1.5,
      comment: 2,
      share: 3
    };

    // Calculate weighted sum of engagements
    let score = Object.entries(post.reactions).reduce(
      (sum, [type, count]) => sum + (weights[type] || 1) * count,
      0
    );

    // Add comment and share scores
    score += weights.comment * post.commentCount;
    score += weights.share * post.shareCount;

    // Apply time decay
    score = score * Math.exp(-postAge / 24); // 24-hour half-life

    return score;
  }

  async removeContent(contentType, contentId) {
    // Implement content removal logic
  }

  async warnUser(userId) {
    // Implement user warning logic
  }

  async suspendUser(userId) {
    // Implement user suspension logic
  }

  async banUser(userId) {
    // Implement user banning logic
  }
}

export const enhancedSocialService = new EnhancedSocialService();
