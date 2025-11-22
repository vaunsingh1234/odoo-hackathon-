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
import {
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
} from '../database/db';

export default function SettingsScreen() {
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState('Warehouse'); // 'Warehouse' or 'Location'
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    shortCode: '',
    address: '',
    warehouseName: '',
  });

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user && user.id) {
      loadData();
    }
  }, [user, activeSection]);

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

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeSection === 'Warehouse') {
        const data = await getWarehouses(user.id);
        setWarehouses(data || []);
      } else {
        const data = await getLocations(user.id);
        setLocations(data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      shortCode: '',
      address: '',
      warehouseName: '',
    });
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      shortCode: item.shortCode || '',
      address: item.address || '',
      warehouseName: item.warehouseName || '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    if (!formData.shortCode.trim()) {
      Alert.alert('Error', 'Short Code is required');
      return;
    }

    try {
      if (activeSection === 'Warehouse') {
        const warehouseData = {
          name: formData.name.trim(),
          shortCode: formData.shortCode.trim(),
          address: formData.address.trim() || null,
        };

        if (editingItem) {
          await updateWarehouse(user.id, editingItem.id, warehouseData);
          Alert.alert('Success', 'Warehouse updated successfully');
        } else {
          await createWarehouse(user.id, warehouseData);
          Alert.alert('Success', 'Warehouse added successfully');
        }
      } else {
        const locationData = {
          name: formData.name.trim(),
          shortCode: formData.shortCode.trim(),
          warehouseName: formData.warehouseName.trim() || null,
        };

        if (editingItem) {
          await updateLocation(user.id, editingItem.id, locationData);
          Alert.alert('Success', 'Location updated successfully');
        } else {
          await createLocation(user.id, locationData);
          Alert.alert('Success', 'Location added successfully');
        }
      }

      setModalVisible(false);
      loadData();
    } catch (error) {
      console.error('Error saving:', error);
      Alert.alert('Error', error.message || 'Failed to save');
    }
  };

  const handleDelete = (item) => {
    const itemType = activeSection === 'Warehouse' ? 'warehouse' : 'location';
    Alert.alert(
      `Delete ${activeSection}`,
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (activeSection === 'Warehouse') {
                await deleteWarehouse(user.id, item.id);
              } else {
                await deleteLocation(user.id, item.id);
              }
              Alert.alert('Success', `${activeSection} deleted successfully`);
              loadData();
            } catch (error) {
              console.error('Error deleting:', error);
              Alert.alert('Error', 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  const currentData = activeSection === 'Warehouse' ? warehouses : locations;

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
                  <Text style={styles.title}>Settings</Text>
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
                {/* Section Tabs */}
                <View style={styles.sectionTabs}>
                  <TouchableOpacity
                    style={[
                      styles.sectionTab,
                      activeSection === 'Warehouse' && styles.sectionTabActive,
                    ]}
                    onPress={() => setActiveSection('Warehouse')}
                  >
                    <Text
                      style={[
                        styles.sectionTabText,
                        activeSection === 'Warehouse' && styles.sectionTabTextActive,
                      ]}
                    >
                      Warehouse
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.sectionTab,
                      activeSection === 'Location' && styles.sectionTabActive,
                    ]}
                    onPress={() => setActiveSection('Location')}
                  >
                    <Text
                      style={[
                        styles.sectionTabText,
                        activeSection === 'Location' && styles.sectionTabTextActive,
                      ]}
                    >
                      Location
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Data List */}
                {loading ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>Loading...</Text>
                  </View>
                ) : currentData.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>
                      No {activeSection.toLowerCase()}s added yet
                    </Text>
                    <TouchableOpacity onPress={openAddModal} style={styles.addFirstButton}>
                      <Text style={styles.addFirstButtonText}>
                        Add Your First {activeSection}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.listContainer}>
                    {currentData.map((item) => (
                      <View key={item.id} style={styles.listItem}>
                        <View style={styles.listItemContent}>
                          <Text style={styles.listItemName}>{item.name}</Text>
                          <Text style={styles.listItemCode}>
                            Code: {item.shortCode}
                          </Text>
                          {activeSection === 'Warehouse' && item.address && (
                            <Text style={styles.listItemDetail}>
                              {item.address}
                            </Text>
                          )}
                          {activeSection === 'Location' && item.warehouseName && (
                            <Text style={styles.listItemDetail}>
                              Warehouse: {item.warehouseName}
                            </Text>
                          )}
                        </View>
                        <View style={styles.listItemActions}>
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
                    ))}
                  </View>
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
                {editingItem
                  ? `Update ${activeSection}`
                  : `Add New ${activeSection}`}
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
                <Text style={styles.inputLabel}>Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder={`Enter ${activeSection.toLowerCase()} name`}
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
                <View style={styles.underline} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Short Code *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter short code"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={formData.shortCode}
                  onChangeText={(text) =>
                    setFormData({ ...formData, shortCode: text.toUpperCase() })
                  }
                  autoCapitalize="characters"
                />
                <View style={styles.underline} />
              </View>

              {activeSection === 'Warehouse' ? (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Address</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Enter warehouse address (optional)"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={formData.address}
                    onChangeText={(text) => setFormData({ ...formData, address: text })}
                    multiline
                    numberOfLines={3}
                  />
                  <View style={styles.underline} />
                </View>
              ) : (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Warehouse Name (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter warehouse name or code"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={formData.warehouseName}
                    onChangeText={(text) =>
                      setFormData({ ...formData, warehouseName: text })
                    }
                  />
                  <View style={styles.underline} />
                  <Text style={styles.hintText}>
                    Leave empty if this location is not part of a warehouse
                  </Text>
                </View>
              )}

              <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                <LinearGradient
                  colors={['#FF6B9D', '#C44569', '#F8B500']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveButtonGradient}
                >
                  <Text style={styles.saveButtonText}>
                    {editingItem ? 'Update' : 'Add'} {activeSection}
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
  sectionTabs: {
    flexDirection: 'row',
    marginBottom: 25,
    backgroundColor: '#1A1625',
    borderRadius: 12,
    padding: 4,
  },
  sectionTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  sectionTabActive: {
    backgroundColor: '#FF6B9D',
  },
  sectionTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  sectionTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContainer: {
    gap: 12,
  },
  listItem: {
    backgroundColor: '#1A1625',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B9D',
  },
  listItemContent: {
    flex: 1,
    marginRight: 12,
  },
  listItemName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  listItemCode: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  listItemDetail: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
  },
  listItemActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    padding: 10,
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
    marginBottom: 20,
  },
  addFirstButton: {
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
  underline: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginTop: 8,
    borderRadius: 1,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  hintText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 5,
    fontStyle: 'italic',
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

