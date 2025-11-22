import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { getInventoryItems, createOrUpdateInventoryItem, deleteInventoryItem, getInventoryItemByCode } from '../database/db';

// Predefined categories
const CATEGORIES = [
  'Home Appliances',
  'Food Items',
  'Electronics',
  'Clothing',
  'Furniture',
  'Sports & Fitness',
  'Books & Media',
  'Beauty & Personal Care',
  'Automotive',
  'Office Supplies',
  'Toys & Games',
  'Health & Medical',
  'Other',
];

// Generate random 5-letter code
const generateProductCode = () => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return code;
};

export default function StockScreen() {
  const [user, setUser] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    productName: '',
    productCode: '',
    category: '',
    quantity: '',
    unitPrice: '',
    supplierName: '',
    location: '',
    minStockLevel: '',
    maxStockLevel: '',
    notes: '',
  });

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user && user.id) {
      loadInventory();
    }
  }, [user]);

  useEffect(() => {
    filterInventory();
  }, [searchQuery, inventory]);

  const loadUser = async () => {
    try {
      const userJson = await AsyncStorage.getItem('currentUser');
      if (userJson) {
        setUser(JSON.parse(userJson));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadInventory = async () => {
    try {
      setLoading(true);
      const items = await getInventoryItems(user.id);
      setInventory(items || []);
      setFilteredInventory(items || []);
    } catch (error) {
      console.error('Error loading inventory:', error);
      Alert.alert('Error', 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const filterInventory = () => {
    if (!searchQuery.trim()) {
      setFilteredInventory(inventory);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = inventory.filter(
      (item) =>
        item.productName?.toLowerCase().includes(query) ||
        item.productCode?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query) ||
        item.supplierName?.toLowerCase().includes(query)
    );
    setFilteredInventory(filtered);
  };

  const generateUniqueCode = async () => {
    let code = generateProductCode();
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      try {
        const existingItem = await getInventoryItemByCode(user.id, code);
        if (!existingItem) {
          return code; // Code is unique
        }
        code = generateProductCode(); // Generate new code if exists
        attempts++;
      } catch (error) {
        // If error (like item not found), code is unique
        return code;
      }
    }
    return code; // Return last generated code if max attempts reached
  };

  const openAddModal = async () => {
    setEditingItem(null);
    
    // Generate unique product code for new items
    let uniqueCode = '';
    if (user && user.id) {
      uniqueCode = await generateUniqueCode();
    }

    setFormData({
      productName: '',
      productCode: uniqueCode,
      category: '',
      quantity: '',
      unitPrice: '',
      supplierName: '',
      location: '',
      minStockLevel: '',
      maxStockLevel: '',
      notes: '',
    });
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      productName: item.productName || '',
      productCode: item.productCode || '',
      category: item.category || '',
      quantity: item.quantity?.toString() || '',
      unitPrice: item.unitPrice?.toString() || '',
      supplierName: item.supplierName || '',
      location: item.location || '',
      minStockLevel: item.minStockLevel?.toString() || '',
      maxStockLevel: item.maxStockLevel?.toString() || '',
      notes: item.notes || '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.productName.trim()) {
      Alert.alert('Error', 'Product name is required');
      return;
    }

    if (!formData.quantity || parseFloat(formData.quantity) < 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    try {
      const itemData = {
        productName: formData.productName.trim(),
        productCode: formData.productCode.trim() || null,
        category: formData.category.trim() || null,
        quantity: parseInt(formData.quantity) || 0,
        unitPrice: parseFloat(formData.unitPrice) || 0,
        supplierName: formData.supplierName.trim() || null,
        location: formData.location.trim() || null,
        minStockLevel: parseInt(formData.minStockLevel) || 0,
        maxStockLevel: formData.maxStockLevel ? parseInt(formData.maxStockLevel) : null,
        notes: formData.notes.trim() || null,
      };

      if (editingItem) {
        await createOrUpdateInventoryItem(user.id, {
          ...itemData,
          productCode: itemData.productCode || editingItem.productCode,
        });
        Alert.alert('Success', 'Stock updated successfully');
      } else {
        await createOrUpdateInventoryItem(user.id, itemData);
        Alert.alert('Success', 'Product added to inventory');
      }

      setModalVisible(false);
      loadInventory();
    } catch (error) {
      console.error('Error saving inventory item:', error);
      Alert.alert('Error', 'Failed to save inventory item');
    }
  };

  const handleDelete = (item) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${item.productName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteInventoryItem(user.id, item.id);
              Alert.alert('Success', 'Product deleted successfully');
              loadInventory();
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  const calculateTotalValue = (item) => {
    const quantity = item.quantity || 0;
    const unitPrice = item.unitPrice || 0;
    return quantity * unitPrice;
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Dark Card Container - Full Screen */}
            <View style={styles.card}>
              {/* Wavy Header with Gradient */}
              <View style={styles.wavyHeader}>
                <LinearGradient
                  colors={['#9D50BB', '#6E48AA', '#8B5FBF']}
                  style={styles.waveGradient}
                >
                  <Svg
                    height="120"
                    width="100%"
                    viewBox="0 0 400 120"
                    style={styles.waveSvg}
                  >
                    <Path
                      d="M0,60 Q100,20 200,60 T400,60 L400,0 L0,0 Z"
                      fill="rgba(255, 255, 255, 0.1)"
                    />
                  </Svg>
                </LinearGradient>
                <View style={styles.headerContent}>
                  <Text style={styles.title}>Stock</Text>
                  <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
                    <LinearGradient
                      colors={['#FF6B9D', '#C44569', '#F8B500']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.addButtonGradient}
                    >
                      <Text style={styles.addButtonText}>+ Add</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Form Content */}
              <View style={styles.formContent}>
                {/* Search Bar */}
                <View style={styles.searchContainer}>
                  <Text style={styles.searchIcon}>🔍</Text>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search products..."
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                      <Text style={styles.clearButtonText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Inventory Table */}
                {loading ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>Loading inventory...</Text>
                  </View>
                ) : filteredInventory.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>
                      {searchQuery ? 'No products found' : 'No products in inventory'}
                    </Text>
                    {!searchQuery && (
                      <TouchableOpacity onPress={openAddModal} style={styles.addFirstButton}>
                        <Text style={styles.addFirstButtonText}>Add Your First Product</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.table}>
                      {/* Table Header */}
                      <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderText, styles.colProduct]}>Product</Text>
                        <Text style={[styles.tableHeaderText, styles.colCost]}>Per Unit Cost</Text>
                        <Text style={[styles.tableHeaderText, styles.colOnHand]}>On Hand</Text>
                        <Text style={[styles.tableHeaderText, styles.colFree]}>Free to Use</Text>
                        <Text style={[styles.tableHeaderText, styles.colActions]}>Actions</Text>
                      </View>

                    {/* Table Rows */}
                    {filteredInventory.map((item) => {
                      const totalValue = calculateTotalValue(item);
                      const freeToUse = item.quantity || 0;

                      return (
                        <View key={item.id} style={styles.tableRow}>
                          <View style={[styles.tableCell, styles.colProduct]}>
                            <Text style={styles.productName} numberOfLines={1}>
                              {item.productName}
                            </Text>
                            {item.productCode && (
                              <Text style={styles.productCode}>{item.productCode}</Text>
                            )}
                          </View>
                          <View style={[styles.tableCell, styles.colCost]}>
                            <Text style={styles.cellText}>
                              {item.unitPrice ? `₹${item.unitPrice.toFixed(2)}` : '₹0.00'}
                            </Text>
                            {totalValue > 0 && (
                              <Text style={styles.totalValueText}>
                                Total: ₹{totalValue.toFixed(2)}
                              </Text>
                            )}
                          </View>
                          <View style={[styles.tableCell, styles.colOnHand]}>
                            <Text style={styles.cellText}>{item.quantity || 0}</Text>
                          </View>
                          <View style={[styles.tableCell, styles.colFree]}>
                            <Text style={styles.cellText}>{freeToUse}</Text>
                          </View>
                          <View style={[styles.tableCell, styles.colActions]}>
                            <TouchableOpacity
                              onPress={() => openEditModal(item)}
                              style={styles.actionButton}
                            >
                              <Text style={styles.actionButtonText}>✏️</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleDelete(item)}
                              style={[styles.actionButton, styles.deleteButton]}
                            >
                              <Text style={styles.actionButtonText}>🗑️</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                    </View>
                  </ScrollView>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItem ? 'Update Stock' : 'Add New Product'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Product Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter product name"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={formData.productName}
                  onChangeText={(text) => setFormData({ ...formData, productName: text })}
                />
                <View style={styles.underline} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Product Code</Text>
                <TextInput
                  style={[styles.input, styles.productCodeInput]}
                  placeholder="Auto-generated 5-letter code"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={formData.productCode}
                  onChangeText={(text) => setFormData({ ...formData, productCode: text.toUpperCase().slice(0, 5) })}
                  maxLength={5}
                  editable={!editingItem} // Disable editing for existing items
                />
                <View style={styles.underline} />
                {!editingItem && (
                  <Text style={styles.codeHint}>Auto-generated unique 5-letter code</Text>
                )}
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, styles.inputHalf]}>
                  <Text style={styles.inputLabel}>Quantity *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={formData.quantity}
                    onChangeText={(text) => setFormData({ ...formData, quantity: text.replace(/[^0-9]/g, '') })}
                    keyboardType="number-pad"
                  />
                  <View style={styles.underline} />
                </View>

                <View style={[styles.inputGroup, styles.inputHalf]}>
                  <Text style={styles.inputLabel}>Unit Price (₹)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={formData.unitPrice}
                    onChangeText={(text) => setFormData({ ...formData, unitPrice: text.replace(/[^0-9.]/g, '') })}
                    keyboardType="decimal-pad"
                  />
                  <View style={styles.underline} />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category</Text>
                <View style={styles.categoryContainer}>
                  {CATEGORIES.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryChip,
                        formData.category === category && styles.categoryChipSelected,
                      ]}
                      onPress={() => setFormData({ ...formData, category })}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          formData.category === category && styles.categoryChipTextSelected,
                        ]}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {formData.category && (
                  <View style={styles.selectedCategory}>
                    <Text style={styles.selectedCategoryText}>
                      Selected: {formData.category}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.inputRow}>

                <View style={[styles.inputGroup, styles.inputHalf]}>
                  <Text style={styles.inputLabel}>Location</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Location"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={formData.location}
                    onChangeText={(text) => setFormData({ ...formData, location: text })}
                  />
                  <View style={styles.underline} />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Supplier Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter supplier name"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={formData.supplierName}
                  onChangeText={(text) => setFormData({ ...formData, supplierName: text })}
                />
                <View style={styles.underline} />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, styles.inputHalf]}>
                  <Text style={styles.inputLabel}>Min Stock Level</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={formData.minStockLevel}
                    onChangeText={(text) => setFormData({ ...formData, minStockLevel: text.replace(/[^0-9]/g, '') })}
                    keyboardType="number-pad"
                  />
                  <View style={styles.underline} />
                </View>

                <View style={[styles.inputGroup, styles.inputHalf]}>
                  <Text style={styles.inputLabel}>Max Stock Level</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Optional"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={formData.maxStockLevel}
                    onChangeText={(text) => setFormData({ ...formData, maxStockLevel: text.replace(/[^0-9]/g, '') })}
                    keyboardType="number-pad"
                  />
                  <View style={styles.underline} />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Additional notes (optional)"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={formData.notes}
                  onChangeText={(text) => setFormData({ ...formData, notes: text })}
                  multiline
                  numberOfLines={3}
                />
                <View style={styles.underline} />
              </View>

              <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                <LinearGradient
                  colors={['#FF6B9D', '#C44569', '#F8B500']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveButtonGradient}
                >
                  <Text style={styles.saveButtonText}>
                    {editingItem ? 'Update Stock' : 'Add to Inventory'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1625',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
  },
  card: {
    flex: 1,
    backgroundColor: '#2C243B',
  },
  wavyHeader: {
    height: 100,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
    overflow: 'hidden',
  },
  waveGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  waveSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    zIndex: 1,
    marginTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'left',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    flex: 1,
  },
  addButton: {
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#FF6B9D',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addButtonGradient: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  formContent: {
    padding: 20,
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1625',
    marginBottom: 20,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    paddingVertical: 12,
  },
  clearButton: {
    padding: 5,
  },
  clearButtonText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 18,
  },
  table: {
    backgroundColor: '#1A1625',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    minWidth: 600, // Ensure minimum width for all columns
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2C243B',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B9D',
    minHeight: 50,
  },
  tableHeaderText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    minHeight: 70,
  },
  tableCell: {
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  colProduct: {
    width: 140,
  },
  colCost: {
    width: 130,
  },
  colOnHand: {
    width: 80,
    alignItems: 'center',
  },
  colFree: {
    width: 90,
    alignItems: 'center',
  },
  colActions: {
    width: 120,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  productCode: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  cellText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  totalValueText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 3,
    textAlign: 'center',
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 157, 0.2)',
    width: 45,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 157, 0.3)',
  },
  deleteButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    borderColor: 'rgba(244, 67, 54, 0.3)',
  },
  actionButtonText: {
    fontSize: 20,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
  addFirstButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 107, 157, 0.2)',
    borderWidth: 1,
    borderColor: '#FF6B9D',
  },
  addFirstButtonText: {
    color: '#FF6B9D',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#2C243B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 25,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 15,
  },
  inputHalf: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 10,
    fontWeight: '600',
  },
  input: {
    fontSize: 17,
    color: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 0,
    fontWeight: '500',
  },
  productCodeInput: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 2,
  },
  codeHint: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 5,
    fontStyle: 'italic',
  },
  underline: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginTop: 8,
    borderRadius: 1,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryChipSelected: {
    backgroundColor: '#FF6B9D',
    borderColor: '#FF6B9D',
  },
  categoryChipText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  selectedCategory: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 107, 157, 0.2)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B9D',
  },
  selectedCategoryText: {
    fontSize: 14,
    color: '#FF6B9D',
    fontWeight: '600',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 30,
    shadowColor: '#FF6B9D',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  saveButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
