import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Image,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

const LoginScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState('student');

  const { login, isLoading, error, clearError } = useAuth();

  // Clear error when component mounts or form changes
  useEffect(() => {
    clearError();
  }, [formData]);

  // Determine user type from identifier
  const detectUserType = (identifier) => {
    const upperIdentifier = identifier.toUpperCase();
    if (upperIdentifier.match(/^\d{4}[A-Z]{3}\d{3}$/)) {
      return 'student';
    } else if (upperIdentifier.startsWith('EMP')) {
      return 'warden';
    } else if (upperIdentifier.startsWith('CANT')) {
      return 'canteen_owner';
    } else if (upperIdentifier.startsWith('ADM')) {
      return 'admin';
    }
    return 'student';
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-detect user type
    if (field === 'identifier' && value.length > 3) {
      const detectedType = detectUserType(value);
      setUserType(detectedType);
    }
  };

  const validateForm = () => {
    if (!formData.identifier.trim()) {
      Alert.alert('Validation Error', 'Please enter your Roll Number or Employee ID');
      return false;
    }
    
    if (!formData.password.trim()) {
      Alert.alert('Validation Error', 'Please enter your password');
      return false;
    }

    if (formData.password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters long');
      return false;
    }

    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    try {
      await login({
        identifier: formData.identifier.toUpperCase(),
        password: formData.password,
        platform: Platform.OS,
      });
      
      // Navigation is handled by App.js based on authentication state
    } catch (error) {
      Alert.alert('Login Failed', error.message);
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'student': return 'Student';
      case 'warden': return 'Warden';
      case 'canteen_owner': return 'Canteen Owner';
      case 'admin': return 'Administrator';
      default: return 'Student';
    }
  };

  const getPlaceholderText = () => {
    switch (userType) {
      case 'student': return 'Enter Roll Number (e.g., 2022CSE001)';
      case 'warden': return 'Enter Employee ID (e.g., EMP001)';
      case 'canteen_owner': return 'Enter Canteen ID (e.g., CANT001)';
      case 'admin': return 'Enter Admin ID (e.g., ADM001)';
      default: return 'Enter Roll Number or Employee ID';
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Image 
            source={{ uri: 'https://via.placeholder.com/100x100.png?text=🏢' }}
            style={styles.logo}
          />
          <Text style={styles.title}>Hostel Hub</Text>
          <Text style={styles.subtitle}>Your Digital Hostel Assistant</Text>
        </View>

        {/* User Type Indicator */}
        <View style={styles.userTypeContainer}>
          <Text style={styles.userTypeLabel}>Logging in as:</Text>
          <Text style={styles.userTypeText}>{getRoleDisplayName(userType)}</Text>
        </View>

        {/* Login Form */}
        <View style={styles.formContainer}>
          {/* Identifier Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Roll Number / Employee ID</Text>
            <TextInput
              style={styles.textInput}
              placeholder={getPlaceholderText()}
              value={formData.identifier}
              onChangeText={(text) => handleInputChange('identifier', text)}
              autoCapitalize="characters"
              autoCompleteType="username"
              textContentType="username"
              returnKeyType="next"
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                value={formData.password}
                onChangeText={(text) => handleInputChange('password', text)}
                secureTextEntry={!showPassword}
                autoCompleteType="password"
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Error Display */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? 'Signing In...' : 'LOGIN'}
            </Text>
          </TouchableOpacity>

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Register Here</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Demo Credentials */}
        <View style={styles.demoContainer}>
          <Text style={styles.demoTitle}>Demo Credentials:</Text>
          <Text style={styles.demoText}>Student: 2022CSE001 / student123456</Text>
          <Text style={styles.demoText}>Warden: EMP001 / warden123456</Text>
          <Text style={styles.demoText}>Canteen: CANT001 / canteen123456</Text>
          <Text style={styles.demoText}>Admin: ADM001 / admin123456</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  userTypeContainer: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 24,
    alignItems: 'center',
  },
  userTypeLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  userTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  eyeButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  eyeText: {
    fontSize: 18,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  loginButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 16,
    color: '#6b7280',
  },
  registerLink: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
  },
  demoContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  demoText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 2,
  },
});

export default LoginScreen;