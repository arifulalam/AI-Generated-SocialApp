import { authenticator } from 'otplib';
import QRCode from 'qrcode';

class TwoFactorAuthService {
  constructor() {
    this.secretKey = process.env.REACT_APP_2FA_SECRET_KEY || 'SUPERSECRET2FAKEY';
    authenticator.options = {
      window: 1,
      step: 30
    };
  }

  generateSecret() {
    return authenticator.generateSecret();
  }

  async generateQRCode(username, secret) {
    const service = 'FirebaseChat SuperAdmin';
    const otpauth = authenticator.keyuri(username, service, secret);
    try {
      const qrCodeUrl = await QRCode.toDataURL(otpauth);
      return qrCodeUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  }

  verifyToken(token, secret) {
    try {
      return authenticator.verify({
        token,
        secret
      });
    } catch (error) {
      console.error('Error verifying 2FA token:', error);
      return false;
    }
  }

  generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 15).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  generateRecoveryKey() {
    return Array.from({ length: 4 }, () => 
      Math.random().toString(36).substring(2, 10).toUpperCase()
    ).join('-');
  }
}

export const twoFactorAuthService = new TwoFactorAuthService();
