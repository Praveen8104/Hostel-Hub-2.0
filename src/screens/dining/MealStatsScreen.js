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

const MealStatsScreen = () => {
  const [statsData, setStatsData] = useState({});
  const [selectedPeriod, setSelectedPeriod] = useState('week'); // week, month
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();

  useEffect(() => {
    loadStatsData();
  }, [selectedPeriod]);

  const loadStatsData = async () => {
    try {
      setLoading(true);
      const response = await ApiService.request(`/dining/stats?period=${selectedPeriod}`);
      setStatsData(response.data || {});
    } catch (error) {
      console.error('Error loading stats:', error);
      Alert.alert('Error', 'Failed to load meal statistics');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStatsData();
    setRefreshing(false);
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const stars = [];

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

  const renderProgressBar = (value, maxValue, color) => {
    const percentage = (value / maxValue) * 100;
    return (
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
    );
  };

  const renderMealTypeStats = (mealType, data) => {
    if (!data) return null;

    return (
      <View style={styles.mealStatsCard}>
        <Text style={styles.mealStatsTitle}>
          {mealType.charAt(0).toUpperCase() + mealType.slice(1)} Statistics
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{data.averageRating?.toFixed(1) || '0.0'}</Text>
            <Text style={styles.statLabel}>Average Rating</Text>
            <Text style={styles.starsDisplay}>{renderStars(data.averageRating || 0)}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{data.totalRatings || 0}</Text>
            <Text style={styles.statLabel}>Total Reviews</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{data.recommendationRate?.toFixed(0) || 0}%</Text>
            <Text style={styles.statLabel}>Recommended</Text>
          </View>
        </View>

        {/* Detailed Ratings Breakdown */}
        <View style={styles.ratingsBreakdown}>
          <Text style={styles.breakdownTitle}>Rating Categories</Text>
          
          <View style={styles.categoryRow}>
            <Text style={styles.categoryLabel}>Taste</Text>
            <View style={styles.categoryValue}>
              <Text style={styles.categoryRating}>{data.averageTaste?.toFixed(1) || '0.0'}</Text>
              {renderProgressBar(data.averageTaste || 0, 5, '#10b981')}
            </View>
          </View>

          <View style={styles.categoryRow}>
            <Text style={styles.categoryLabel}>Quality</Text>
            <View style={styles.categoryValue}>
              <Text style={styles.categoryRating}>{data.averageQuality?.toFixed(1) || '0.0'}</Text>
              {renderProgressBar(data.averageQuality || 0, 5, '#3b82f6')}
            </View>
          </View>

          <View style={styles.categoryRow}>
            <Text style={styles.categoryLabel}>Quantity</Text>
            <View style={styles.categoryValue}>
              <Text style={styles.categoryRating}>{data.averageQuantity?.toFixed(1) || '0.0'}</Text>
              {renderProgressBar(data.averageQuantity || 0, 5, '#f59e0b')}
            </View>
          </View>
        </View>

        {/* Star Distribution */}
        <View style={styles.starDistribution}>
          <Text style={styles.breakdownTitle}>Rating Distribution</Text>
          {[5, 4, 3, 2, 1].map(star => {
            const count = data.starDistribution?.[star] || 0;
            const total = data.totalRatings || 1;
            const percentage = (count / total) * 100;

            return (
              <View key={star} style={styles.starRow}>
                <Text style={styles.starLabel}>{star} ⭐</Text>
                <View style={styles.starBar}>
                  <View style={[styles.starFill, { width: `${percentage}%` }]} />
                </View>
                <Text style={styles.starCount}>{count}</Text>
              </View>
            );
          })}
        </View>

        {/* Recent Feedback */}
        {data.recentFeedback && data.recentFeedback.length > 0 && (
          <View style={styles.recentFeedback}>
            <Text style={styles.breakdownTitle}>Recent Feedback</Text>
            {data.recentFeedback.slice(0, 3).map((feedback, index) => (
              <View key={index} style={styles.feedbackItem}>
                <View style={styles.feedbackHeader}>
                  <Text style={styles.feedbackRating}>
                    {renderStars(feedback.rating)} {feedback.rating}/5
                  </Text>
                  <Text style={styles.feedbackDate}>
                    {new Date(feedback.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                {feedback.feedback && (
                  <Text style={styles.feedbackText} numberOfLines={2}>
                    "{feedback.feedback}"
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderOverallStats = () => {
    if (!statsData.overall) return null;

    return (
      <View style={styles.overallStatsCard}>
        <Text style={styles.overallTitle}>Overall Performance</Text>
        
        <View style={styles.overallGrid}>
          <View style={styles.overallItem}>
            <Text style={styles.overallValue}>
              {statsData.overall.averageRating?.toFixed(1) || '0.0'}
            </Text>
            <Text style={styles.overallLabel}>Overall Rating</Text>
            <Text style={styles.overallStars}>
              {renderStars(statsData.overall.averageRating || 0)}
            </Text>
          </View>

          <View style={styles.overallItem}>
            <Text style={styles.overallValue}>
              {statsData.overall.totalMealsServed || 0}
            </Text>
            <Text style={styles.overallLabel}>Meals Served</Text>
          </View>

          <View style={styles.overallItem}>
            <Text style={styles.overallValue}>
              {statsData.overall.totalReviews || 0}
            </Text>
            <Text style={styles.overallLabel}>Total Reviews</Text>
          </View>

          <View style={styles.overallItem}>
            <Text style={styles.overallValue}>
              {statsData.overall.satisfactionRate?.toFixed(0) || 0}%
            </Text>
            <Text style={styles.overallLabel}>Satisfaction</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading meal statistics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Period Selector */}
      <View style={styles.periodSelector}>
        <TouchableOpacity
          style={[styles.periodButton, selectedPeriod === 'week' && styles.activePeriod]}
          onPress={() => setSelectedPeriod('week')}
        >
          <Text style={[styles.periodText, selectedPeriod === 'week' && styles.activePeriodText]}>
            This Week
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.periodButton, selectedPeriod === 'month' && styles.activePeriod]}
          onPress={() => setSelectedPeriod('month')}
        >
          <Text style={[styles.periodText, selectedPeriod === 'month' && styles.activePeriodText]}>
            This Month
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderOverallStats()}
        {renderMealTypeStats('breakfast', statsData.breakfast)}
        {renderMealTypeStats('lunch', statsData.lunch)}
        {renderMealTypeStats('dinner', statsData.dinner)}

        {(!statsData.overall && !statsData.breakfast && !statsData.lunch && !statsData.dinner) && (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No statistics available for this period</Text>
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
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 8,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  activePeriod: {
    backgroundColor: '#2563eb',
  },
  periodText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  activePeriodText: {
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  overallStatsCard: {
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
  overallTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 16,
    textAlign: 'center',
  },
  overallGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  overallItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  overallValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  overallLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  overallStars: {
    fontSize: 14,
    marginTop: 4,
  },
  mealStatsCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mealStatsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  starsDisplay: {
    fontSize: 12,
    marginTop: 4,
  },
  ratingsBreakdown: {
    marginBottom: 20,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 14,
    color: '#6b7280',
    width: 60,
  },
  categoryValue: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryRating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    width: 30,
    marginRight: 8,
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  starDistribution: {
    marginBottom: 20,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  starLabel: {
    fontSize: 14,
    color: '#6b7280',
    width: 40,
  },
  starBar: {
    flex: 1,
    height: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  starFill: {
    height: '100%',
    backgroundColor: '#fbbf24',
    borderRadius: 8,
  },
  starCount: {
    fontSize: 14,
    color: '#6b7280',
    width: 30,
    textAlign: 'right',
  },
  recentFeedback: {
    // No marginBottom since it's the last section
  },
  feedbackItem: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  feedbackRating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  feedbackDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  feedbackText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
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
});

export default MealStatsScreen;