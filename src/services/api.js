import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// Storage Keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: '@hostel_hub_access_token',
  REFRESH_TOKEN: '@hostel_hub_refresh_token',
  USER_DATA: '@hostel_hub_user_data',
};

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Get stored access token
  async getAccessToken() {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  // Get stored refresh token
  async getRefreshToken() {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  // Store tokens
  async storeTokens(accessToken, refreshToken) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      if (refreshToken) {
        await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      }
    } catch (error) {
      console.error('Error storing tokens:', error);
    }
  }

  // Store user data
  async storeUserData(userData) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    } catch (error) {
      console.error('Error storing user data:', error);
    }
  }

  // Get stored user data
  async getUserData() {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  // Clear all stored data
  async clearStorage() {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_DATA,
      ]);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  // Refresh access token
  async refreshAccessToken() {
    try {
      const refreshToken = await this.getRefreshToken();
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Token refresh failed');
      }

      await this.storeTokens(data.tokens.accessToken, data.tokens.refreshToken);
      return data.tokens.accessToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      await this.clearStorage();
      throw error;
    }
  }

  // Make authenticated API request
  async request(endpoint, options = {}) {
    try {
      let accessToken = await this.getAccessToken();
      
      const config = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      };

      // Add authorization header if token exists
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }

      let response = await fetch(`${this.baseURL}${endpoint}`, config);

      // If token expired, try to refresh
      if (response.status === 401 && accessToken) {
        try {
          accessToken = await this.refreshAccessToken();
          config.headers.Authorization = `Bearer ${accessToken}`;
          response = await fetch(`${this.baseURL}${endpoint}`, config);
        } catch (refreshError) {
          throw new Error('Session expired. Please login again.');
        }
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  // Authentication methods
  async login(credentials) {
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store tokens and user data
      await this.storeTokens(data.tokens.accessToken, data.tokens.refreshToken);
      await this.storeUserData(data.user);

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async register(userData) {
    try {
      const response = await fetch(`${this.baseURL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Store tokens and user data
      await this.storeTokens(data.tokens.accessToken, data.tokens.refreshToken);
      await this.storeUserData(data.user);

      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async logout() {
    try {
      // Try to call logout endpoint
      await this.request('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Always clear local storage
      await this.clearStorage();
    }
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  async changePassword(passwordData) {
    return this.request('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });
  }

  // Feature-specific API methods
  async getDashboard() {
    return this.request('/students/dashboard');
  }

  // Dining API methods
  async getMenu(date) {
    return this.request(`/dining/menu/${date}`);
  }

  async getWeeklyMenu(startDate) {
    return this.request(`/dining/menu/week/${startDate}`);
  }

  async submitRating(ratingData) {
    return this.request('/dining/rating', {
      method: 'POST',
      body: JSON.stringify(ratingData)
    });
  }

  async getMealStats(period = 'week') {
    return this.request(`/dining/stats/student?period=${period}`);
  }

  async getMenuStats(menuId) {
    return this.request(`/dining/menu/${menuId}/stats`);
  }

  // Other feature API methods
  async getAnnouncements() {
    return this.request('/announcements');
  }

  async getOutpassRequests() {
    return this.request('/outpass/requests');
  }

  async getMaintenanceRequests() {
    return this.request('/maintenance/requests');
  }

  async getCanteenMenu() {
    return this.request('/canteen/menu');
  }
}

export default new ApiService();