import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';

const MenuItemScreen = ({ route, navigation }) => {
  const { itemId } = route.params;
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    fetchMenuItem();
  }, []);

  const fetchMenuItem = async () => {
    try {
      const response = await apiService.getMenuItem(itemId);
      setItem(response.data);
    } catch (error) {
      console.error('Error fetching menu item:', error);
      Alert.alert('Error', 'Failed to load menu item details');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = (change) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1 && newQuantity <= 10) {
      setQuantity(newQuantity);
    }
  };

  const addToCart = async () => {
    if (!item.available) {
      Alert.alert('Unavailable', 'This item is currently unavailable');
      return;
    }

    if (item.stock !== undefined && item.stock < quantity) {
      Alert.alert('Stock Limited', `Only ${item.stock} items available`);
      return;
    }

    setAddingToCart(true);
    try {
      await apiService.addToCart(item._id, quantity);

      Alert.alert(
        'Added to Cart',
        `${item.name} (${quantity}) has been added to your cart`,
        [
          {
            text: 'Continue Shopping',
            style: 'cancel',
          },
          {
            text: 'View Cart',
            onPress: () => navigation.navigate('Cart'),
          },
        ]
      );
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add item to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Ionicons key={i} name="star" size={16} color="#fbbf24" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Ionicons key={i} name="star-half" size={16} color="#fbbf24" />
        );
      } else {
        stars.push(
          <Ionicons key={i} name="star-outline" size={16} color="#d1d5db" />
        );
      }
    }

    return <View style={styles.ratingContainer}>{stars}</View>;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Item not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Item Image */}
        <View style={styles.imageContainer}>
          {item.image ? (
            <Image
              source={{ uri: `${apiService.baseURL}/${item.image}` }}
              style={styles.itemImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="image-outline" size={60} color="#9ca3af" />
            </View>
          )}
        </View>

        {/* Item Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.header}>
            <Text style={styles.itemName}>{item.name}</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>₹{item.price}</Text>
              {!item.available && (
                <Text style={styles.unavailableText}>Unavailable</Text>
              )}
            </View>
          </View>

          {/* Rating */}
          <View style={styles.ratingRow}>
            {renderStars(item.averageRating || 0)}
            <Text style={styles.ratingText}>
              {item.averageRating ? item.averageRating.toFixed(1) : '0.0'} 
              ({item.totalRatings || 0} reviews)
            </Text>
          </View>

          {/* Category and Tags */}
          <View style={styles.tagsContainer}>
            <View style={styles.categoryTag}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
            {item.isVeg !== undefined && (
              <View style={[styles.vegTag, item.isVeg ? styles.vegTagGreen : styles.vegTagRed]}>
                <Text style={[styles.vegText, item.isVeg ? styles.vegTextGreen : styles.vegTextRed]}>
                  {item.isVeg ? 'VEG' : 'NON-VEG'}
                </Text>
              </View>
            )}
            {item.spiceLevel && (
              <View style={styles.spiceTag}>
                <Text style={styles.spiceText}>🌶️ {item.spiceLevel}</Text>
              </View>
            )}
          </View>

          {/* Description */}
          {item.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{item.description}</Text>
            </View>
          )}

          {/* Nutrition Info */}
          {item.nutrition && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nutrition Information</Text>
              <View style={styles.nutritionGrid}>
                {item.nutrition.calories && (
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Calories</Text>
                    <Text style={styles.nutritionValue}>{item.nutrition.calories}</Text>
                  </View>
                )}
                {item.nutrition.protein && (
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Protein</Text>
                    <Text style={styles.nutritionValue}>{item.nutrition.protein}g</Text>
                  </View>
                )}
                {item.nutrition.carbs && (
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Carbs</Text>
                    <Text style={styles.nutritionValue}>{item.nutrition.carbs}g</Text>
                  </View>
                )}
                {item.nutrition.fat && (
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Fat</Text>
                    <Text style={styles.nutritionValue}>{item.nutrition.fat}g</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Stock Info */}
          {item.stock !== undefined && (
            <View style={styles.stockContainer}>
              <Text style={styles.stockText}>
                {item.stock > 0 ? `${item.stock} items left` : 'Out of stock'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomContainer}>
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateQuantity(-1)}
          >
            <Ionicons name="remove" size={20} color="#059669" />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{quantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateQuantity(1)}
          >
            <Ionicons name="add" size={20} color="#059669" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.addToCartButton, (!item.available || addingToCart) && styles.disabledButton]}
          onPress={addToCart}
          disabled={!item.available || addingToCart}
        >
          {addingToCart ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="cart" size={20} color="#ffffff" />
              <Text style={styles.addToCartText}>
                Add to Cart - ₹{(item.price * quantity).toFixed(2)}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
  },
  imageContainer: {
    height: 250,
    backgroundColor: '#f3f4f6',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  detailsContainer: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
    marginRight: 16,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#059669',
  },
  unavailableText: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  categoryTag: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    color: '#1d4ed8',
    fontWeight: '500',
  },
  vegTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  vegTagGreen: {
    backgroundColor: '#dcfce7',
  },
  vegTagRed: {
    backgroundColor: '#fee2e2',
  },
  vegText: {
    fontSize: 12,
    fontWeight: '500',
  },
  vegTextGreen: {
    color: '#16a34a',
  },
  vegTextRed: {
    color: '#dc2626',
  },
  spiceTag: {
    backgroundColor: '#fed7d7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  spiceText: {
    fontSize: 12,
    color: '#c53030',
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  nutritionItem: {
    width: '50%',
    marginBottom: 8,
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  nutritionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  stockContainer: {
    marginBottom: 20,
  },
  stockText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },
  bottomContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 16,
    minWidth: 20,
    textAlign: 'center',
  },
  addToCartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  addToCartText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default MenuItemScreen;