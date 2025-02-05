import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Device from 'expo-device';
import * as Battery from 'expo-battery';
import * as Network from 'expo-network';
import * as Cellular from 'expo-cellular';
import * as Camera from 'expo-camera';

class MobileService {
  constructor() {
    this.setupNotifications();
  }

  // Push Notifications
  async setupNotifications() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        throw new Error('Permission not granted for notifications');
      }

      const token = await Notifications.getExpoPushTokenAsync();
      return token;
    } catch (error) {
      console.error('Error setting up notifications:', error);
      throw error;
    }
  }

  async scheduleNotification(content, trigger) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: content.title,
          body: content.body,
          data: content.data,
          sound: true,
          badge: 1
        },
        trigger
      });
      return id;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  // Location Services
  async getCurrentLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission denied for location');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      return location;
    } catch (error) {
      console.error('Error getting location:', error);
      throw error;
    }
  }

  async startLocationTracking(callback) {
    try {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission denied for background location');
      }

      return await Location.startLocationUpdatesAsync('location-tracking', {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 10,
        foregroundService: {
          notificationTitle: 'Location Tracking',
          notificationBody: 'Tracking your location in background'
        },
        callback
      });
    } catch (error) {
      console.error('Error starting location tracking:', error);
      throw error;
    }
  }

  // Media Management
  async capturePhoto() {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission denied for camera');
      }

      const photo = await Camera.takePictureAsync({
        quality: 0.7,
        base64: true,
        exif: true
      });
      return photo;
    } catch (error) {
      console.error('Error capturing photo:', error);
      throw error;
    }
  }

  async saveToGallery(fileUri) {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission denied for media library');
      }

      const asset = await MediaLibrary.createAssetAsync(fileUri);
      return asset;
    } catch (error) {
      console.error('Error saving to gallery:', error);
      throw error;
    }
  }

  // File Management
  async shareFile(fileUri) {
    try {
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error('Sharing is not available on this device');
      }

      await Sharing.shareAsync(fileUri);
    } catch (error) {
      console.error('Error sharing file:', error);
      throw error;
    }
  }

  async downloadFile(url, filename) {
    try {
      const callback = downloadProgress => {
        const progress = downloadProgress.totalBytesWritten / 
          downloadProgress.totalBytesExpectedToWrite;
        // Update UI with progress
      };

      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        FileSystem.documentDirectory + filename,
        {},
        callback
      );

      const { uri } = await downloadResumable.downloadAsync();
      return uri;
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  // Device Information
  async getDeviceInfo() {
    try {
      const [
        deviceInfo,
        batteryInfo,
        networkInfo,
        cellularInfo
      ] = await Promise.all([
        Device.getDeviceInfoAsync(),
        Battery.getBatteryLevelAsync(),
        Network.getNetworkStateAsync(),
        Cellular.getCellularGenerationAsync()
      ]);

      return {
        device: deviceInfo,
        battery: batteryInfo,
        network: networkInfo,
        cellular: cellularInfo
      };
    } catch (error) {
      console.error('Error getting device info:', error);
      throw error;
    }
  }

  // Offline Storage
  async saveOfflineData(key, data) {
    try {
      const jsonValue = JSON.stringify(data);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error('Error saving offline data:', error);
      throw error;
    }
  }

  async getOfflineData(key) {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Error getting offline data:', error);
      throw error;
    }
  }

  // Deep Linking
  async handleDeepLink(url) {
    try {
      // Parse the URL and extract parameters
      const params = this.parseDeepLinkUrl(url);
      
      // Handle different types of deep links
      switch (params.type) {
        case 'product':
          return this.handleProductDeepLink(params);
        case 'chat':
          return this.handleChatDeepLink(params);
        case 'notification':
          return this.handleNotificationDeepLink(params);
        default:
          throw new Error('Unknown deep link type');
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
      throw error;
    }
  }

  // Platform-specific Features
  getPlatformFeatures() {
    const features = {
      platform: Platform.OS,
      version: Platform.Version,
      isTV: Platform.isTV,
      constants: Platform.constants
    };

    if (Platform.OS === 'ios') {
      features.specifics = {
        isPad: Platform.isPad,
        interfaceIdiom: Platform.interfaceIdiom,
        osVersion: Platform.Version
      };
    } else if (Platform.OS === 'android') {
      features.specifics = {
        apiLevel: Platform.constants.Version,
        uiMode: Platform.constants.uiMode,
        brand: Platform.constants.Brand
      };
    }

    return features;
  }

  // Helper Methods
  parseDeepLinkUrl(url) {
    const regex = /[?&]([^=#]+)=([^&#]*)/g;
    const params = {};
    let match;
    
    while (match = regex.exec(url)) {
      params[match[1]] = decodeURIComponent(match[2]);
    }
    
    return params;
  }

  async handleProductDeepLink(params) {
    // Handle product-specific deep link
    return {
      screen: 'ProductDetails',
      params: {
        productId: params.id
      }
    };
  }

  async handleChatDeepLink(params) {
    // Handle chat-specific deep link
    return {
      screen: 'Chat',
      params: {
        chatId: params.id,
        userId: params.userId
      }
    };
  }

  async handleNotificationDeepLink(params) {
    // Handle notification-specific deep link
    return {
      screen: 'Notifications',
      params: {
        notificationId: params.id
      }
    };
  }
}

export const mobileService = new MobileService();
