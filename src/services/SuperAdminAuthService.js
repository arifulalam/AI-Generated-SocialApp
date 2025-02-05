import crypto from 'crypto';

class SuperAdminAuthService {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    this.secretKey = process.env.REACT_APP_SUPER_ADMIN_SECRET_KEY;
    this.iv = Buffer.from(process.env.REACT_APP_SUPER_ADMIN_IV, 'hex');
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    this.maxLoginAttempts = 5;
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
    this.loginAttempts = new Map();
  }

  encrypt(text) {
    const cipher = crypto.createCipheriv(this.algorithm, Buffer.from(this.secretKey), this.iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return encrypted.toString('hex');
  }

  decrypt(text) {
    const encryptedText = Buffer.from(text, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, Buffer.from(this.secretKey), this.iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }

  validateCredentials(username, password) {
    try {
      if (this.isAccountLocked(username)) {
        throw new Error('Account is temporarily locked. Please try again later.');
      }

      const encryptedStoredPassword = process.env.REACT_APP_SUPER_ADMIN_PASSWORD;
      const decryptedStoredPassword = this.decrypt(encryptedStoredPassword);
      
      const isValid = username === process.env.REACT_APP_SUPER_ADMIN_USERNAME && 
                     password === decryptedStoredPassword;

      if (!isValid) {
        this.recordFailedAttempt(username);
      } else {
        this.resetLoginAttempts(username);
      }

      return isValid;
    } catch (error) {
      console.error('Error validating credentials:', error);
      throw error;
    }
  }

  recordFailedAttempt(username) {
    const attempts = this.loginAttempts.get(username) || {
      count: 0,
      firstAttempt: Date.now(),
      lockoutUntil: null
    };

    attempts.count += 1;

    if (attempts.count >= this.maxLoginAttempts) {
      attempts.lockoutUntil = Date.now() + this.lockoutDuration;
    }

    this.loginAttempts.set(username, attempts);
  }

  isAccountLocked(username) {
    const attempts = this.loginAttempts.get(username);
    if (!attempts) return false;

    if (attempts.lockoutUntil && Date.now() < attempts.lockoutUntil) {
      return true;
    }

    if (attempts.lockoutUntil && Date.now() >= attempts.lockoutUntil) {
      this.resetLoginAttempts(username);
      return false;
    }

    return false;
  }

  resetLoginAttempts(username) {
    this.loginAttempts.delete(username);
  }

  getRemainingAttempts(username) {
    const attempts = this.loginAttempts.get(username);
    if (!attempts) return this.maxLoginAttempts;
    return Math.max(0, this.maxLoginAttempts - attempts.count);
  }

  getLockoutTimeRemaining(username) {
    const attempts = this.loginAttempts.get(username);
    if (!attempts || !attempts.lockoutUntil) return 0;
    return Math.max(0, attempts.lockoutUntil - Date.now());
  }

  login(username, password) {
    try {
      if (this.validateCredentials(username, password)) {
        const token = this.generateToken();
        const session = {
          token,
          expiresAt: Date.now() + this.sessionTimeout,
          username
        };
        localStorage.setItem('superAdminSession', JSON.stringify(session));
        this.startSessionTimer();
        return true;
      }
      return false;
    } catch (error) {
      throw error;
    }
  }

  logout() {
    localStorage.removeItem('superAdminSession');
    this.clearSessionTimer();
  }

  startSessionTimer() {
    this.clearSessionTimer();
    this.sessionTimer = setInterval(() => {
      if (!this.isAuthenticated()) {
        this.clearSessionTimer();
      }
    }, 1000);
  }

  clearSessionTimer() {
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  isAuthenticated() {
    try {
      const session = JSON.parse(localStorage.getItem('superAdminSession'));
      if (!session) return false;

      if (Date.now() > session.expiresAt) {
        this.logout();
        return false;
      }

      // Extend session if more than halfway through
      if (Date.now() > session.expiresAt - (this.sessionTimeout / 2)) {
        this.extendSession();
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  extendSession() {
    try {
      const session = JSON.parse(localStorage.getItem('superAdminSession'));
      if (session) {
        session.expiresAt = Date.now() + this.sessionTimeout;
        localStorage.setItem('superAdminSession', JSON.stringify(session));
      }
    } catch (error) {
      console.error('Error extending session:', error);
    }
  }

  async changePassword(currentPassword, newPassword) {
    try {
      const session = JSON.parse(localStorage.getItem('superAdminSession'));
      if (!session) throw new Error('Not authenticated');

      if (!this.validateCredentials(session.username, currentPassword)) {
        throw new Error('Current password is incorrect');
      }

      // Password requirements
      if (newPassword.length < 12) {
        throw new Error('Password must be at least 12 characters long');
      }
      if (!/[A-Z]/.test(newPassword)) {
        throw new Error('Password must contain at least one uppercase letter');
      }
      if (!/[a-z]/.test(newPassword)) {
        throw new Error('Password must contain at least one lowercase letter');
      }
      if (!/[0-9]/.test(newPassword)) {
        throw new Error('Password must contain at least one number');
      }
      if (!/[!@#$%^&*]/.test(newPassword)) {
        throw new Error('Password must contain at least one special character (!@#$%^&*)');
      }

      const encryptedNewPassword = this.encrypt(newPassword);

      // In a real application, you would update the password in a secure backend
      // For this example, we'll just log it (you should implement proper password storage)
      console.log('New encrypted password:', encryptedNewPassword);
      
      return true;
    } catch (error) {
      throw error;
    }
  }

  generateToken() {
    return crypto.randomBytes(64).toString('hex');
  }

  getSessionInfo() {
    try {
      const session = JSON.parse(localStorage.getItem('superAdminSession'));
      if (!session) return null;

      return {
        username: session.username,
        expiresAt: session.expiresAt,
        remainingTime: Math.max(0, session.expiresAt - Date.now())
      };
    } catch (error) {
      return null;
    }
  }
}

export const superAdminAuthService = new SuperAdminAuthService();
