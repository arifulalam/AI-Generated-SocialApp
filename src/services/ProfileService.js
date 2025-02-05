import { db, storage } from '../config/firebase';
import {
  doc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

class ProfileService {
  constructor() {
    this.usersCollection = collection(db, 'users');
    this.relationshipsCollection = collection(db, 'relationships');
    this.educationCollection = collection(db, 'education');
    this.achievementsCollection = collection(db, 'achievements');
    this.contactsCollection = collection(db, 'contacts');
  }

  // Basic Profile Management
  async updateBasicInfo(userId, basicInfo) {
    try {
      const userRef = doc(this.usersCollection, userId);
      await updateDoc(userRef, {
        ...basicInfo,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating basic info:', error);
      throw error;
    }
  }

  async uploadProfilePhoto(userId, photoFile) {
    try {
      const photoRef = ref(storage, `profiles/${userId}/${uuidv4()}`);
      await uploadBytes(photoRef, photoFile);
      const photoUrl = await getDownloadURL(photoRef);
      
      const userRef = doc(this.usersCollection, userId);
      await updateDoc(userRef, {
        photoURL: photoUrl,
        updatedAt: serverTimestamp()
      });
      
      return photoUrl;
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      throw error;
    }
  }

  // Education Management
  async addEducation(userId, educationInfo) {
    try {
      const educationRef = doc(this.educationCollection);
      await updateDoc(educationRef, {
        userId,
        ...educationInfo,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error adding education:', error);
      throw error;
    }
  }

  async updateEducation(educationId, updates) {
    try {
      const educationRef = doc(this.educationCollection, educationId);
      await updateDoc(educationRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating education:', error);
      throw error;
    }
  }

  async deleteEducation(educationId) {
    try {
      const educationRef = doc(this.educationCollection, educationId);
      await deleteDoc(educationRef);
      return true;
    } catch (error) {
      console.error('Error deleting education:', error);
      throw error;
    }
  }

  // Achievement Management
  async addAchievement(userId, achievementInfo) {
    try {
      const achievementRef = doc(this.achievementsCollection);
      await updateDoc(achievementRef, {
        userId,
        ...achievementInfo,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error adding achievement:', error);
      throw error;
    }
  }

  async updateAchievement(achievementId, updates) {
    try {
      const achievementRef = doc(this.achievementsCollection, achievementId);
      await updateDoc(achievementRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating achievement:', error);
      throw error;
    }
  }

  async deleteAchievement(achievementId) {
    try {
      const achievementRef = doc(this.achievementsCollection, achievementId);
      await deleteDoc(achievementRef);
      return true;
    } catch (error) {
      console.error('Error deleting achievement:', error);
      throw error;
    }
  }

  // Relationship Management
  async addRelationship(userId, targetUserId, relationshipType) {
    try {
      const relationshipRef = doc(this.relationshipsCollection);
      await updateDoc(relationshipRef, {
        userId,
        targetUserId,
        type: relationshipType,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error adding relationship:', error);
      throw error;
    }
  }

  async updateRelationshipStatus(relationshipId, status) {
    try {
      const relationshipRef = doc(this.relationshipsCollection, relationshipId);
      await updateDoc(relationshipRef, {
        status,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating relationship status:', error);
      throw error;
    }
  }

  async removeRelationship(relationshipId) {
    try {
      const relationshipRef = doc(this.relationshipsCollection, relationshipId);
      await deleteDoc(relationshipRef);
      return true;
    } catch (error) {
      console.error('Error removing relationship:', error);
      throw error;
    }
  }

  // Contact Information Management
  async addContact(userId, contactInfo) {
    try {
      const contactRef = doc(this.contactsCollection);
      await updateDoc(contactRef, {
        userId,
        ...contactInfo,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error adding contact:', error);
      throw error;
    }
  }

  async updateContact(contactId, updates) {
    try {
      const contactRef = doc(this.contactsCollection, contactId);
      await updateDoc(contactRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  }

  async deleteContact(contactId) {
    try {
      const contactRef = doc(this.contactsCollection, contactId);
      await deleteDoc(contactRef);
      return true;
    } catch (error) {
      console.error('Error deleting contact:', error);
      throw error;
    }
  }

  // Profile Data Retrieval
  async getFullProfile(userId) {
    try {
      const [
        basicInfo,
        education,
        achievements,
        relationships,
        contacts
      ] = await Promise.all([
        this.getBasicInfo(userId),
        this.getEducation(userId),
        this.getAchievements(userId),
        this.getRelationships(userId),
        this.getContacts(userId)
      ]);

      return {
        basicInfo,
        education,
        achievements,
        relationships,
        contacts
      };
    } catch (error) {
      console.error('Error getting full profile:', error);
      throw error;
    }
  }

  async getBasicInfo(userId) {
    try {
      const userRef = doc(this.usersCollection, userId);
      const userDoc = await getDoc(userRef);
      return userDoc.data();
    } catch (error) {
      console.error('Error getting basic info:', error);
      throw error;
    }
  }

  async getEducation(userId) {
    try {
      const q = query(this.educationCollection, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting education:', error);
      throw error;
    }
  }

  async getAchievements(userId) {
    try {
      const q = query(this.achievementsCollection, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting achievements:', error);
      throw error;
    }
  }

  async getRelationships(userId) {
    try {
      const q = query(this.relationshipsCollection, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting relationships:', error);
      throw error;
    }
  }

  async getContacts(userId) {
    try {
      const q = query(this.contactsCollection, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting contacts:', error);
      throw error;
    }
  }

  // Privacy Settings
  async updatePrivacySettings(userId, settings) {
    try {
      const userRef = doc(this.usersCollection, userId);
      await updateDoc(userRef, {
        privacySettings: settings,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      throw error;
    }
  }

  // Profile Verification
  async requestVerification(userId, verificationData) {
    try {
      const userRef = doc(this.usersCollection, userId);
      await updateDoc(userRef, {
        verificationRequest: {
          ...verificationData,
          status: 'pending',
          submittedAt: serverTimestamp()
        }
      });
      return true;
    } catch (error) {
      console.error('Error requesting verification:', error);
      throw error;
    }
  }
}

export const profileService = new ProfileService();
