import { db } from '../config/firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp
} from 'firebase/firestore';

export class MarketingService {
  static async createDiscount(storeId, discountData) {
    try {
      const discount = {
        storeId,
        ...discountData,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        usageCount: 0
      };

      // Validate discount data
      this.validateDiscountData(discount);

      const docRef = await addDoc(collection(db, 'discounts'), discount);
      return { id: docRef.id, ...discount };
    } catch (error) {
      console.error('Error creating discount:', error);
      throw error;
    }
  }

  static validateDiscountData(discount) {
    const requiredFields = ['code', 'type', 'value'];
    const missingFields = requiredFields.filter(field => !discount[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    if (discount.type === 'percentage' && (discount.value < 0 || discount.value > 100)) {
      throw new Error('Percentage discount must be between 0 and 100');
    }

    if (discount.type === 'fixed' && discount.value < 0) {
      throw new Error('Fixed discount cannot be negative');
    }

    if (discount.minPurchase && discount.minPurchase < 0) {
      throw new Error('Minimum purchase amount cannot be negative');
    }

    if (discount.maxUses && discount.maxUses < 1) {
      throw new Error('Maximum uses must be at least 1');
    }
  }

  static async validateDiscountCode(code, storeId, cartTotal) {
    try {
      const discountsRef = collection(db, 'discounts');
      const q = query(
        discountsRef,
        where('code', '==', code.toUpperCase()),
        where('storeId', '==', storeId),
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw new Error('Invalid discount code');
      }

      const discount = {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      };

      // Check if discount is expired
      if (discount.expiresAt && discount.expiresAt.toDate() < new Date()) {
        throw new Error('Discount code has expired');
      }

      // Check if maximum uses reached
      if (discount.maxUses && discount.usageCount >= discount.maxUses) {
        throw new Error('Discount code has reached maximum uses');
      }

      // Check minimum purchase requirement
      if (discount.minPurchase && cartTotal < discount.minPurchase) {
        throw new Error(`Minimum purchase amount of $${discount.minPurchase} required`);
      }

      return discount;
    } catch (error) {
      console.error('Error validating discount:', error);
      throw error;
    }
  }

  static async applyDiscount(discountId) {
    try {
      const discountRef = doc(db, 'discounts', discountId);
      await updateDoc(discountRef, {
        usageCount: firebase.firestore.FieldValue.increment(1),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error applying discount:', error);
      throw error;
    }
  }

  static async createBundle(storeId, bundleData) {
    try {
      const bundle = {
        storeId,
        ...bundleData,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      };

      // Validate bundle data
      this.validateBundleData(bundle);

      const docRef = await addDoc(collection(db, 'bundles'), bundle);
      return { id: docRef.id, ...bundle };
    } catch (error) {
      console.error('Error creating bundle:', error);
      throw error;
    }
  }

  static validateBundleData(bundle) {
    if (!bundle.name || !bundle.products || bundle.products.length < 2) {
      throw new Error('Bundle must have a name and at least 2 products');
    }

    if (!bundle.discountType || !bundle.discountValue) {
      throw new Error('Bundle must specify discount type and value');
    }

    if (bundle.discountType === 'percentage' && (bundle.discountValue < 0 || bundle.discountValue > 100)) {
      throw new Error('Percentage discount must be between 0 and 100');
    }
  }

  static async createEmailCampaign(storeId, campaignData) {
    try {
      const campaign = {
        storeId,
        ...campaignData,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        sentAt: null,
        stats: {
          sent: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
          unsubscribed: 0
        }
      };

      // Validate campaign data
      this.validateCampaignData(campaign);

      const docRef = await addDoc(collection(db, 'emailCampaigns'), campaign);
      return { id: docRef.id, ...campaign };
    } catch (error) {
      console.error('Error creating email campaign:', error);
      throw error;
    }
  }

  static validateCampaignData(campaign) {
    const requiredFields = ['subject', 'content', 'recipients'];
    const missingFields = requiredFields.filter(field => !campaign[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    if (!Array.isArray(campaign.recipients) || campaign.recipients.length === 0) {
      throw new Error('Campaign must have at least one recipient');
    }
  }

  static async sendEmailCampaign(campaignId) {
    try {
      // In a real implementation, this would integrate with an email service
      const campaignRef = doc(db, 'emailCampaigns', campaignId);
      await updateDoc(campaignRef, {
        status: 'sending',
        sentAt: new Date(),
        updatedAt: new Date()
      });

      // Mock sending emails
      setTimeout(async () => {
        await updateDoc(campaignRef, {
          status: 'sent',
          updatedAt: new Date()
        });
      }, 5000);
    } catch (error) {
      console.error('Error sending email campaign:', error);
      throw error;
    }
  }

  static async createSocialShare(storeId, shareData) {
    try {
      const share = {
        storeId,
        ...shareData,
        createdAt: new Date(),
        updatedAt: new Date(),
        stats: {
          shares: 0,
          clicks: 0,
          likes: 0,
          comments: 0
        }
      };

      const docRef = await addDoc(collection(db, 'socialShares'), share);
      return { id: docRef.id, ...share };
    } catch (error) {
      console.error('Error creating social share:', error);
      throw error;
    }
  }

  static async updateSocialShareStats(shareId, stats) {
    try {
      const shareRef = doc(db, 'socialShares', shareId);
      await updateDoc(shareRef, {
        stats,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating social share stats:', error);
      throw error;
    }
  }

  static async getStoreDiscounts(storeId) {
    try {
      const discountsRef = collection(db, 'discounts');
      const q = query(
        discountsRef,
        where('storeId', '==', storeId),
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting store discounts:', error);
      throw error;
    }
  }

  static async getStoreBundles(storeId) {
    try {
      const bundlesRef = collection(db, 'bundles');
      const q = query(
        bundlesRef,
        where('storeId', '==', storeId),
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting store bundles:', error);
      throw error;
    }
  }

  static async getEmailCampaigns(storeId) {
    try {
      const campaignsRef = collection(db, 'emailCampaigns');
      const q = query(
        campaignsRef,
        where('storeId', '==', storeId)
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting email campaigns:', error);
      throw error;
    }
  }

  static async getSocialShares(storeId) {
    try {
      const sharesRef = collection(db, 'socialShares');
      const q = query(
        sharesRef,
        where('storeId', '==', storeId)
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting social shares:', error);
      throw error;
    }
  }
}
