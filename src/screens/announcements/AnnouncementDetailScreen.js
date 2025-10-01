import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Linking,
  Share,
  Platform
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/api';

const AnnouncementDetailScreen = ({ route, navigation }) => {
  const { announcementId, announcement: initialAnnouncement } = route.params;
  const { user } = useAuth();
  const [announcement, setAnnouncement] = useState(initialAnnouncement);
  const [loading, setLoading] = useState(!initialAnnouncement);

  useEffect(() => {
    if (!initialAnnouncement) {
      fetchAnnouncement();
    }
  }, [announcementId]);

  const fetchAnnouncement = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAnnouncement(announcementId);
      
      if (response.success) {
        setAnnouncement(response.data);
      }
    } catch (error) {
      console.error('Error fetching announcement:', error);
      Alert.alert('Error', 'Failed to fetch announcement details');
    } finally {
      setLoading(false);
    }
  };

  const handleEventRegister = async (isRegistered) => {
    try {
      if (isRegistered) {
        await apiService.unregisterFromEvent(announcementId);
        Alert.alert('Success', 'Unregistered from event successfully');
      } else {
        await apiService.registerForEvent(announcementId);
        Alert.alert('Success', 'Registered for event successfully');
      }
      
      // Refresh announcement data
      fetchAnnouncement();
    } catch (error) {
      console.error('Event registration error:', error);
      Alert.alert('Error', error.message || 'Failed to register/unregister for event');
    }
  };

  const handleShare = async () => {
    try {
      const message = `📢 ${announcement.title}\n\n${announcement.content}\n\nShared from Hostel Hub`;
      
      await Share.share({
        message,
        title: announcement.title,
        url: announcement.attachments?.length > 0 ? announcement.attachments[0].path : undefined,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleAttachmentPress = async (attachment) => {
    try {
      const url = `http://localhost:5000/${attachment.path}`;
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open attachment');
      }
    } catch (error) {
      console.error('Open attachment error:', error);
      Alert.alert('Error', 'Failed to open attachment');
    }
  };

  const handleEdit = () => {
    navigation.navigate('EditAnnouncement', { announcement });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Announcement',
      'Are you sure you want to delete this announcement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteAnnouncement(announcementId);
              Alert.alert('Success', 'Announcement deleted successfully');
              navigation.goBack();
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete announcement');
            }
          }
        }
      ]
    );
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
    return date.toLocaleString();
  };

  const isUserRegisteredForEvent = () => {
    if (!announcement?.eventDetails?.registeredParticipants) return false;
    return announcement.eventDetails.registeredParticipants.some(
      participant => participant.user._id === user._id || participant.user === user._id
    );
  };

  const canEdit = () => {
    return announcement?.createdBy?._id === user?._id || user?.role === 'admin';
  };

  const getFileIcon = (mimetype) => {
    if (mimetype?.startsWith('image/')) return '🖼️';
    if (mimetype?.includes('pdf')) return '📄';
    if (mimetype?.includes('doc')) return '📝';
    return '📎';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading announcement...</Text>
      </View>
    );
  }

  if (!announcement) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Announcement not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isEvent = announcement.category === 'event';
  const isRegistered = isEvent ? isUserRegisteredForEvent() : false;
  const canRegister = isEvent && announcement.eventDetails?.registrationRequired;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {announcement.isPinned && (
          <View style={styles.pinnedBanner}>
            <Text style={styles.pinnedText}>📌 Pinned Announcement</Text>
          </View>
        )}

        <View style={styles.header}>
          <View style={styles.categorySection}>
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

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Text style={styles.shareButtonText}>Share</Text>
            </TouchableOpacity>
            
            {canEdit() && (
              <View style={styles.adminActions}>
                <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.title}>{announcement.title}</Text>

        <View style={styles.metaInfo}>
          <Text style={styles.author}>
            By {announcement.createdBy?.name || 'Unknown'}
          </Text>
          <Text style={styles.date}>
            {formatDate(announcement.createdAt)}
          </Text>
          {announcement.views > 0 && (
            <Text style={styles.views}>
              👁️ {announcement.views} views
            </Text>
          )}
        </View>

        <Text style={styles.content}>{announcement.content}</Text>

        {isEvent && announcement.eventDetails && (
          <View style={styles.eventSection}>
            <Text style={styles.sectionTitle}>Event Details</Text>
            
            <View style={styles.eventDetails}>
              <View style={styles.eventDetailRow}>
                <Text style={styles.eventDetailLabel}>📅 Start Date:</Text>
                <Text style={styles.eventDetailValue}>
                  {formatDate(announcement.eventDetails.startDate)}
                </Text>
              </View>
              
              {announcement.eventDetails.endDate && (
                <View style={styles.eventDetailRow}>
                  <Text style={styles.eventDetailLabel}>📅 End Date:</Text>
                  <Text style={styles.eventDetailValue}>
                    {formatDate(announcement.eventDetails.endDate)}
                  </Text>
                </View>
              )}
              
              {announcement.eventDetails.location && (
                <View style={styles.eventDetailRow}>
                  <Text style={styles.eventDetailLabel}>📍 Location:</Text>
                  <Text style={styles.eventDetailValue}>
                    {announcement.eventDetails.location}
                  </Text>
                </View>
              )}

              {announcement.eventDetails.maxParticipants && (
                <View style={styles.eventDetailRow}>
                  <Text style={styles.eventDetailLabel}>👥 Participants:</Text>
                  <Text style={styles.eventDetailValue}>
                    {announcement.eventDetails.registeredParticipants?.length || 0}/
                    {announcement.eventDetails.maxParticipants}
                  </Text>
                </View>
              )}
            </View>

            {canRegister && (
              <TouchableOpacity
                style={[
                  styles.registerButton,
                  isRegistered && styles.registeredButton
                ]}
                onPress={() => handleEventRegister(isRegistered)}
              >
                <Text style={[
                  styles.registerButtonText,
                  isRegistered && styles.registeredButtonText
                ]}>
                  {isRegistered ? 'Unregister from Event' : 'Register for Event'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {announcement.attachments && announcement.attachments.length > 0 && (
          <View style={styles.attachmentsSection}>
            <Text style={styles.sectionTitle}>Attachments</Text>
            
            {announcement.attachments.map((attachment, index) => (
              <TouchableOpacity
                key={index}
                style={styles.attachmentItem}
                onPress={() => handleAttachmentPress(attachment)}
              >
                <Text style={styles.fileIcon}>
                  {getFileIcon(attachment.mimetype)}
                </Text>
                <View style={styles.attachmentInfo}>
                  <Text style={styles.attachmentName}>
                    {attachment.originalName}
                  </Text>
                  <Text style={styles.attachmentSize}>
                    {(attachment.size / 1024).toFixed(1)} KB
                  </Text>
                </View>
                <Text style={styles.downloadIcon}>⬇️</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {announcement.tags && announcement.tags.length > 0 && (
          <View style={styles.tagsSection}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tagsContainer}>
              {announcement.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {announcement.targetAudience !== 'all' && (
          <View style={styles.audienceSection}>
            <Text style={styles.audienceText}>
              🎯 Targeted to: {announcement.targetAudience.toUpperCase()}
            </Text>
          </View>
        )}

        {announcement.readBy && announcement.readBy.length > 0 && (
          <View style={styles.readBySection}>
            <Text style={styles.sectionTitle}>Read By ({announcement.readBy.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {announcement.readBy.slice(0, 10).map((read, index) => (
                <View key={index} style={styles.readerItem}>
                  <Text style={styles.readerName}>
                    {read.user?.name || 'Unknown'}
                  </Text>
                  <Text style={styles.readerTime}>
                    {formatDate(read.readAt)}
                  </Text>
                </View>
              ))}
              {announcement.readBy.length > 10 && (
                <View style={styles.moreReaders}>
                  <Text style={styles.moreReadersText}>
                    +{announcement.readBy.length - 10} more
                  </Text>
                </View>
              )}
            </ScrollView>
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
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  pinnedBanner: {
    backgroundColor: '#FFF3CD',
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#FFEAA7',
  },
  pinnedText: {
    color: '#856404',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categorySection: {
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
    fontSize: 18,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.5,
  },
  priorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shareButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  adminActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    padding: 20,
    paddingBottom: 12,
    backgroundColor: '#fff',
    lineHeight: 32,
  },
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  author: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  date: {
    fontSize: 12,
    color: '#888',
  },
  views: {
    fontSize: 12,
    color: '#888',
  },
  content: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  eventSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
  },
  eventDetails: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  eventDetailRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  eventDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    minWidth: 100,
  },
  eventDetailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    marginLeft: 8,
  },
  registerButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  registeredButton: {
    backgroundColor: '#E0E0E0',
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  registeredButtonText: {
    color: '#666',
  },
  attachmentsSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  fileIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  attachmentSize: {
    fontSize: 12,
    color: '#666',
  },
  downloadIcon: {
    fontSize: 16,
  },
  tagsSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500',
  },
  audienceSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  audienceText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  readBySection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
  },
  readerItem: {
    marginRight: 16,
    alignItems: 'center',
  },
  readerName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  readerTime: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  moreReaders: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  moreReadersText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default AnnouncementDetailScreen;