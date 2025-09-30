import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import ApiService from '../../services/api';

const WeeklyMenuScreen = () => {
  const [weeklyData, setWeeklyData] = useState([]);
  const [currentWeekStart, setCurrentWeekStart] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();

  useEffect(() => {
    const today = new Date();
    const monday = getMonday(today);
    setCurrentWeekStart(monday.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (currentWeekStart) {
      loadWeeklyMenu();
    }
  }, [currentWeekStart]);

  const getMonday = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const loadWeeklyMenu = async () => {
    try {
      setLoading(true);
      const response = await ApiService.request(`/dining/menu/week/${currentWeekStart}`);
      setWeeklyData(response.data || []);
    } catch (error) {
      console.error('Error loading weekly menu:', error);
      Alert.alert('Error', 'Failed to load weekly menu');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWeeklyMenu();
    setRefreshing(false);
  };

  const navigateWeek = (direction) => {
    const currentDate = new Date(currentWeekStart);
    if (direction === 'previous') {
      currentDate.setDate(currentDate.getDate() - 7);
    } else {
      currentDate.setDate(currentDate.getDate() + 7);
    }
    setCurrentWeekStart(currentDate.toISOString().split('T')[0]);
  };

  const getWeekDateRange = () => {
    const start = new Date(currentWeekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const startStr = start.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    const endStr = end.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });

    return `${startStr} - ${endStr}`;
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const stars = [];
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push('⭐');
      } else if (i === fullStars && rating % 1 !== 0) {
        stars.push('⭐');
      } else {
        stars.push('☆');
      }
    }
    return stars.join('');
  };

  const renderMealSummary = (meal) => {
    if (!meal) {
      return <Text style={styles.noMealText}>No meal</Text>;
    }

    const averageRating = meal.stats?.averageRating || 0;
    const mainDish = meal.items.find(item => !item.isVegetarian && !item.isVegan) || meal.items[0];

    return (
      <View style={styles.mealSummary}>
        <Text style={styles.mainDishName} numberOfLines={1}>
          {mainDish?.name || 'Menu available'}
        </Text>
        <Text style={styles.itemCount}>
          {meal.items.length} item{meal.items.length !== 1 ? 's' : ''}
        </Text>
        {averageRating > 0 && (
          <View style={styles.ratingRow}>
            <Text style={styles.miniStars}>{renderStars(averageRating)}</Text>
            <Text style={styles.ratingValue}>{averageRating.toFixed(1)}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderDayCard = (dayData) => {
    const date = new Date(dayData.date);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNumber = date.getDate();
    const isToday = dayData.date === new Date().toISOString().split('T')[0];

    return (
      <View key={dayData.date} style={[styles.dayCard, isToday && styles.todayCard]}>
        <View style={styles.dayHeader}>
          <Text style={[styles.dayName, isToday && styles.todayText]}>{dayName}</Text>
          <Text style={[styles.dayNumber, isToday && styles.todayText]}>{dayNumber}</Text>
          {isToday && <Text style={styles.todayLabel}>Today</Text>}
        </View>

        <View style={styles.mealsContainer}>
          <View style={styles.mealSlot}>
            <Text style={styles.mealLabel}>Breakfast</Text>
            {renderMealSummary(dayData.meals?.breakfast)}
          </View>

          <View style={styles.mealSlot}>
            <Text style={styles.mealLabel}>Lunch</Text>
            {renderMealSummary(dayData.meals?.lunch)}
          </View>

          <View style={styles.mealSlot}>
            <Text style={styles.mealLabel}>Dinner</Text>
            {renderMealSummary(dayData.meals?.dinner)}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading weekly menu...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Week Navigation Header */}
      <View style={styles.weekHeader}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigateWeek('previous')}
        >
          <Text style={styles.navButtonText}>← Previous Week</Text>
        </TouchableOpacity>

        <View style={styles.weekInfo}>
          <Text style={styles.weekRange}>{getWeekDateRange()}</Text>
        </View>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigateWeek('next')}
        >
          <Text style={styles.navButtonText}>Next Week →</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {weeklyData.length > 0 ? (
          <View style={styles.weekContainer}>
            {weeklyData.map(dayData => renderDayCard(dayData))}
          </View>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No menu data available for this week</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadWeeklyMenu}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
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
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  navButton: {
    flex: 1,
  },
  navButtonText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  weekInfo: {
    flex: 2,
    alignItems: 'center',
  },
  weekRange: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  weekContainer: {
    padding: 16,
  },
  dayCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  todayCard: {
    borderWidth: 2,
    borderColor: '#2563eb',
    backgroundColor: '#f0f9ff',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dayName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginRight: 8,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6b7280',
    marginRight: 12,
  },
  todayText: {
    color: '#2563eb',
  },
  todayLabel: {
    backgroundColor: '#2563eb',
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  mealsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mealSlot: {
    flex: 1,
    marginHorizontal: 4,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    minHeight: 80,
  },
  mealLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  mealSummary: {
    flex: 1,
  },
  mainDishName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  itemCount: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniStars: {
    fontSize: 10,
    marginRight: 4,
  },
  ratingValue: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  noMealText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  noDataText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WeeklyMenuScreen;