import { Image } from 'react-native';
import { Asset } from 'expo-asset';

// Image caching configuration
const ImageCache = {
  // Pre-load critical images
  preloadImages: async () => {
    const imageAssets = [
      require('../assets/icon.png'),
      require('../assets/splash-icon.png'),
      require('../assets/adaptive-icon.png'),
    ];

    const cacheImages = imageAssets.map(image => {
      if (typeof image === 'string') {
        return Image.prefetch(image);
      } else {
        return Asset.fromModule(image).downloadAsync();
      }
    });

    return Promise.all(cacheImages);
  },

  // Optimized Image component with caching
  CachedImage: ({ source, style, ...props }) => {
    return (
      <Image
        source={source}
        style={style}
        {...props}
        // Enable caching for remote images
        cache="force-cache"
        // Add loading placeholder
        defaultSource={require('../assets/placeholder.png')}
      />
    );
  }
};

// API request optimization
const ApiOptimization = {
  // Request debouncing for search
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Request throttling
  throttle: (func, limit) => {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Batch multiple requests
  batchRequests: (requests, batchSize = 3) => {
    const batches = [];
    for (let i = 0; i < requests.length; i += batchSize) {
      batches.push(requests.slice(i, i + batchSize));
    }
    
    return batches.reduce(
      (promise, batch) => promise.then(results => 
        Promise.all(batch).then(batchResults => 
          results.concat(batchResults)
        )
      ),
      Promise.resolve([])
    );
  }
};

// Memory management
const MemoryOptimization = {
  // Clean up listeners and timers
  cleanup: {
    intervals: new Set(),
    timeouts: new Set(),
    listeners: new Set(),

    addInterval: (id) => {
      MemoryOptimization.cleanup.intervals.add(id);
    },

    addTimeout: (id) => {
      MemoryOptimization.cleanup.timeouts.add(id);
    },

    addListener: (listener) => {
      MemoryOptimization.cleanup.listeners.add(listener);
    },

    clearAll: () => {
      // Clear intervals
      MemoryOptimization.cleanup.intervals.forEach(id => clearInterval(id));
      MemoryOptimization.cleanup.intervals.clear();

      // Clear timeouts
      MemoryOptimization.cleanup.timeouts.forEach(id => clearTimeout(id));
      MemoryOptimization.cleanup.timeouts.clear();

      // Remove listeners
      MemoryOptimization.cleanup.listeners.forEach(listener => {
        if (listener.remove) {
          listener.remove();
        }
      });
      MemoryOptimization.cleanup.listeners.clear();
    }
  }
};

// List optimization for large datasets
const ListOptimization = {
  // Virtual scrolling configuration
  virtualScrollConfig: {
    getItemLayout: (data, index, itemHeight = 100) => ({
      length: itemHeight,
      offset: itemHeight * index,
      index,
    }),

    // Optimize FlatList performance
    flatListProps: {
      removeClippedSubviews: true,
      maxToRenderPerBatch: 10,
      updateCellsBatchingPeriod: 50,
      initialNumToRender: 10,
      windowSize: 10,
      legacyImplementation: false,
    }
  },

  // Memoized list item component
  createMemoizedListItem: (Component) => {
    return React.memo(Component, (prevProps, nextProps) => {
      // Custom comparison logic for list items
      return JSON.stringify(prevProps.item) === JSON.stringify(nextProps.item) &&
             prevProps.index === nextProps.index;
    });
  }
};

// Navigation optimization
const NavigationOptimization = {
  // Lazy load screens
  lazyScreen: (importFunc) => {
    return React.lazy(importFunc);
  },

  // Screen options for performance
  defaultScreenOptions: {
    headerShown: true,
    animationEnabled: true,
    gestureEnabled: true,
    // Reduce animation duration for faster navigation
    transitionSpec: {
      open: { animation: 'timing', config: { duration: 200 } },
      close: { animation: 'timing', config: { duration: 150 } }
    }
  }
};

// Form optimization
const FormOptimization = {
  // Debounced input validation
  createDebouncedValidator: (validator, delay = 300) => {
    return ApiOptimization.debounce(validator, delay);
  },

  // Memoized form fields
  MemoizedFormField: React.memo(({ value, onChangeText, ...props }) => {
    return (
      <TextInput
        value={value}
        onChangeText={onChangeText}
        {...props}
      />
    );
  })
};

// App startup optimization
const StartupOptimization = {
  // Initialize app resources
  initializeApp: async () => {
    try {
      // Pre-load images
      await ImageCache.preloadImages();
      
      // Initialize any other resources
      console.log('✅ App resources initialized');
    } catch (error) {
      console.error('❌ Error initializing app resources:', error);
    }
  },

  // Lazy load non-critical features
  lazyLoadFeatures: () => {
    // Load features that aren't needed immediately
    setTimeout(() => {
      // Initialize analytics, crash reporting, etc.
    }, 2000);
  }
};

export {
  ImageCache,
  ApiOptimization,
  MemoryOptimization,
  ListOptimization,
  NavigationOptimization,
  FormOptimization,
  StartupOptimization
};

export default {
  ImageCache,
  ApiOptimization,
  MemoryOptimization,
  ListOptimization,
  NavigationOptimization,
  FormOptimization,
  StartupOptimization
};