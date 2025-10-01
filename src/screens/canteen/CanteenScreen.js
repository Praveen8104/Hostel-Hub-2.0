import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
  TextInput,
  FlatList,
  Modal
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/api';

const CanteenScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [popularItems, setPopularItems] = useState([]);
  const [cart, setCart] = useState({ items: [], itemCount: 0, totalAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('OrderHistory')}
        >
          <Ionicons name="receipt-outline" size={24} color="#ffffff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);
  const [sortBy, setSortBy] = useState('name');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 });

  const fetchData = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      // Fetch categories, menu items, popular items, and cart in parallel
      const [categoriesRes, menuRes, popularRes, cartRes] = await Promise.all([
        apiService.getMenuCategories(),
        apiService.getMenuItems({ sortBy }),
        apiService.getPopularItems(8),
        apiService.getCart()
      ]);

      if (categoriesRes.success) {
        setCategories([{ _id: 'all', name: 'All Items', icon: '🍽️' }, ...categoriesRes.data]);
      }

      if (menuRes.success) {
        setMenuItems(menuRes.data.items);
        setFilteredItems(menuRes.data.items);
      }

      if (popularRes.success) {
        setPopularItems(popularRes.data);
      }

      if (cartRes.success) {
        setCart(cartRes.data);
      }
    } catch (error) {
      console.error('Error fetching canteen data:', error);
      Alert.alert('Error', 'Failed to fetch canteen data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [sortBy])
  );

  useEffect(() => {
    filterItems();
  }, [searchQuery, selectedCategory, menuItems]);

  const filterItems = () => {
    let filtered = menuItems;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category._id === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredItems(filtered);
  };

  const handleRefresh = () => {
    fetchData(true);
  };

  const addToCart = async (item, quantity = 1) => {
    try {
      const response = await apiService.addToCart(item._id, quantity);
      if (response.success) {
        setCart(response.data);
        Alert.alert('Success', `${item.name} added to cart`);
      }
    } catch (error) {
      console.error('Add to cart error:', error);
      Alert.alert('Error', error.message || 'Failed to add item to cart');
    }
  };

  const getItemImage = (item) => {
    if (item.image?.path) {
      return { uri: `http://localhost:5000/${item.image.path}` };
    }
    return { uri: 'https://via.placeholder.com/150x100?text=Food' };
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'snacks': '🍿',
      'meals': '🍽️',
      'beverages': '🥤',
      'desserts': '🍰',
      'breakfast': '🥞',
      'lunch': '🍛',
      'dinner': '🍽️'
    };
    return icons[category.name.toLowerCase()] || category.icon || '🍽️';
  };

  const formatPrice = (price) => {
    return `₹${price.toFixed(0)}`;
  };

  const getCartItemQuantity = (itemId) => {
    const cartItem = cart.items?.find(item => item.menuItem._id === itemId);
    return cartItem ? cartItem.quantity : 0;
  };

  const CategoryCard = ({ category }) => (
    <TouchableOpacity
      style={[
        styles.categoryCard,
        selectedCategory === category._id && styles.categoryCardActive
      ]}
      onPress={() => setSelectedCategory(category._id)}
    >
      <Text style={styles.categoryIcon}>
        {getCategoryIcon(category)}
      </Text>
      <Text style={[
        styles.categoryName,
        selectedCategory === category._id && styles.categoryNameActive
      ]}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );

  const MenuItemCard = ({ item }) => {
    const cartQuantity = getCartItemQuantity(item._id);
    const hasDiscount = item.originalPrice && item.originalPrice > item.price;
    
    return (
      <TouchableOpacity
        style={styles.menuItemCard}
        onPress={() => navigation.navigate('MenuItem', { itemId: item._id })}
      >
        <Image source={getItemImage(item)} style={styles.itemImage} />
        
        {hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>
              {item.discountPercentage}% OFF
            </Text>
          </View>
        )}

        {item.tags?.includes('popular') && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularText}>🔥 Popular</Text>
          </View>
        )}

        <View style={styles.itemContent}>
          <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.tagsContainer}>
            {item.tags?.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>

          <View style={styles.itemFooter}>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>{formatPrice(item.price)}</Text>
              {hasDiscount && (
                <Text style={styles.originalPrice}>
                  {formatPrice(item.originalPrice)}
                </Text>
              )}
            </View>

            <View style={styles.ratingContainer}>
              <Text style={styles.rating}>
                ⭐ {item.rating?.average?.toFixed(1) || 'N/A'}
              </Text>
              <Text style={styles.ratingCount}>
                ({item.rating?.count || 0})
              </Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <Text style={styles.prepTime}>🕐 {item.preparationTime}min</Text>
            
            {cartQuantity > 0 ? (
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => updateCartQuantity(item._id, cartQuantity - 1)}
                >
                  <Text style={styles.quantityButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.quantityText}>{cartQuantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => updateCartQuantity(item._id, cartQuantity + 1)}
                >
                  <Text style={styles.quantityButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.addButton,
                  !item.isAvailableToday && styles.addButtonDisabled
                ]}
                onPress={() => addToCart(item)}
                disabled={!item.isAvailableToday}
              >
                <Text style={styles.addButtonText}>
                  {item.isAvailableToday ? 'Add' : 'Unavailable'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const updateCartQuantity = async (itemId, quantity) => {
    try {
      const response = await apiService.updateCartItem(itemId, quantity);
      if (response.success) {
        setCart(response.data);
      }
    } catch (error) {
      console.error('Update cart error:', error);
      Alert.alert('Error', 'Failed to update cart');
    }
  };

  const PopularItemCard = ({ item }) => (
    <TouchableOpacity
      style={styles.popularItemCard}
      onPress={() => navigation.navigate('MenuItem', { itemId: item._id })}
    >
      <Image source={getItemImage(item)} style={styles.popularItemImage} />
      <View style={styles.popularItemContent}>
        <Text style={styles.popularItemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.popularItemPrice}>{formatPrice(item.price)}</Text>
        <TouchableOpacity
          style={styles.quickAddButton}
          onPress={() => addToCart(item)}
        >
          <Text style={styles.quickAddText}>+</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading menu...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Canteen</Text>
        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => navigation.navigate('Cart')}
        >
          <Text style={styles.cartIcon}>🛒</Text>
          {cart.itemCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cart.itemCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search food items..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Text style={styles.filterIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Popular Items Section */}
        {popularItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔥 Popular Items</Text>
            <FlatList
              data={popularItems}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => <PopularItemCard item={item} />}
              contentContainerStyle={styles.popularItemsList}
            />
          </View>
        )}

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <FlatList
            data={categories}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => <CategoryCard category={item} />}
            contentContainerStyle={styles.categoriesList}
          />
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedCategory === 'all' ? 'All Items' : 
               categories.find(c => c._id === selectedCategory)?.name}
            </Text>
            <Text style={styles.itemCount}>
              {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {filteredItems.length > 0 ? (
            <View style={styles.menuGrid}>
              {filteredItems.map((item) => (
                <MenuItemCard key={item._id} item={item} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No items found</Text>
              <Text style={styles.emptyStateSubtext}>
                Try adjusting your search or filters
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Cart Summary */}
      {cart.itemCount > 0 && (
        <TouchableOpacity
          style={styles.cartSummary}
          onPress={() => navigation.navigate('Cart')}
        >
          <View style={styles.cartSummaryContent}>
            <Text style={styles.cartSummaryText}>
              {cart.itemCount} item{cart.itemCount !== 1 ? 's' : ''} • {formatPrice(cart.totalAmount)}
            </Text>
            <Text style={styles.cartSummaryAction}>View Cart →</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.filterModal}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>Filters & Sort</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Text style={styles.filterClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterContent}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Sort By</Text>
              {['name', 'price_low', 'price_high', 'rating', 'popular'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.filterOption,
                    sortBy === option && styles.filterOptionActive
                  ]}
                  onPress={() => setSortBy(option)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    sortBy === option && styles.filterOptionTextActive
                  ]}>
                    {option === 'price_low' ? 'Price: Low to High' :
                     option === 'price_high' ? 'Price: High to Low' :
                     option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.filterActions}>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => {
                setShowFilters(false);
                fetchData();
              }}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  cartButton: {
    position: 'relative',
    padding: 8,
  },
  cartIcon: {
    fontSize: 24,
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  filterButton: {
    marginLeft: 10,
    padding: 8,
  },
  filterIcon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  itemCount: {
    fontSize: 14,
    color: '#666',
  },
  popularItemsList: {
    paddingLeft: 20,
  },
  popularItemCard: {
    width: 120,
    marginRight: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  popularItemImage: {
    width: '100%',
    height: 80,
  },
  popularItemContent: {
    padding: 8,
    position: 'relative',
  },
  popularItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  popularItemPrice: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  quickAddButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAddText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  categoriesList: {
    paddingLeft: 20,
  },
  categoryCard: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 12,
    backgroundColor: '#fff',
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryCardActive: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF5F3',
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  categoryNameActive: {
    color: '#FF6B35',
  },
  menuGrid: {
    paddingHorizontal: 20,
  },
  menuItemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: 150,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  popularBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemContent: {
    padding: 16,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 10,
    color: '#1976D2',
    fontWeight: '500',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  originalPrice: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '500',
  },
  ratingCount: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prepTime: {
    fontSize: 12,
    color: '#666',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    borderRadius: 16,
  },
  quantityButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 12,
    color: '#333',
  },
  addButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  cartSummary: {
    backgroundColor: '#FF6B35',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  cartSummaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartSummaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cartSummaryAction: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Filter Modal Styles
  filterModal: {
    flex: 1,
    backgroundColor: '#fff',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  filterClose: {
    fontSize: 24,
    color: '#666',
  },
  filterContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterSection: {
    marginVertical: 20,
  },
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  filterOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  filterOptionActive: {
    backgroundColor: '#FF6B35',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#333',
  },
  filterOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  filterActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  applyButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerButton: {
    marginRight: 16,
    padding: 8,
  },
});

export default CanteenScreen;