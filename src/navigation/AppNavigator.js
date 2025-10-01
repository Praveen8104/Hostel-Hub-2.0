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
import AnnouncementsScreen from '../screens/announcements/AnnouncementsScreen';
import MaintenanceScreen from '../screens/maintenance/MaintenanceScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Import canteen screens
import CanteenScreen from '../screens/canteen/CanteenScreen';
import CartScreen from '../screens/canteen/CartScreen';
import MenuItemScreen from '../screens/canteen/MenuItemScreen';
import OrderHistoryScreen from '../screens/canteen/OrderHistoryScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const DiningStack = createStackNavigator();
const CanteenStack = createStackNavigator();

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

// Canteen Stack Navigator
function CanteenStackNavigator() {
  return (
    <CanteenStack.Navigator>
      <CanteenStack.Screen 
        name="CanteenMenu" 
        component={CanteenScreen}
        options={{
          title: 'Canteen',
          headerStyle: { backgroundColor: '#059669' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: 'bold' }
        }}
      />
      <CanteenStack.Screen 
        name="MenuItem" 
        component={MenuItemScreen}
        options={{
          title: 'Item Details',
          headerStyle: { backgroundColor: '#059669' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: 'bold' }
        }}
      />
      <CanteenStack.Screen 
        name="Cart" 
        component={CartScreen}
        options={{
          title: 'My Cart',
          headerStyle: { backgroundColor: '#059669' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: 'bold' }
        }}
      />
      <CanteenStack.Screen 
        name="OrderHistory" 
        component={OrderHistoryScreen}
        options={{
          title: 'Order History',
          headerStyle: { backgroundColor: '#059669' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: 'bold' }
        }}
      />
    </CanteenStack.Navigator>
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
        component={CanteenStackNavigator}
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