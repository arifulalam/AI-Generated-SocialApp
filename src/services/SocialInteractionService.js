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

class SocialInteractionService {
  constructor() {
    this.reactionsCollection = collection(db, 'reactions');
    this.commentsCollection = collection(db, 'comments');
    this.reportsCollection = collection(db, 'reports');
    this.sharesCollection = collection(db, 'shares');
    this.postsCollection = collection(db, 'posts');
  }

  // Reaction Management
  async addReaction(userId, postId, reactionType) {
    try {
      // Check if user already reacted
      const existingReaction = await this.getUserReaction(userId, postId);
      
      if (existingReaction) {
        // Update existing reaction if different
        if (existingReaction.type !== reactionType) {
          await updateDoc(doc(this.reactionsCollection, existingReaction.id), {
            type: reactionType,
            updatedAt: serverTimestamp()
          });

          // Update post reaction counts
          await this.updatePostReactionCounts(postId, existingReaction.type, reactionType);
        }
      } else {
        // Create new reaction
        await addDoc(this.reactionsCollection, {
          userId,
          postId,
          type: reactionType,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Increment post reaction count
        await this.updatePostReactionCounts(postId, null, reactionType);
      }

      return true;
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }

  async removeReaction(userId, postId) {
    try {
      const existingReaction = await this.getUserReaction(userId, postId);
      
      if (existingReaction) {
        await deleteDoc(doc(this.reactionsCollection, existingReaction.id));
        
        // Decrement post reaction count
        await this.updatePostReactionCounts(postId, existingReaction.type, null);
      }

      return true;
    } catch (error) {
      console.error('Error removing reaction:', error);
      throw error;
    }
  }

  async getUserReaction(userId, postId) {
    try {
      const q = query(
        this.reactionsCollection,
        where('userId', '==', userId),
        where('postId', '==', postId)
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data()
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user reaction:', error);
      throw error;
    }
  }

  // Comment Management
  async addComment(userId, postId, content, parentCommentId = null) {
    try {
      const commentRef = await addDoc(this.commentsCollection, {
        userId,
        postId,
        content,
        parentCommentId,
        replyCount: 0,
        reactions: {
          like: 0,
          love: 0,
          haha: 0,
          wow: 0,
          sad: 0,
          angry: 0
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update parent counts
      if (parentCommentId) {
        await updateDoc(doc(this.commentsCollection, parentCommentId), {
          replyCount: increment(1)
        });
      } else {
        await updateDoc(doc(this.postsCollection, postId), {
          commentCount: increment(1)
        });
      }

      return commentRef.id;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  async updateComment(commentId, content) {
    try {
      await updateDoc(doc(this.commentsCollection, commentId), {
        content,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  }

  async deleteComment(commentId) {
    try {
      const commentRef = doc(this.commentsCollection, commentId);
      const commentDoc = await getDoc(commentRef);
      const commentData = commentDoc.data();

      // Recursively delete replies
      const replies = await this.getCommentReplies(commentId);
      await Promise.all(replies.map(reply => this.deleteComment(reply.id)));

      // Update parent counts
      if (commentData.parentCommentId) {
        await updateDoc(doc(this.commentsCollection, commentData.parentCommentId), {
          replyCount: increment(-1)
        });
      } else {
        await updateDoc(doc(this.postsCollection, commentData.postId), {
          commentCount: increment(-1)
        });
      }

      await deleteDoc(commentRef);
      return true;
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }

  async getComments(postId, parentCommentId = null, page = 1, limit = 10) {
    try {
      const q = query(
        this.commentsCollection,
        where('postId', '==', postId),
        where('parentCommentId', '==', parentCommentId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting comments:', error);
      throw error;
    }
  }

  async getCommentReplies(commentId, page = 1, limit = 10) {
    try {
      const q = query(
        this.commentsCollection,
        where('parentCommentId', '==', commentId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting comment replies:', error);
      throw error;
    }
  }

  // Report Management
  async reportContent(userId, contentType, contentId, reason, details) {
    try {
      await addDoc(this.reportsCollection, {
        userId,
        contentType, // 'post', 'comment', etc.
        contentId,
        reason,
        details,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error reporting content:', error);
      throw error;
    }
  }

  async updateReportStatus(reportId, status, moderatorId, notes = '') {
    try {
      await updateDoc(doc(this.reportsCollection, reportId), {
        status,
        moderatorId,
        moderatorNotes: notes,
        resolvedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating report status:', error);
      throw error;
    }
  }

  // Share Management
  async sharePost(userId, postId, platform, customMessage = '') {
    try {
      // Record share
      await addDoc(this.sharesCollection, {
        userId,
        postId,
        platform,
        customMessage,
        createdAt: serverTimestamp()
      });

      // Update post share count
      await updateDoc(doc(this.postsCollection, postId), {
        shareCount: increment(1)
      });

      return true;
    } catch (error) {
      console.error('Error sharing post:', error);
      throw error;
    }
  }

  // Helper Methods
  async updatePostReactionCounts(postId, oldType, newType) {
    try {
      const updates = {};
      
      if (oldType) {
        updates[`reactions.${oldType}`] = increment(-1);
      }
      
      if (newType) {
        updates[`reactions.${newType}`] = increment(1);
      }

      await updateDoc(doc(this.postsCollection, postId), updates);
    } catch (error) {
      console.error('Error updating post reaction counts:', error);
      throw error;
    }
  }
}

export const socialInteractionService = new SocialInteractionService();
