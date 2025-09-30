import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import ApiService from '../../services/api';

const DiningDashboard = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [todayMenu, setTodayMenu] = useState(null);
  const [weeklyStats, setWeeklyStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      // Load today's menu and weekly stats in parallel
      const [menuResponse, statsResponse] = await Promise.allSettled([
        ApiService.getMenu(today),
        ApiService.getMealStats('week')
      ]);

      if (menuResponse.status === 'fulfilled') {
        setTodayMenu(menuResponse.value.data);
      }

      if (statsResponse.status === 'fulfilled') {
        setWeeklyStats(statsResponse.value.data);
      }
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const getCurrentMeal = () => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const time = hour * 100 + minute;

    if (time >= 700 && time <= 1000) return 'breakfast';
    if (time >= 1200 && time <= 1500) return 'lunch';
    if (time >= 1900 && time <= 2200) return 'dinner';
    
    // Default to next meal
    if (time < 700) return 'breakfast';
    if (time < 1200) return 'lunch';
    if (time < 1900) return 'dinner';
    return 'breakfast'; // Next day breakfast
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const stars = [];
    
    for (let i = 0; i < 5; i++) {
      stars.push(i < fullStars ? '⭐' : '☆');
    }
    return stars.join('');
  };

  const renderCurrentMeal = () => {
    const currentMeal = getCurrentMeal();
    const meal = todayMenu?.meals?.[currentMeal];

    if (!meal) {
      return (
        <View style={styles.currentMealCard}>
          <Text style={styles.cardTitle}>Current Meal</Text>
          <Text style={styles.noMealText}>No menu available for {currentMeal}</Text>
        </View>
      );
    }

    const averageRating = meal.stats?.averageRating || 0;

    return (
      <TouchableOpacity 
        style={styles.currentMealCard}
        onPress={() => navigation.navigate('TodayMenu')}
      >
        <Text style={styles.cardTitle}>
          {currentMeal.charAt(0).toUpperCase() + currentMeal.slice(1)} Now
        </Text>
        <Text style={styles.mealTime}>
          {meal.timings?.start} - {meal.timings?.end}
        </Text>
        
        <View style={styles.mealPreview}>
          <Text style={styles.dishName} numberOfLines={1}>
            {meal.items[0]?.name || 'Menu available'}
          </Text>
          <Text style={styles.itemCount}>
            +{meal.items.length - 1} more items
          </Text>
        </View>

        {averageRating > 0 && (
          <View style={styles.ratingPreview}>
            <Text style={styles.stars}>{renderStars(averageRating)}</Text>
            <Text style={styles.ratingText}>{averageRating.toFixed(1)}</Text>
          </View>
        )}

        <View style={styles.queueInfo}>
          <View style={[styles.queueBadge, { 
            backgroundColor: meal.queueStatus === 'light' ? '#10b981' : 
                          meal.queueStatus === 'medium' ? '#f59e0b' : '#ef4444'
          }]}>
            <Text style={styles.queueText}>
              {meal.queueStatus === 'light' ? 'Light Queue' :
               meal.queueStatus === 'medium' ? 'Medium Queue' : 'Heavy Queue'}
            </Text>
          </View>
          <Text style={styles.waitTime}>{meal.estimatedWaitTime || 5} min wait</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderQuickActions = () => {
    return (
      <View style={styles.quickActionsCard}>
        <Text style={styles.cardTitle}>Quick Actions</Text>
        
        <View style={styles.actionGrid}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('TodayMenu')}
          >
            <Text style={styles.actionIcon}>🍽️</Text>
            <Text style={styles.actionLabel}>Today's Menu</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('WeeklyMenu')}
          >
            <Text style={styles.actionIcon}>📅</Text>
            <Text style={styles.actionLabel}>Weekly Menu</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('MealStats')}
          >
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionLabel}>Meal Stats</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, { opacity: 0.5 }]}
            disabled
          >
            <Text style={styles.actionIcon}>⏰</Text>
            <Text style={styles.actionLabel}>Meal Alerts</Text>
            <Text style={styles.comingSoon}>Coming Soon</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderWeeklyOverview = () => {
    if (!weeklyStats) return null;

    return (
      <View style={styles.weeklyOverviewCard}>
        <Text style={styles.cardTitle}>This Week's Summary</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {weeklyStats.overall?.averageRating?.toFixed(1) || '0.0'}
            </Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
            <Text style={styles.statSubtext}>
              {renderStars(weeklyStats.overall?.averageRating || 0)}
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {weeklyStats.overall?.totalReviews || 0}
            </Text>
            <Text style={styles.statLabel}>Reviews</Text>
            <Text style={styles.statSubtext}>This Week</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {weeklyStats.overall?.satisfactionRate?.toFixed(0) || 0}%
            </Text>
            <Text style={styles.statLabel}>Satisfaction</Text>
            <Text style={styles.statSubtext}>Rate</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.viewMoreButton}
          onPress={() => navigation.navigate('MealStats')}
        >
          <Text style={styles.viewMoreText}>View Detailed Stats →</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading dining information...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Welcome Header */}
      <View style={styles.welcomeHeader}>
        <Text style={styles.welcomeText}>
          Welcome, {user?.firstName || 'Student'}!
        </Text>
        <Text style={styles.dateText}>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </Text>
      </View>

      {/* Current Meal */}
      {renderCurrentMeal()}

      {/* Quick Actions */}
      {renderQuickActions()}

      {/* Weekly Overview */}
      {renderWeeklyOverview()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  welcomeHeader: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 16,
    color: '#6b7280',
  },
  currentMealCard: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 12,
  },
  mealTime: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  mealPreview: {
    marginBottom: 12,
  },
  dishName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  itemCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  ratingPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stars: {
    fontSize: 16,
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  queueInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  queueBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  queueText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  waitTime: {
    fontSize: 14,
    color: '#6b7280',
  },
  noMealText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 20,
  },
  quickActionsCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 12,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  comingSoon: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 4,
  },
  weeklyOverviewCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 4,
  },
  statSubtext: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
    textAlign: 'center',
  },
  viewMoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewMoreText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
  },
});

export default DiningDashboard;