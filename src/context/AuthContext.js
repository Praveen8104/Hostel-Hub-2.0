import React, { createContext, useContext, useReducer, useEffect } from 'react';
import ApiService from '../services/api';

// Initial state
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Action types
const AuthActionTypes = {
  SET_LOADING: 'SET_LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  UPDATE_USER: 'UPDATE_USER',
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AuthActionTypes.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };
    
    case AuthActionTypes.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    
    case AuthActionTypes.LOGOUT:
      return {
        ...initialState,
        isLoading: false,
      };
    
    case AuthActionTypes.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    
    case AuthActionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
    
    case AuthActionTypes.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };
    
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing session on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      dispatch({ type: AuthActionTypes.SET_LOADING, payload: true });
      
      const userData = await ApiService.getUserData();
      const accessToken = await ApiService.getAccessToken();

      if (userData && accessToken) {
        // Verify token is still valid by getting fresh profile
        try {
          const profileResponse = await ApiService.getProfile();
          dispatch({ 
            type: AuthActionTypes.LOGIN_SUCCESS, 
            payload: profileResponse.user 
          });
        } catch (error) {
          // Token is invalid, clear storage
          await ApiService.clearStorage();
          dispatch({ type: AuthActionTypes.LOGOUT });
        }
      } else {
        dispatch({ type: AuthActionTypes.LOGOUT });
      }
    } catch (error) {
      console.error('Auth status check error:', error);
      dispatch({ type: AuthActionTypes.LOGOUT });
    }
  };

  const login = async (credentials) => {
    try {
      dispatch({ type: AuthActionTypes.SET_LOADING, payload: true });
      dispatch({ type: AuthActionTypes.CLEAR_ERROR });

      const response = await ApiService.login(credentials);
      
      dispatch({ 
        type: AuthActionTypes.LOGIN_SUCCESS, 
        payload: response.user 
      });

      return response;
    } catch (error) {
      dispatch({ 
        type: AuthActionTypes.SET_ERROR, 
        payload: error.message 
      });
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      dispatch({ type: AuthActionTypes.SET_LOADING, payload: true });
      dispatch({ type: AuthActionTypes.CLEAR_ERROR });

      const response = await ApiService.register(userData);
      
      dispatch({ 
        type: AuthActionTypes.LOGIN_SUCCESS, 
        payload: response.user 
      });

      return response;
    } catch (error) {
      dispatch({ 
        type: AuthActionTypes.SET_ERROR, 
        payload: error.message 
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await ApiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({ type: AuthActionTypes.LOGOUT });
    }
  };

  const updateProfile = async (profileData) => {
    try {
      // Update user data in context
      dispatch({ 
        type: AuthActionTypes.UPDATE_USER, 
        payload: profileData 
      });

      // Update stored user data
      const currentUser = await ApiService.getUserData();
      await ApiService.storeUserData({ ...currentUser, ...profileData });
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  const clearError = () => {
    dispatch({ type: AuthActionTypes.CLEAR_ERROR });
  };

  const value = {
    // State
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    
    // Actions
    login,
    register,
    logout,
    updateProfile,
    clearError,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};