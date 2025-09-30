import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

// Context
import { AuthProvider, useAuth } from './src/context/AuthContext';

// Auth Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';

// Main App Screens (Placeholder)
const HomeScreen = () => (
  <View style={styles.centerContainer}>
    <Text style={styles.welcomeText}>Welcome to Hostel Hub! 🏠</Text>
    <Text style={styles.subText}>Authentication Complete</Text>
  </View>
);

const DiningScreen = () => (
  <View style={styles.centerContainer}>
    <Text style={styles.screenTitle}>Dining 🍽️</Text>
    <Text style={styles.subText}>Mess Menu & Food Ratings</Text>
  </View>
);

const RequestsScreen = () => (
  <View style={styles.centerContainer}>
    <Text style={styles.screenTitle}>Requests 📋</Text>
    <Text style={styles.subText}>Outpass & Maintenance</Text>
  </View>
);

const ProfileScreen = () => {
  const { logout, user } = useAuth();
  
  return (
    <View style={styles.centerContainer}>
      <Text style={styles.screenTitle}>Profile 👤</Text>
      <Text style={styles.subText}>Welcome, {user?.profile?.name || user?.identifier}!</Text>
      <Text style={styles.roleText}>Role: {user?.role}</Text>
      <Text 
        style={styles.logoutText} 
        onPress={logout}
      >
        Logout
      </Text>
    </View>
  );
};

// Navigation Stacks
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Stack
const AuthStack = () => (
  <Stack.Navigator 
    initialRouteName="Login"
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

// Main App Tabs
const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor: '#2563eb',
      tabBarInactiveTintColor: '#6b7280',
      tabBarStyle: {
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
      },
      headerStyle: {
        backgroundColor: '#2563eb',
      },
      headerTintColor: 'white',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}
  >
    <Tab.Screen 
      name="Home" 
      component={HomeScreen}
      options={{
        tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text>,
        title: 'Dashboard'
      }}
    />
    <Tab.Screen 
      name="Dining" 
      component={DiningScreen}
      options={{
        tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🍽️</Text>,
      }}
    />
    <Tab.Screen 
      name="Requests" 
      component={RequestsScreen}
      options={{
        tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📋</Text>,
      }}
    />
    <Tab.Screen 
      name="Profile" 
      component={ProfileScreen}
      options={{
        tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text>,
      }}
    />
  </Tab.Navigator>
);

// Loading Screen
const LoadingScreen = () => (
  <View style={styles.centerContainer}>
    <ActivityIndicator size="large" color="#2563eb" />
    <Text style={styles.loadingText}>Loading Hostel Hub...</Text>
  </View>
);

// App Navigator
const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
};

// Main App Component
export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <AppNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
    textAlign: 'center',
    marginBottom: 12,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2563eb',
    textAlign: 'center',
    marginBottom: 12,
  },
  subText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  roleText: {
    fontSize: 14,
    color: '#059669',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  logoutText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    textAlign: 'center',
  },
});
