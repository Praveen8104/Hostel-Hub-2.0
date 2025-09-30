import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

// Import dining screens
import DiningDashboard from '../screens/dining/DiningDashboard';
import DiningScreen from '../screens/dining/DiningScreen';
import WeeklyMenuScreen from '../screens/dining/WeeklyMenuScreen';
import MealStatsScreen from '../screens/dining/MealStatsScreen';

// Import other feature screens
import DashboardScreen from '../screens/DashboardScreen';
import AnnouncementsScreen from '../screens/AnnouncementsScreen';
import MaintenanceScreen from '../screens/MaintenanceScreen';
import CanteenScreen from '../screens/CanteenScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const DiningStack = createStackNavigator();

// Dining Stack Navigator
function DiningStackNavigator() {
  return (
    <DiningStack.Navigator>
      <DiningStack.Screen 
        name="DiningDashboard" 
        component={DiningDashboard}
        options={{
          title: 'Dining',
          headerStyle: { backgroundColor: '#2563eb' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: 'bold' }
        }}
      />
      <DiningStack.Screen 
        name="TodayMenu" 
        component={DiningScreen}
        options={{
          title: "Today's Menu",
          headerStyle: { backgroundColor: '#2563eb' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: 'bold' }
        }}
      />
      <DiningStack.Screen 
        name="WeeklyMenu" 
        component={WeeklyMenuScreen}
        options={{
          title: 'Weekly Menu',
          headerStyle: { backgroundColor: '#2563eb' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: 'bold' }
        }}
      />
      <DiningStack.Screen 
        name="MealStats" 
        component={MealStatsScreen}
        options={{
          title: 'Meal Statistics',
          headerStyle: { backgroundColor: '#2563eb' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: 'bold' }
        }}
      />
    </DiningStack.Navigator>
  );
}

// Main App Navigator
function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? '🏠' : '🏠';
          } else if (route.name === 'Dining') {
            iconName = focused ? '🍽️' : '🍽️';
          } else if (route.name === 'Maintenance') {
            iconName = focused ? '🔧' : '🔧';
          } else if (route.name === 'Announcements') {
            iconName = focused ? '📢' : '📢';
          } else if (route.name === 'Canteen') {
            iconName = focused ? '🛒' : '🛒';
          } else if (route.name === 'Profile') {
            iconName = focused ? '👤' : '👤';
          }

          return <span style={{ fontSize: size }}>{iconName}</span>;
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen 
        name="Dining" 
        component={DiningStackNavigator}
        options={{ tabBarLabel: 'Dining' }}
      />
      <Tab.Screen 
        name="Maintenance" 
        component={MaintenanceScreen}
        options={{ tabBarLabel: 'Requests' }}
      />
      <Tab.Screen 
        name="Announcements" 
        component={AnnouncementsScreen}
        options={{ tabBarLabel: 'News' }}
      />
      <Tab.Screen 
        name="Canteen" 
        component={CanteenScreen}
        options={{ tabBarLabel: 'Canteen' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

export default AppNavigator;