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
  Picker,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

const RegisterScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    identifier: '',
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    course: '',
    year: 1,
    roomNumber: '',
    parentPhone: '',
    designation: '',
    department: 'other',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userType, setUserType] = useState('student');

  const { register, isLoading, error, clearError } = useAuth();

  useEffect(() => {
    clearError();
  }, [formData]);

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

    if (field === 'identifier' && value.length > 3) {
      const detectedType = detectUserType(value);
      setUserType(detectedType);
    }
  };

  const validateForm = () => {
    // Basic validation
    if (!formData.identifier.trim()) {
      Alert.alert('Validation Error', 'Please enter your Roll Number or Employee ID');
      return false;
    }

    if (!formData.email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email address');
      return false;
    }

    if (!formData.email.includes('@')) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }

    if (!formData.password.trim()) {
      Alert.alert('Validation Error', 'Please enter a password');
      return false;
    }

    if (formData.password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters long');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match');
      return false;
    }

    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Please enter your full name');
      return false;
    }

    if (!formData.phone.trim()) {
      Alert.alert('Validation Error', 'Please enter your phone number');
      return false;
    }

    if (formData.phone.length < 10) {
      Alert.alert('Validation Error', 'Please enter a valid phone number');
      return false;
    }

    // Student-specific validation
    if (userType === 'student') {
      if (!formData.course.trim()) {
        Alert.alert('Validation Error', 'Please enter your course');
        return false;
      }

      if (!formData.parentPhone.trim()) {
        Alert.alert('Validation Error', 'Please enter parent phone number');
        return false;
      }
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      const registrationData = {
        identifier: formData.identifier.toUpperCase(),
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
      };

      if (userType === 'student') {
        registrationData.course = formData.course.trim();
        registrationData.year = formData.year;
        registrationData.roomNumber = formData.roomNumber.trim() || 'TBD';
        registrationData.parentPhone = formData.parentPhone.trim();
      } else {
        registrationData.designation = formData.designation.trim() || 'Staff';
        registrationData.department = formData.department;
      }

      await register(registrationData);
      
    } catch (error) {
      Alert.alert('Registration Failed', error.message);
    }
  };

  const renderStudentFields = () => (
    <>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Course *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g., Computer Science Engineering"
          value={formData.course}
          onChangeText={(text) => handleInputChange('course', text)}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Year *</Text>
        <Picker
          selectedValue={formData.year}
          style={styles.picker}
          onValueChange={(value) => handleInputChange('year', value)}
        >
          <Picker.Item label="1st Year" value={1} />
          <Picker.Item label="2nd Year" value={2} />
          <Picker.Item label="3rd Year" value={3} />
          <Picker.Item label="4th Year" value={4} />
          <Picker.Item label="5th Year" value={5} />
        </Picker>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Room Number (Optional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g., 204"
          value={formData.roomNumber}
          onChangeText={(text) => handleInputChange('roomNumber', text)}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Parent Phone Number *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Parent's phone number"
          value={formData.parentPhone}
          onChangeText={(text) => handleInputChange('parentPhone', text)}
          keyboardType="phone-pad"
        />
      </View>
    </>
  );

  const renderStaffFields = () => (
    <>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Designation</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g., Warden, Manager"
          value={formData.designation}
          onChangeText={(text) => handleInputChange('designation', text)}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Department</Text>
        <Picker
          selectedValue={formData.department}
          style={styles.picker}
          onValueChange={(value) => handleInputChange('department', value)}
        >
          <Picker.Item label="Hostel Administration" value="hostel_administration" />
          <Picker.Item label="Canteen" value="canteen" />
          <Picker.Item label="Maintenance" value="maintenance" />
          <Picker.Item label="Security" value="security" />
          <Picker.Item label="Other" value="other" />
        </Picker>
      </View>
    </>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Hostel Hub Community</Text>
        </View>

        {/* User Type Indicator */}
        <View style={styles.userTypeContainer}>
          <Text style={styles.userTypeLabel}>Registering as:</Text>
          <Text style={styles.userTypeText}>
            {userType === 'student' ? 'Student' : 
             userType === 'warden' ? 'Warden' :
             userType === 'canteen_owner' ? 'Canteen Owner' : 'Administrator'}
          </Text>
        </View>

        {/* Registration Form */}
        <View style={styles.formContainer}>
          {/* Common Fields */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Roll Number / Employee ID *</Text>
            <TextInput
              style={styles.textInput}
              placeholder={userType === 'student' ? '2022CSE001' : 'EMP001'}
              value={formData.identifier}
              onChangeText={(text) => handleInputChange('identifier', text)}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email Address *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="your.email@example.com"
              value={formData.email}
              onChangeText={(text) => handleInputChange('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Full Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter your full name"
              value={formData.name}
              onChangeText={(text) => handleInputChange('name', text)}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Phone Number *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Your phone number"
              value={formData.phone}
              onChangeText={(text) => handleInputChange('phone', text)}
              keyboardType="phone-pad"
            />
          </View>

          {/* Password Fields */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Choose a strong password"
                value={formData.password}
                onChangeText={(text) => handleInputChange('password', text)}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Confirm Password *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChangeText={(text) => handleInputChange('confirmPassword', text)}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Text style={styles.eyeText}>{showConfirmPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Role-specific Fields */}
          {userType === 'student' ? renderStudentFields() : renderStaffFields()}

          {/* Error Display */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            <Text style={styles.registerButtonText}>
              {isLoading ? 'Creating Account...' : 'CREATE ACCOUNT'}
            </Text>
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Login Here</Text>
            </TouchableOpacity>
          </View>
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
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
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
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
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
  picker: {
    height: 48,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
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
  registerButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  registerButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  registerButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 16,
    color: '#6b7280',
  },
  loginLink: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
  },
});

export default RegisterScreen;