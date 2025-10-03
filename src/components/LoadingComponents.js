import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

const LoadingScreen = ({ 
  message = 'Loading...', 
  size = 'large', 
  color = '#059669',
  showMessage = true,
  fullScreen = true 
}) => {
  const containerStyle = fullScreen ? styles.fullScreenContainer : styles.inlineContainer;
  
  return (
    <View style={containerStyle}>
      <ActivityIndicator size={size} color={color} />
      {showMessage && (
        <Text style={styles.loadingText}>{message}</Text>
      )}
    </View>
  );
};

const LoadingOverlay = ({ visible, message = 'Loading...', children }) => {
  if (!visible) {
    return children;
  }

  return (
    <View style={styles.overlayContainer}>
      {children}
      <View style={styles.overlay}>
        <View style={styles.overlayContent}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.overlayText}>{message}</Text>
        </View>
      </View>
    </View>
  );
};

const LoadingButton = ({ 
  loading, 
  onPress, 
  title, 
  style, 
  textStyle, 
  loadingColor = '#ffffff',
  disabled 
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        style,
        (loading || disabled) && styles.disabledButton
      ]}
      onPress={loading || disabled ? null : onPress}
      disabled={loading || disabled}
    >
      {loading ? (
        <View style={styles.loadingButtonContent}>
          <ActivityIndicator size="small" color={loadingColor} />
          <Text style={[styles.buttonText, textStyle, { marginLeft: 8 }]}>
            Loading...
          </Text>
        </View>
      ) : (
        <Text style={[styles.buttonText, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const SkeletonLoader = ({ width = '100%', height = 20, borderRadius = 4, style }) => {
  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
        },
        style,
      ]}
    />
  );
};

const SkeletonCard = ({ showAvatar = false, lines = 3 }) => {
  return (
    <View style={styles.skeletonCard}>
      {showAvatar && (
        <View style={styles.skeletonRow}>
          <SkeletonLoader width={40} height={40} borderRadius={20} />
          <View style={styles.skeletonTextContainer}>
            <SkeletonLoader width="60%" height={16} />
            <SkeletonLoader width="40%" height={14} style={{ marginTop: 4 }} />
          </View>
        </View>
      )}
      
      <View style={styles.skeletonContent}>
        {Array.from({ length: lines }).map((_, index) => (
          <SkeletonLoader
            key={index}
            width={index === lines - 1 ? '70%' : '100%'}
            height={16}
            style={{ marginBottom: 8 }}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  inlineContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  overlayContainer: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayContent: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 120,
  },
  overlayText: {
    marginTop: 12,
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  loadingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  skeleton: {
    backgroundColor: '#e5e7eb',
    opacity: 0.7,
  },
  skeletonCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  skeletonTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  skeletonContent: {
    marginTop: 8,
  },
});

// Add pulsing animation for skeletons
import { useEffect, useRef } from 'react';
import { Animated, TouchableOpacity } from 'react-native';

const AnimatedSkeletonLoader = ({ width = '100%', height = 20, borderRadius = 4, style }) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
};

export {
  LoadingScreen,
  LoadingOverlay,
  LoadingButton,
  SkeletonLoader,
  AnimatedSkeletonLoader,
  SkeletonCard,
};

export default LoadingScreen;