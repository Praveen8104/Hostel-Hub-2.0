import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
  Image,
  Linking
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/api';

const AnnouncementsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchAnnouncements = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const params = {};
      if (filter === 'unread') params.unreadOnly = true;
      if (filter === 'events') params.upcomingEvents = true;
      if (filter !== 'all') params.category = filter;

      const response = await apiService.getAnnouncements(params);
      
      if (response.success) {
        setAnnouncements(response.data.announcements || []);
        
        // Get unread count
        const unreadResponse = await apiService.getAnnouncements({ unreadOnly: true });
        if (unreadResponse.success) {
          setUnreadCount(unreadResponse.data.announcements?.length || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
      Alert.alert('Error', 'Failed to fetch announcements');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAnnouncements();
    }, [filter])
  );

  const handleRefresh = () => {
    fetchAnnouncements(true);
  };

  const handleAnnouncementPress = async (announcement) => {
    try {
      // Mark as read
      await apiService.markAnnouncementAsRead(announcement._id);
      
      // Navigate to detail screen
      navigation.navigate('AnnouncementDetail', { 
        announcementId: announcement._id,
        announcement 
      });
      
      // Refresh to update read status
      fetchAnnouncements();
    } catch (error) {
      console.error('Error marking announcement as read:', error);
      // Still navigate even if marking as read fails
      navigation.navigate('AnnouncementDetail', { 
        announcementId: announcement._id,
        announcement 
      });
    }
  };

  const handleEventRegister = async (announcementId, isRegistered) => {
    try {
      if (isRegistered) {
        await apiService.unregisterFromEvent(announcementId);
        Alert.alert('Success', 'Unregistered from event successfully');
      } else {
        await apiService.registerForEvent(announcementId);
        Alert.alert('Success', 'Registered for event successfully');
      }
      fetchAnnouncements();
    } catch (error) {
      console.error('Event registration error:', error);
      Alert.alert('Error', error.message || 'Failed to register/unregister for event');
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      notice: '📢',
      event: '🎉',
      emergency: '🚨',
      maintenance: '🔧',
      dining: '🍽️',
      general: '📝'
    };
    return icons[category] || '📝';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: '#4CAF50',
      medium: '#FF9800',
      high: '#FF5722',
      urgent: '#F44336'
    };
    return colors[priority] || '#9E9E9E';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const isUserRegisteredForEvent = (announcement) => {
    if (!announcement.eventDetails?.registeredParticipants) return false;
    return announcement.eventDetails.registeredParticipants.some(
      participant => participant.user._id === user._id || participant.user === user._id
    );
  };

  const isAnnouncementRead = (announcement) => {
    if (!announcement.readBy) return false;
    return announcement.readBy.some(
      read => read.user._id === user._id || read.user === user._id
    );
  };

  const FilterButton = ({ title, value, count }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === value && styles.filterButtonActive
      ]}
      onPress={() => setFilter(value)}
    >
      <Text style={[
        styles.filterButtonText,
        filter === value && styles.filterButtonTextActive
      ]}>
        {title}
        {count !== undefined && count > 0 && (
          <Text style={styles.filterCount}> ({count})</Text>
        )}
      </Text>
    </TouchableOpacity>
  );

  const AnnouncementCard = ({ announcement }) => {
    const isRead = isAnnouncementRead(announcement);
    const isEvent = announcement.category === 'event';
    const isRegistered = isEvent ? isUserRegisteredForEvent(announcement) : false;
    const canRegister = isEvent && announcement.eventDetails?.registrationRequired;

    return (
      <TouchableOpacity
        style={[
          styles.announcementCard,
          !isRead && styles.unreadCard,
          announcement.isPinned && styles.pinnedCard
        ]}
        onPress={() => handleAnnouncementPress(announcement)}
      >
        {announcement.isPinned && (
          <View style={styles.pinnedIndicator}>
            <Text style={styles.pinnedText}>📌 Pinned</Text>
          </View>
        )}
        
        <View style={styles.cardHeader}>
          <View style={styles.categoryContainer}>
            <Text style={styles.categoryIcon}>
              {getCategoryIcon(announcement.category)}
            </Text>
            <Text style={styles.categoryText}>
              {announcement.category.toUpperCase()}
            </Text>
          </View>
          
          <View style={styles.priorityContainer}>
            <View style={[
              styles.priorityDot,
              { backgroundColor: getPriorityColor(announcement.priority) }
            ]} />
            <Text style={styles.priorityText}>
              {announcement.priority?.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={[
          styles.announcementTitle,
          !isRead && styles.unreadTitle
        ]}>
          {announcement.title}
        </Text>

        <Text style={styles.announcementContent} numberOfLines={3}>
          {announcement.content}
        </Text>

        {isEvent && announcement.eventDetails && (
          <View style={styles.eventDetails}>
            <Text style={styles.eventDate}>
              📅 {new Date(announcement.eventDetails.startDate).toLocaleDateString()}
              {announcement.eventDetails.location && ` • 📍 ${announcement.eventDetails.location}`}
            </Text>
            
            {canRegister && (
              <TouchableOpacity
                style={[
                  styles.registerButton,
                  isRegistered && styles.registeredButton
                ]}
                onPress={() => handleEventRegister(announcement._id, isRegistered)}
              >
                <Text style={[
                  styles.registerButtonText,
                  isRegistered && styles.registeredButtonText
                ]}>
                  {isRegistered ? 'Registered ✓' : 'Register'}
                </Text>
              </TouchableOpacity>
            )}
            
            {announcement.eventDetails.maxParticipants && (
              <Text style={styles.participantCount}>
                {announcement.eventDetails.registeredParticipants?.length || 0}/
                {announcement.eventDetails.maxParticipants} participants
              </Text>
            )}
          </View>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.authorText}>
            By {announcement.createdBy?.name || 'Unknown'}
          </Text>
          <Text style={styles.timeText}>
            {formatDate(announcement.createdAt)}
          </Text>
        </View>

        {!isRead && <View style={styles.unreadIndicator} />}
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>📢</Text>
      <Text style={styles.emptyStateTitle}>No Announcements</Text>
      <Text style={styles.emptyStateText}>
        {filter === 'unread' 
          ? 'All announcements have been read'
          : filter === 'events'
          ? 'No upcoming events'
          : 'No announcements available'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading announcements...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Announcements</Text>
        {(['warden', 'admin'].includes(user?.role)) && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('CreateAnnouncement')}
          >
            <Text style={styles.addButtonText}>+ New</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        <FilterButton title="All" value="all" />
        <FilterButton title="Unread" value="unread" count={unreadCount} />
        <FilterButton title="Events" value="events" />
        <FilterButton title="Emergency" value="emergency" />
        <FilterButton title="Notice" value="notice" />
        <FilterButton title="Dining" value="dining" />
        <FilterButton title="Maintenance" value="maintenance" />
      </ScrollView>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {announcements.length > 0 ? (
          announcements.map((announcement) => (
            <AnnouncementCard
              key={announcement._id}
              announcement={announcement}
            />
          ))
        ) : (
          <EmptyState />
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
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#2196F3',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  filterCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  announcementCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  pinnedCard: {
    borderTopWidth: 3,
    borderTopColor: '#FF9800',
  },
  pinnedIndicator: {
    position: 'absolute',
    top: 8,
    right: 12,
  },
  pinnedText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.5,
  },
  priorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  announcementTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    lineHeight: 24,
  },
  unreadTitle: {
    color: '#000',
  },
  announcementContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  eventDetails: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  eventDate: {
    fontSize: 13,
    color: '#555',
    marginBottom: 8,
    fontWeight: '500',
  },
  registerButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  registeredButton: {
    backgroundColor: '#E0E0E0',
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  registeredButtonText: {
    color: '#666',
  },
  participantCount: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  timeText: {
    fontSize: 12,
    color: '#888',
  },
  unreadIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2196F3',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    maxWidth: 250,
  },
});

export default AnnouncementsScreen;