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

const OutpassScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, checkedOut: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOutpassData();
  }, []);

  const loadOutpassData = async () => {
    try {
      setLoading(true);
      
      const requestsResponse = await ApiService.getOutpassRequests({
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      setRequests(requestsResponse.data?.requests || []);
      
      // Calculate simple stats from requests
      const reqs = requestsResponse.data?.requests || [];
      const statsData = {
        total: reqs.length,
        pending: reqs.filter(r => r.status === 'pending').length,
        approved: reqs.filter(r => r.status === 'approved').length,
        checkedOut: reqs.filter(r => r.status === 'checked_out').length
      };
      setStats(statsData);

    } catch (error) {
      console.error('Error loading outpass data:', error);
      Alert.alert('Error', 'Failed to load outpass requests');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOutpassData();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'under_review': return '#3b82f6';
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      case 'checked_out': return '#8b5cf6';
      case 'overdue': return '#dc2626';
      case 'returned': return '#059669';
      case 'cancelled': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'under_review': return 'Under Review';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'checked_out': return 'Checked Out';
      case 'overdue': return 'Overdue';
      case 'returned': return 'Returned';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'home_visit': return '🏠';
      case 'medical': return '🏥';
      case 'academic': return '📚';
      case 'personal': return '👤';
      case 'family_event': return '👨‍👩‍👧‍👦';
      case 'emergency': return '🚨';
      default: return '📝';
    }
  };

  const formatDuration = (request) => {
    const outDate = new Date(`${request.outDate} ${request.outTime}`);
    const inDate = new Date(`${request.inDate} ${request.inTime}`);
    const diffHours = Math.ceil((inDate - outDate) / (1000 * 60 * 60));
    
    if (diffHours < 24) {
      return `${diffHours} hours`;
    } else {
      const days = Math.floor(diffHours / 24);
      const hours = diffHours % 24;
      return `${days}d ${hours}h`;
    }
  };

  const renderStatsCard = () => (
    <View style={styles.statsCard}>
      <Text style={styles.statsTitle}>Outpass Summary</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#f59e0b' }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10b981' }]}>{stats.approved}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#8b5cf6' }]}>{stats.checkedOut}</Text>
          <Text style={styles.statLabel}>Out</Text>
        </View>
      </View>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActionsCard}>
      <Text style={styles.cardTitle}>Quick Actions</Text>
      <View style={styles.actionGrid}>
        <TouchableOpacity 
          style={styles.primaryActionButton}
          onPress={() => navigation.navigate('CreateOutpassRequest')}
        >
          <Text style={styles.primaryActionIcon}>📝</Text>
          <Text style={styles.primaryActionText}>New Outpass</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('OutpassHistory')}
        >
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={styles.actionText}>View History</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCurrentStatus = () => {
    const currentOutpass = requests.find(r => r.status === 'checked_out');
    
    if (!currentOutpass) return null;

    return (
      <View style={styles.currentStatusCard}>
        <View style={styles.statusHeader}>
          <Text style={styles.statusTitle}>🚪 Currently Out</Text>
          <View style={[styles.statusBadge, { backgroundColor: '#8b5cf6' }]}>
            <Text style={styles.statusText}>CHECKED OUT</Text>
          </View>
        </View>
        
        <Text style={styles.statusDestination}>
          📍 {currentOutpass.destination.city}, {currentOutpass.destination.state}
        </Text>
        
        <Text style={styles.statusTiming}>
          ⏰ Expected return: {new Date(currentOutpass.inDate).toLocaleDateString()} at {currentOutpass.inTime}
        </Text>

        <TouchableOpacity 
          style={styles.viewDetailsButton}
          onPress={() => navigation.navigate('OutpassDetail', { requestId: currentOutpass._id })}
        >
          <Text style={styles.viewDetailsText}>View Details →</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderRequestItem = (request) => (
    <TouchableOpacity 
      key={request._id} 
      style={styles.requestCard}
      onPress={() => navigation.navigate('OutpassDetail', { requestId: request._id })}
    >
      <View style={styles.requestHeader}>
        <View style={styles.requestInfo}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeIcon}>{getTypeIcon(request.type)}</Text>
            <Text style={styles.typeText}>
              {request.type.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
          
          {request.isEmergency && (
            <View style={styles.emergencyBadge}>
              <Text style={styles.emergencyText}>URGENT</Text>
            </View>
          )}
        </View>

        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
          <Text style={styles.statusText}>{getStatusText(request.status)}</Text>
        </View>
      </View>

      <Text style={styles.requestReason} numberOfLines={2}>
        {request.reason}
      </Text>

      <View style={styles.requestDetails}>
        <Text style={styles.destinationText}>
          📍 {request.destination.city}, {request.destination.state}
        </Text>
        <Text style={styles.durationText}>
          ⏱️ {formatDuration(request)}
        </Text>
      </View>

      <View style={styles.requestTiming}>
        <Text style={styles.timingText}>
          🚪 Out: {new Date(request.outDate).toLocaleDateString()} {request.outTime}
        </Text>
        <Text style={styles.timingText}>
          🏠 In: {new Date(request.inDate).toLocaleDateString()} {request.inTime}
        </Text>
      </View>

      <View style={styles.requestMeta}>
        <Text style={styles.dateText}>
          Submitted: {new Date(request.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>

      {request.reviewedBy && (
        <View style={styles.reviewInfo}>
          <Text style={styles.reviewedText}>
            ✅ Reviewed by: {request.reviewedBy.firstName} {request.reviewedBy.lastName}
          </Text>
          {request.reviewNotes && (
            <Text style={styles.reviewNotes}>💬 "{request.reviewNotes}"</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading outpass requests...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Overview */}
        {renderStatsCard()}

        {/* Current Status */}
        {renderCurrentStatus()}

        {/* Quick Actions */}
        {renderQuickActions()}

        {/* Recent Requests */}
        <View style={styles.recentRequestsCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>Recent Requests</Text>
            <TouchableOpacity onPress={() => navigation.navigate('OutpassHistory')}>
              <Text style={styles.viewAllText}>View All →</Text>
            </TouchableOpacity>
          </View>

          {requests.length > 0 ? (
            requests.slice(0, 5).map(renderRequestItem)
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📝</Text>
              <Text style={styles.emptyTitle}>No Outpass Requests</Text>
              <Text style={styles.emptyMessage}>
                You haven't submitted any outpass requests yet.
              </Text>
              <TouchableOpacity 
                style={styles.emptyActionButton}
                onPress={() => navigation.navigate('CreateOutpassRequest')}
              >
                <Text style={styles.emptyActionText}>Create First Request</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
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
  scrollView: {
    flex: 1,
  },
  statsCard: {
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
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  currentStatusCard: {
    backgroundColor: '#f0f9ff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#8b5cf6',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statusDestination: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
  },
  statusTiming: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  viewDetailsButton: {
    alignSelf: 'flex-start',
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
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
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  primaryActionButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  primaryActionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  recentRequestsCard: {
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  requestCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
  },
  emergencyBadge: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  emergencyText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  requestReason: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  requestDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  destinationText: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1,
  },
  durationText: {
    fontSize: 12,
    color: '#6b7280',
  },
  requestTiming: {
    marginBottom: 8,
  },
  timingText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  requestMeta: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
  },
  dateText: {
    fontSize: 12,
    color: '#6b7280',
  },
  reviewInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  reviewedText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
    marginBottom: 4,
  },
  reviewNotes: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyActionButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OutpassScreen;