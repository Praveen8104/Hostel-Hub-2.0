import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console and state for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });

    // You can also log the error to an error reporting service here
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    // Force app reload (for Expo)
    if (typeof window !== 'undefined' && window.location) {
      window.location.reload();
    } else {
      // For native app, you might want to restart the app
      this.handleRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.errorContainer}>
              <Ionicons name="warning" size={64} color="#dc2626" />
              
              <Text style={styles.title}>Oops! Something went wrong</Text>
              
              <Text style={styles.message}>
                The app encountered an unexpected error. Don't worry, this has been logged
                and our team will investigate.
              </Text>

              <View style={styles.actionContainer}>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={this.handleRetry}
                >
                  <Ionicons name="refresh" size={20} color="#ffffff" />
                  <Text style={styles.retryText}>Try Again</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.reloadButton}
                  onPress={this.handleReload}
                >
                  <Ionicons name="reload" size={20} color="#059669" />
                  <Text style={styles.reloadText}>Reload App</Text>
                </TouchableOpacity>
              </View>

              {/* Debug information (only in development) */}
              {__DEV__ && this.state.error && (
                <View style={styles.debugContainer}>
                  <Text style={styles.debugTitle}>Debug Information:</Text>
                  <ScrollView style={styles.debugScrollView}>
                    <Text style={styles.debugText}>
                      Error: {this.state.error.toString()}
                    </Text>
                    {this.state.errorInfo && (
                      <Text style={styles.debugText}>
                        {this.state.errorInfo.componentStack}
                      </Text>
                    )}
                  </ScrollView>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      );
    }

    // Normally, just render children
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  reloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#059669',
    gap: 8,
  },
  reloadText: {
    color: '#059669',
    fontSize: 16,
    fontWeight: '600',
  },
  debugContainer: {
    width: '100%',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  debugScrollView: {
    maxHeight: 200,
  },
  debugText: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
});

export default ErrorBoundary;