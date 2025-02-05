class IPRestrictionService {
  constructor() {
    this.allowedIPs = new Set(
      process.env.REACT_APP_ALLOWED_ADMIN_IPS
        ? process.env.REACT_APP_ALLOWED_ADMIN_IPS.split(',')
        : []
    );
    this.ipCache = new Map();
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes
  }

  async getCurrentIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Error getting IP:', error);
      throw new Error('Could not verify IP address');
    }
  }

  async isIPAllowed() {
    try {
      const currentIP = await this.getCurrentIP();
      
      // Check cache first
      const cachedResult = this.ipCache.get(currentIP);
      if (cachedResult && Date.now() - cachedResult.timestamp < this.cacheDuration) {
        return cachedResult.allowed;
      }

      // If no allowed IPs are set, allow all (development mode)
      if (this.allowedIPs.size === 0) {
        console.warn('No IP restrictions set - allowing all IPs');
        return true;
      }

      const allowed = this.allowedIPs.has(currentIP);
      
      // Cache the result
      this.ipCache.set(currentIP, {
        allowed,
        timestamp: Date.now()
      });

      return allowed;
    } catch (error) {
      console.error('Error checking IP:', error);
      return false;
    }
  }

  addAllowedIP(ip) {
    this.allowedIPs.add(ip);
    this.ipCache.delete(ip); // Clear cache for this IP
  }

  removeAllowedIP(ip) {
    this.allowedIPs.delete(ip);
    this.ipCache.delete(ip); // Clear cache for this IP
  }

  clearIPCache() {
    this.ipCache.clear();
  }

  getIPAccessLog() {
    return Array.from(this.ipCache.entries()).map(([ip, data]) => ({
      ip,
      allowed: data.allowed,
      lastChecked: new Date(data.timestamp).toISOString()
    }));
  }
}

export const ipRestrictionService = new IPRestrictionService();
