import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import ApiService from '../../services/api';

const DiningScreen = () => {
  const [menuData, setMenuData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ratingModal, setRatingModal] = useState({ visible: false, menu: null });
  const [userRating, setUserRating] = useState({
    rating: 5,
    taste: 5,
    quality: 5,
    quantity: 5,
    feedback: '',
    wouldRecommend: true
  });

  const { user } = useAuth();

  useEffect(() => {
    loadMenuData();
  }, [selectedDate]);

  const loadMenuData = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getMenu(selectedDate);
      setMenuData(response.data);
    } catch (error) {
      console.error('Error loading menu:', error);
      Alert.alert('Error', 'Failed to load menu data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMenuData();
    setRefreshing(false);
  };

  const submitRating = async () => {
    try {
      const response = await ApiService.request('/dining/rating', {
        method: 'POST',
        body: JSON.stringify({
          menuId: ratingModal.menu._id,
          ...userRating
        })
      });

      Alert.alert('Success', 'Your rating has been submitted!');
      setRatingModal({ visible: false, menu: null });
      
      // Refresh menu to get updated ratings
      await loadMenuData();
    } catch (error) {
      console.error('Rating error:', error);
      Alert.alert('Error', 'Failed to submit rating');
    }
  };

  const openRatingModal = (menu) => {
    setRatingModal({ visible: true, menu });
    setUserRating({
      rating: 5,
      taste: 5,
      quality: 5,
      quantity: 5,
      feedback: '',
      wouldRecommend: true
    });
  };

  const formatTime = (timeString) => {
    return timeString;
  };

  const getQueueStatusColor = (status) => {
    switch (status) {
      case 'light': return '#10b981'; // Green
      case 'medium': return '#f59e0b'; // Yellow
      case 'heavy': return '#ef4444'; // Red
      default: return '#6b7280'; // Gray
    }
  };

  const getQueueStatusText = (status) => {
    switch (status) {
      case 'light': return 'Light Queue';
      case 'medium': return 'Medium Queue';
      case 'heavy': return 'Heavy Queue';
      default: return 'Unknown';
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push('⭐');
      } else if (i === fullStars && hasHalfStar) {
        stars.push('⭐');
      } else {
        stars.push('☆');
      }
    }
    return stars.join('');
  };

  const renderMealCard = (mealType, meal) => {
    if (!meal) {
      return (
        <View key={mealType} style={styles.mealCard}>
          <View style={styles.mealHeader}>
            <Text style={styles.mealTitle}>
              {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
            </Text>
          </View>
          <Text style={styles.noMenuText}>No menu available</Text>
        </View>
      );
    }

    const averageRating = meal.stats?.averageRating || 0;
    const totalRatings = meal.stats?.totalRatings || 0;

    return (
      <View key={mealType} style={styles.mealCard}>
        {/* Meal Header */}
        <View style={styles.mealHeader}>
          <View>
            <Text style={styles.mealTitle}>
              {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
            </Text>
            <Text style={styles.mealTimings}>
              {formatTime(meal.timings.start)} - {formatTime(meal.timings.end)}
            </Text>
          </View>
          <View style={styles.mealMeta}>
            <View style={[styles.queueBadge, { backgroundColor: getQueueStatusColor(meal.queueStatus) }]}>
              <Text style={styles.queueText}>{getQueueStatusText(meal.queueStatus)}</Text>
            </View>
            <Text style={styles.waitTime}>{meal.estimatedWaitTime} min wait</Text>
          </View>
        </View>

        {/* Rating Section */}
        <View style={styles.ratingSection}>
          <View style={styles.ratingDisplay}>
            <Text style={styles.starsText}>{renderStars(averageRating)}</Text>
            <Text style={styles.ratingText}>
              {averageRating.toFixed(1)} ({totalRatings} reviews)
            </Text>
          </View>
          {user?.role === 'student' && (
            <TouchableOpacity
              style={styles.rateButton}
              onPress={() => openRatingModal(meal)}
            >
              <Text style={styles.rateButtonText}>Rate Meal</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Menu Items */}
        <View style={styles.menuItems}>
          {meal.items.map((item, index) => (
            <View key={index} style={styles.menuItem}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.description && (
                  <Text style={styles.itemDescription}>{item.description}</Text>
                )}
              </View>
              <View style={styles.itemMeta}>
                <Text style={styles.itemCalories}>{item.calories} cal</Text>
                <Text style={styles.itemBadge}>
                  {item.isVegan ? '🌱' : item.isVegetarian ? '🥬' : '🍖'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Special Notes */}
        {meal.specialNotes && (
          <View style={styles.specialNotes}>
            <Text style={styles.specialNotesText}>💡 {meal.specialNotes}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderRatingModal = () => (
    <Modal
      visible={ratingModal.visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setRatingModal({ visible: false, menu: null })}>
            <Text style={styles.modalCloseButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Rate Your Meal</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Overall Rating */}
          <View style={styles.ratingGroup}>
            <Text style={styles.ratingLabel}>Overall Rating</Text>
            <View style={styles.starRating}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setUserRating(prev => ({ ...prev, rating: star }))}
                >
                  <Text style={styles.starButton}>
                    {star <= userRating.rating ? '⭐' : '☆'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Detailed Ratings */}
          <View style={styles.ratingGroup}>
            <Text style={styles.ratingLabel}>Taste</Text>
            <View style={styles.starRating}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setUserRating(prev => ({ ...prev, taste: star }))}
                >
                  <Text style={styles.starButton}>
                    {star <= userRating.taste ? '⭐' : '☆'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.ratingGroup}>
            <Text style={styles.ratingLabel}>Quality</Text>
            <View style={styles.starRating}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setUserRating(prev => ({ ...prev, quality: star }))}
                >
                  <Text style={styles.starButton}>
                    {star <= userRating.quality ? '⭐' : '☆'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.ratingGroup}>
            <Text style={styles.ratingLabel}>Quantity</Text>
            <View style={styles.starRating}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setUserRating(prev => ({ ...prev, quantity: star }))}
                >
                  <Text style={styles.starButton}>
                    {star <= userRating.quantity ? '⭐' : '☆'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Feedback */}
          <View style={styles.ratingGroup}>
            <Text style={styles.ratingLabel}>Feedback (Optional)</Text>
            <TextInput
              style={styles.feedbackInput}
              placeholder="Share your thoughts about the meal..."
              value={userRating.feedback}
              onChangeText={(text) => setUserRating(prev => ({ ...prev, feedback: text }))}
              multiline
              maxLength={500}
            />
          </View>

          {/* Recommend */}
          <TouchableOpacity
            style={styles.recommendToggle}
            onPress={() => setUserRating(prev => ({ ...prev, wouldRecommend: !prev.wouldRecommend }))}
          >
            <Text style={styles.recommendText}>
              {userRating.wouldRecommend ? '✅' : '☐'} Would recommend this meal
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.submitButton} onPress={submitRating}>
            <Text style={styles.submitButtonText}>Submit Rating</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );

  if (loading && !menuData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading today's menu...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Date Header */}
      <View style={styles.dateHeader}>
        <TouchableOpacity
          onPress={() => {
            const yesterday = new Date(selectedDate);
            yesterday.setDate(yesterday.getDate() - 1);
            setSelectedDate(yesterday.toISOString().split('T')[0]);
          }}
        >
          <Text style={styles.dateNavButton}>← Previous</Text>
        </TouchableOpacity>
        
        <Text style={styles.selectedDate}>
          {new Date(selectedDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </Text>
        
        <TouchableOpacity
          onPress={() => {
            const tomorrow = new Date(selectedDate);
            tomorrow.setDate(tomorrow.getDate() + 1);
            setSelectedDate(tomorrow.toISOString().split('T')[0]);
          }}
        >
          <Text style={styles.dateNavButton}>Next →</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {menuData?.meals ? (
          <>
            {renderMealCard('breakfast', menuData.meals.breakfast)}
            {renderMealCard('lunch', menuData.meals.lunch)}
            {renderMealCard('dinner', menuData.meals.dinner)}
          </>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No menu data available for this date</Text>
          </View>
        )}
      </ScrollView>

      {renderRatingModal()}
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
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dateNavButton: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
  },
  selectedDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  mealCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
  },
  mealTimings: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  mealMeta: {
    alignItems: 'flex-end',
  },
  queueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  queueText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  waitTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  ratingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsText: {
    fontSize: 16,
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  rateButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  rateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  menuItems: {
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  itemDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  itemMeta: {
    alignItems: 'flex-end',
  },
  itemCalories: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  itemBadge: {
    fontSize: 16,
  },
  specialNotes: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  specialNotesText: {
    fontSize: 14,
    color: '#92400e',
  },
  noMenuText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 16,
    paddingVertical: 20,
  },
  noDataContainer: {
    padding: 32,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalCloseButton: {
    fontSize: 24,
    color: '#6b7280',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  ratingGroup: {
    marginBottom: 24,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  starRating: {
    flexDirection: 'row',
  },
  starButton: {
    fontSize: 32,
    marginRight: 8,
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  recommendToggle: {
    paddingVertical: 12,
    marginBottom: 24,
  },
  recommendText: {
    fontSize: 16,
    color: '#374151',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 32,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default DiningScreen;