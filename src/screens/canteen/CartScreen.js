import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  Modal
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/api';

const CartScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState({ items: [], itemCount: 0, totalAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderData, setOrderData] = useState({
    deliveryAddress: {
      hostelBlock: '',
      roomNumber: '',
      floor: 0,
      landmark: '',
      contactNumber: ''
    },
    paymentMethod: 'cash',
    deliveryInstructions: ''
  });

  const fetchCart = async () => {
    try {
      setLoading(true);
      const response = await apiService.getCart();
      if (response.success) {
        setCart(response.data);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
      Alert.alert('Error', 'Failed to fetch cart');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCart();
    }, [])
  );

  const updateQuantity = async (itemId, newQuantity) => {
    try {
      const response = await apiService.updateCartItem(itemId, newQuantity);
      if (response.success) {
        setCart(response.data);
      }
    } catch (error) {
      console.error('Update quantity error:', error);
      Alert.alert('Error', 'Failed to update quantity');
    }
  };

  const removeItem = async (itemId) => {
    try {
      const response = await apiService.removeFromCart(itemId);
      if (response.success) {
        setCart(response.data);
        Alert.alert('Success', 'Item removed from cart');
      }
    } catch (error) {
      console.error('Remove item error:', error);
      Alert.alert('Error', 'Failed to remove item');
    }
  };

  const clearCart = async () => {
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to remove all items from cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.clearCart();
              if (response.success) {
                setCart(response.data);
                Alert.alert('Success', 'Cart cleared');
              }
            } catch (error) {
              console.error('Clear cart error:', error);
              Alert.alert('Error', 'Failed to clear cart');
            }
          }
        }
      ]
    );
  };

  const placeOrder = async () => {
    try {
      // Validate order data
      if (!orderData.deliveryAddress.hostelBlock || 
          !orderData.deliveryAddress.roomNumber || 
          !orderData.deliveryAddress.contactNumber) {
        Alert.alert('Error', 'Please fill in all required delivery details');
        return;
      }

      const response = await apiService.placeOrder(orderData);
      if (response.success) {
        Alert.alert(
          'Order Placed!',
          `Your order #${response.data.orderNumber} has been placed successfully`,
          [
            {
              text: 'View Order',
              onPress: () => {
                setShowCheckout(false);
                navigation.navigate('Orders');
              }
            }
          ]
        );
        setCart({ items: [], itemCount: 0, totalAmount: 0 });
      }
    } catch (error) {
      console.error('Place order error:', error);
      Alert.alert('Error', error.message || 'Failed to place order');
    }
  };

  const formatPrice = (price) => {
    return `₹${price.toFixed(0)}`;
  };

  const getItemImage = (item) => {
    if (item.menuItem?.image?.path) {
      return { uri: `http://localhost:5000/${item.menuItem.image.path}` };
    }
    return { uri: 'https://via.placeholder.com/80x60?text=Food' };
  };

  const deliveryFee = cart.totalAmount >= 100 ? 0 : 20;
  const finalAmount = cart.totalAmount + deliveryFee;

  const CartItem = ({ item }) => (
    <View style={styles.cartItem}>
      <Image source={getItemImage(item)} style={styles.itemImage} />
      
      <View style={styles.itemDetails}>
        <Text style={styles.itemName}>{item.menuItem?.name}</Text>
        <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>
        
        {item.specialInstructions && (
          <Text style={styles.specialInstructions}>
            Note: {item.specialInstructions}
          </Text>
        )}
      </View>

      <View style={styles.itemActions}>
        <View style={styles.quantityControls}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateQuantity(item.menuItem._id, item.quantity - 1)}
          >
            <Text style={styles.quantityButtonText}>-</Text>
          </TouchableOpacity>
          
          <Text style={styles.quantityText}>{item.quantity}</Text>
          
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateQuantity(item.menuItem._id, item.quantity + 1)}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeItem(item.menuItem._id)}
        >
          <Text style={styles.removeButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading cart...</Text>
      </View>
    );
  }

  if (cart.items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptySubtext}>Add some delicious items to get started!</Text>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate('Canteen')}
        >
          <Text style={styles.browseButtonText}>Browse Menu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Cart</Text>
        <TouchableOpacity onPress={clearCart}>
          <Text style={styles.clearButton}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cart Items */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>
            Items ({cart.itemCount})
          </Text>
          
          {cart.items.map((item, index) => (
            <CartItem key={item.menuItem._id || index} item={item} />
          ))}
        </View>

        {/* Order Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatPrice(cart.totalAmount)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>
              {deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}
            </Text>
          </View>
          
          {cart.totalAmount < 100 && (
            <Text style={styles.deliveryNote}>
              💡 Add ₹{100 - cart.totalAmount} more for free delivery!
            </Text>
          )}
          
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPrice(finalAmount)}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => navigation.navigate('Canteen')}
          >
            <Text style={styles.continueButtonText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Checkout Button */}
      <TouchableOpacity
        style={styles.checkoutButton}
        onPress={() => setShowCheckout(true)}
      >
        <Text style={styles.checkoutButtonText}>
          Proceed to Checkout • {formatPrice(finalAmount)}
        </Text>
      </TouchableOpacity>

      {/* Checkout Modal */}
      <Modal
        visible={showCheckout}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCheckout(false)}
      >
        <View style={styles.checkoutModal}>
          <View style={styles.checkoutHeader}>
            <TouchableOpacity onPress={() => setShowCheckout(false)}>
              <Text style={styles.checkoutClose}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.checkoutTitle}>Checkout</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.checkoutContent}>
            {/* Delivery Address */}
            <View style={styles.checkoutSection}>
              <Text style={styles.checkoutSectionTitle}>Delivery Address</Text>
              
              <TextInput
                style={styles.checkoutInput}
                placeholder="Hostel Block *"
                value={orderData.deliveryAddress.hostelBlock}
                onChangeText={(text) =>
                  setOrderData(prev => ({
                    ...prev,
                    deliveryAddress: { ...prev.deliveryAddress, hostelBlock: text }
                  }))
                }
              />
              
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.checkoutInput, styles.halfInput]}
                  placeholder="Room Number *"
                  value={orderData.deliveryAddress.roomNumber}
                  onChangeText={(text) =>
                    setOrderData(prev => ({
                      ...prev,
                      deliveryAddress: { ...prev.deliveryAddress, roomNumber: text }
                    }))
                  }
                />
                
                <TextInput
                  style={[styles.checkoutInput, styles.halfInput]}
                  placeholder="Floor"
                  keyboardType="numeric"
                  value={orderData.deliveryAddress.floor.toString()}
                  onChangeText={(text) =>
                    setOrderData(prev => ({
                      ...prev,
                      deliveryAddress: { ...prev.deliveryAddress, floor: parseInt(text) || 0 }
                    }))
                  }
                />
              </View>
              
              <TextInput
                style={styles.checkoutInput}
                placeholder="Contact Number *"
                keyboardType="phone-pad"
                value={orderData.deliveryAddress.contactNumber}
                onChangeText={(text) =>
                  setOrderData(prev => ({
                    ...prev,
                    deliveryAddress: { ...prev.deliveryAddress, contactNumber: text }
                  }))
                }
              />
              
              <TextInput
                style={styles.checkoutInput}
                placeholder="Landmark (optional)"
                value={orderData.deliveryAddress.landmark}
                onChangeText={(text) =>
                  setOrderData(prev => ({
                    ...prev,
                    deliveryAddress: { ...prev.deliveryAddress, landmark: text }
                  }))
                }
              />
            </View>

            {/* Payment Method */}
            <View style={styles.checkoutSection}>
              <Text style={styles.checkoutSectionTitle}>Payment Method</Text>
              
              {['cash', 'upi', 'card'].map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.paymentOption,
                    orderData.paymentMethod === method && styles.paymentOptionActive
                  ]}
                  onPress={() =>
                    setOrderData(prev => ({ ...prev, paymentMethod: method }))
                  }
                >
                  <Text style={[
                    styles.paymentOptionText,
                    orderData.paymentMethod === method && styles.paymentOptionTextActive
                  ]}>
                    {method === 'cash' ? '💵 Cash on Delivery' :
                     method === 'upi' ? '📱 UPI Payment' :
                     '💳 Card Payment'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Delivery Instructions */}
            <View style={styles.checkoutSection}>
              <Text style={styles.checkoutSectionTitle}>Special Instructions</Text>
              
              <TextInput
                style={[styles.checkoutInput, styles.textArea]}
                placeholder="Any special delivery instructions..."
                multiline
                numberOfLines={3}
                value={orderData.deliveryInstructions}
                onChangeText={(text) =>
                  setOrderData(prev => ({ ...prev, deliveryInstructions: text }))
                }
              />
            </View>

            {/* Order Summary in Modal */}
            <View style={styles.checkoutSection}>
              <Text style={styles.checkoutSectionTitle}>Order Summary</Text>
              
              <View style={styles.checkoutSummary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Items ({cart.itemCount})</Text>
                  <Text style={styles.summaryValue}>{formatPrice(cart.totalAmount)}</Text>
                </View>
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Delivery</Text>
                  <Text style={styles.summaryValue}>
                    {deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}
                  </Text>
                </View>
                
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>{formatPrice(finalAmount)}</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.checkoutActions}>
            <TouchableOpacity
              style={styles.placeOrderButton}
              onPress={placeOrder}
            >
              <Text style={styles.placeOrderButtonText}>
                Place Order • {formatPrice(finalAmount)}
              </Text>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  browseButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  backButton: {
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  clearButton: {
    fontSize: 14,
    color: '#FF4444',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  itemsSection: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  cartItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  specialInstructions: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  itemActions: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    marginBottom: 8,
  },
  quantityButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    borderRadius: 14,
  },
  quantityButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginHorizontal: 12,
    color: '#333',
    minWidth: 20,
    textAlign: 'center',
  },
  removeButton: {
    padding: 4,
  },
  removeButtonText: {
    fontSize: 16,
  },
  summarySection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  deliveryNote: {
    fontSize: 12,
    color: '#4CAF50',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 8,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  actionsSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  continueButton: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  continueButtonText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
  },
  checkoutButton: {
    backgroundColor: '#FF6B35',
    margin: 16,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Checkout Modal Styles
  checkoutModal: {
    flex: 1,
    backgroundColor: '#fff',
  },
  checkoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  checkoutClose: {
    fontSize: 24,
    color: '#666',
  },
  checkoutTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  checkoutContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  checkoutSection: {
    marginVertical: 20,
  },
  checkoutSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  checkoutInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  paymentOption: {
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8,
  },
  paymentOptionActive: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF5F3',
  },
  paymentOptionText: {
    fontSize: 16,
    color: '#333',
  },
  paymentOptionTextActive: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  checkoutSummary: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
  },
  checkoutActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  placeOrderButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  placeOrderButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CartScreen;