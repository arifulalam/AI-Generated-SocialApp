import { auth, db } from '../config/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  query,
  where,
  getDocs,
  doc,
  serverTimestamp
} from 'firebase/firestore';
import {
  updateProfile,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  multiFactor,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator
} from 'firebase/auth';
import { getMessaging, getToken } from 'firebase/messaging';

export class SecurityService {
  static async enableTwoFactor(phoneNumber) {
    try {
      const user = auth.currentUser;
      
      // Get multi-factor session
      const multiFactorSession = await multiFactor(user).getSession();
      
      // Create phone auth provider
      const phoneAuthProvider = new PhoneAuthProvider(auth);
      
      // Send verification code
      const verificationId = await phoneAuthProvider.verifyPhoneNumber(
        phoneNumber,
        multiFactorSession
      );

      return verificationId;
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      throw error;
    }
  }

  static async verifyTwoFactorCode(verificationId, verificationCode) {
    try {
      const user = auth.currentUser;
      
      // Create credential
      const cred = PhoneAuthProvider.credential(verificationId, verificationCode);
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);
      
      // Enroll the second factor
      await multiFactor(user).enroll(multiFactorAssertion, phoneNumber);

      // Update user profile
      await updateDoc(doc(db, 'users', user.uid), {
        hasTwoFactor: true,
        twoFactorMethod: 'phone',
        twoFactorPhone: phoneNumber
      });
    } catch (error) {
      console.error('Error verifying 2FA code:', error);
      throw error;
    }
  }

  static async enableBiometric() {
    try {
      // Check if biometric authentication is available
      if (!window.PublicKeyCredential) {
        throw new Error('WebAuthn is not supported in this browser');
      }

      const user = auth.currentUser;
      
      // Get challenge from server
      const challengeResponse = await fetch('/api/webauthn/challenge');
      const challenge = await challengeResponse.json();

      // Create credentials
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: Uint8Array.from(challenge, c => c.charCodeAt(0)),
          rp: {
            name: 'Your App Name',
            id: window.location.hostname
          },
          user: {
            id: Uint8Array.from(user.uid, c => c.charCodeAt(0)),
            name: user.email,
            displayName: user.displayName
          },
          pubKeyCredParams: [{
            type: 'public-key',
            alg: -7 // ES256
          }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required'
          },
          timeout: 60000
        }
      });

      // Save credential to server
      await fetch('/api/webauthn/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          credential,
          userId: user.uid
        })
      });

      // Update user profile
      await updateDoc(doc(db, 'users', user.uid), {
        hasBiometric: true
      });

      return true;
    } catch (error) {
      console.error('Error enabling biometric:', error);
      throw error;
    }
  }

  static async verifyBiometric() {
    try {
      const user = auth.currentUser;

      // Get challenge from server
      const challengeResponse = await fetch('/api/webauthn/auth-challenge');
      const challenge = await challengeResponse.json();

      // Get credential
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: Uint8Array.from(challenge, c => c.charCodeAt(0)),
          rpId: window.location.hostname,
          userVerification: 'required',
          timeout: 60000
        }
      });

      // Verify with server
      const response = await fetch('/api/webauthn/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assertion,
          userId: user.uid
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Error verifying biometric:', error);
      throw error;
    }
  }

  static async updateSecuritySettings(settings) {
    try {
      const user = auth.currentUser;
      
      await updateDoc(doc(db, 'users', user.uid), {
        securitySettings: {
          ...settings,
          updatedAt: serverTimestamp()
        }
      });

      return true;
    } catch (error) {
      console.error('Error updating security settings:', error);
      throw error;
    }
  }

  static async enablePushNotifications() {
    try {
      const messaging = getMessaging();
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        const token = await getToken(messaging);
        const user = auth.currentUser;
        
        // Save token to user profile
        await updateDoc(doc(db, 'users', user.uid), {
          pushToken: token,
          pushEnabled: true
        });

        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error enabling push notifications:', error);
      throw error;
    }
  }

  static async updatePassword(currentPassword, newPassword) {
    try {
      const user = auth.currentUser;
      
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);

      // Log security event
      await this.logSecurityEvent('password_changed');

      return true;
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  }

  static async updateEmail(password, newEmail) {
    try {
      const user = auth.currentUser;
      
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(
        user.email,
        password
      );
      await reauthenticateWithCredential(user, credential);
      
      // Update email
      await updateEmail(user, newEmail);

      // Log security event
      await this.logSecurityEvent('email_changed');

      return true;
    } catch (error) {
      console.error('Error updating email:', error);
      throw error;
    }
  }

  static async logSecurityEvent(eventType, details = {}) {
    try {
      const user = auth.currentUser;
      
      await addDoc(collection(db, 'securityLogs'), {
        userId: user.uid,
        eventType,
        details,
        userAgent: navigator.userAgent,
        ip: await this.getClientIP(),
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  static async getSecurityLogs() {
    try {
      const user = auth.currentUser;
      
      const logsRef = collection(db, 'securityLogs');
      const q = query(
        logsRef,
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting security logs:', error);
      throw error;
    }
  }

  static async getClientIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Error getting client IP:', error);
      return 'unknown';
    }
  }

  static async detectSuspiciousActivity(activity) {
    try {
      const user = auth.currentUser;
      
      // Check for suspicious patterns
      const isSuspicious = await this.analyzeBehavior(activity);
      
      if (isSuspicious) {
        // Log suspicious activity
        await this.logSecurityEvent('suspicious_activity', activity);
        
        // Notify user
        await this.notifyUser('suspicious_activity', activity);
        
        // Take protective action if necessary
        if (activity.severity === 'high') {
          await this.lockAccount(user.uid);
        }
      }

      return isSuspicious;
    } catch (error) {
      console.error('Error detecting suspicious activity:', error);
      throw error;
    }
  }

  static async analyzeBehavior(activity) {
    // Implement behavior analysis logic
    // This is a simplified example
    const suspiciousPatterns = [
      'multiple_failed_logins',
      'unusual_location',
      'rapid_transactions',
      'multiple_password_changes'
    ];

    return suspiciousPatterns.includes(activity.type);
  }

  static async lockAccount(userId) {
    try {
      await updateDoc(doc(db, 'users', userId), {
        accountLocked: true,
        lockedAt: serverTimestamp(),
        lockReason: 'suspicious_activity'
      });

      // Notify user about account lock
      await this.notifyUser('account_locked');
    } catch (error) {
      console.error('Error locking account:', error);
      throw error;
    }
  }

  static async notifyUser(type, details = {}) {
    try {
      const user = auth.currentUser;
      
      // Add notification
      await addDoc(collection(db, 'notifications'), {
        userId: user.uid,
        type,
        details,
        read: false,
        createdAt: serverTimestamp()
      });

      // Send email notification
      await fetch('/api/notifications/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.uid,
          type,
          details
        })
      });
    } catch (error) {
      console.error('Error notifying user:', error);
    }
  }
}
