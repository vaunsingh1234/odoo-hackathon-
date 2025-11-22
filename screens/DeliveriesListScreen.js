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
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { getDeliveries, deleteDelivery } from '../database/db';
import { useFocusEffect } from '@react-navigation/native';
import DeliveryFormScreen from './DeliveryFormScreen';

const { width } = Dimensions.get('window');

export default function DeliveriesListScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'kanban'
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadUserAndDeliveries();
      return () => {};
    }, [])
  );

  useEffect(() => {
    filterDeliveries();
  }, [searchQuery, deliveries]);

  const loadUserAndDeliveries = async () => {
    try {
      setLoading(true);
      const userJson = await AsyncStorage.getItem('currentUser');
      if (userJson) {
        const currentUser = JSON.parse(userJson);
        setUser(currentUser);
        const fetchedDeliveries = await getDeliveries(currentUser.id);
        setDeliveries(fetchedDeliveries || []);
        setFilteredDeliveries(fetchedDeliveries || []);
      }
    } catch (error) {
      console.error('Error loading user or deliveries:', error);
      Alert.alert('Error', 'Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  };

  const filterDeliveries = () => {
    if (!searchQuery.trim()) {
      setFilteredDeliveries(deliveries);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = deliveries.filter(
      (delivery) =>
        delivery.reference?.toLowerCase().includes(query) ||
        delivery.contact?.toLowerCase().includes(query) ||
        delivery.toLocation?.toLowerCase().includes(query)
    );
    setFilteredDeliveries(filtered);
  };

  const handleNewDelivery = () => {
    setSelectedDelivery(null);
    setShowForm(true);
  };

  const handleEditDelivery = (delivery) => {
    setSelectedDelivery(delivery);
    setShowForm(true);
  };

  const handleDeleteDelivery = (deliveryId) => {
    Alert.alert(
      'Delete Delivery',
      'Are you sure you want to delete this delivery?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDelivery(user.id, deliveryId);
              Alert.alert('Success', 'Delivery deleted successfully');
              loadUserAndDeliveries();
            } catch (error) {
              console.error('Error deleting delivery:', error);
              Alert.alert('Error', 'Failed to delete delivery');
            }
          },
        },
      ]
    );
  };

  const renderListMode = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.colReference]}>Reference</Text>
          <Text style={[styles.tableHeaderText, styles.colFrom]}>From</Text>
          <Text style={[styles.tableHeaderText, styles.colTo]}>To</Text>
          <Text style={[styles.tableHeaderText, styles.colContact]}>Contact</Text>
          <Text style={[styles.tableHeaderText, styles.colScheduledDate]}>Scheduled Date</Text>
          <Text style={[styles.tableHeaderText, styles.colStatus]}>Status</Text>
          <Text style={[styles.tableHeaderText, styles.colActions]}>Actions</Text>
        </View>

        {filteredDeliveries.map((delivery) => (
          <TouchableOpacity
            key={delivery.id}
            style={styles.tableRow}
            onPress={() => handleEditDelivery(delivery)}
          >
            <Text style={[styles.tableCellText, styles.colReference]}>{delivery.reference}</Text>
            <Text style={[styles.tableCellText, styles.colFrom]}>{delivery.fromLocation || delivery.deliveryAddress || '-'}</Text>
            <Text style={[styles.tableCellText, styles.colTo]}>{delivery.deliveryAddress || delivery.toLocation || '-'}</Text>
            <Text style={[styles.tableCellText, styles.colContact]}>{delivery.contact || '-'}</Text>
            <Text style={[styles.tableCellText, styles.colScheduledDate]}>
              {delivery.scheduledDate ? new Date(delivery.scheduledDate).toLocaleDateString() : 'N/A'}
            </Text>
            <View style={[styles.tableCell, styles.colStatus]}>
              <View
                style={[
                  styles.statusBadge,
                  delivery.status === 'draft' && styles.statusDraft,
                  delivery.status === 'waiting' && styles.statusWaiting,
                  delivery.status === 'ready' && styles.statusReady,
                  delivery.status === 'done' && styles.statusDone,
                ]}
              >
                <Text style={styles.statusText}>{delivery.status}</Text>
              </View>
            </View>
            <View style={[styles.tableCell, styles.colActions]}>
              <TouchableOpacity
                onPress={() => handleEditDelivery(delivery)}
                style={styles.actionButton}
              >
                <Text style={styles.actionButtonText}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteDelivery(delivery.id)}
                style={[styles.actionButton, styles.deleteButton]}
              >
                <Text style={styles.actionButtonText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const renderKanbanMode = () => {
    const statuses = ['draft', 'waiting', 'ready', 'done'];
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kanbanContainer}>
        {statuses.map((status) => (
          <View key={status} style={styles.kanbanColumn}>
            <Text style={[styles.kanbanColumnTitle,
              status === 'draft' && styles.statusDraftText,
              status === 'waiting' && styles.statusWaitingText,
              status === 'ready' && styles.statusReadyText,
              status === 'done' && styles.statusDoneText,
            ]}>
              {status.charAt(0).toUpperCase() + status.slice(1)} ({filteredDeliveries.filter(d => d.status === status).length})
            </Text>
            <ScrollView style={styles.kanbanCardsContainer}>
              {filteredDeliveries
                .filter((d) => d.status === status)
                .map((delivery) => (
                  <TouchableOpacity
                    key={delivery.id}
                    style={styles.kanbanCard}
                    onPress={() => handleEditDelivery(delivery)}
                  >
                    <Text style={styles.kanbanCardReference}>{delivery.reference}</Text>
                    <Text style={styles.kanbanCardDetail}>From: {delivery.fromLocation || delivery.deliveryAddress || '-'}</Text>
                    <Text style={styles.kanbanCardDetail}>To: {delivery.deliveryAddress || delivery.toLocation || '-'}</Text>
                    <Text style={styles.kanbanCardDetail}>Contact: {delivery.contact || '-'}</Text>
                    <Text style={styles.kanbanCardDetail}>
                      Scheduled: {delivery.scheduledDate ? new Date(delivery.scheduledDate).toLocaleDateString() : 'N/A'}
                    </Text>
                    <View style={styles.kanbanCardActions}>
                      <TouchableOpacity onPress={() => handleEditDelivery(delivery)} style={styles.kanbanActionButton}>
                        <Text style={styles.kanbanActionButtonText}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteDelivery(delivery.id)} style={[styles.kanbanActionButton, styles.deleteButton]}>
                        <Text style={styles.kanbanActionButtonText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        ))}
      </ScrollView>
    );
  };

  if (showForm) {
    return (
      <DeliveryFormScreen
        delivery={selectedDelivery}
        user={user}
        onClose={() => {
          setShowForm(false);
          setSelectedDelivery(null);
          loadUserAndDeliveries();
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.wavyHeader}>
          <LinearGradient
            colors={['#9D50BB', '#6E48AA', '#8B5FBF']}
            style={styles.waveGradient}
          >
            <Svg
              height="100"
              width="100%"
              viewBox="0 0 400 100"
              style={styles.waveSvg}
            >
              <Path
                d="M0,40 Q100,10 200,40 T400,40 L400,0 L0,0 Z"
                fill="rgba(255, 255, 255, 0.1)"
              />
            </Svg>
          </LinearGradient>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Delivery</Text>
            <TouchableOpacity onPress={handleNewDelivery} style={styles.addButton}>
              <LinearGradient
                colors={['#FF6B9D', '#C44569', '#F8B500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.addButtonGradient}
              >
                <Text style={styles.addButtonText}>+ New</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formContent}>
          <View style={styles.searchAndToggleContainer}>
            <View style={styles.searchContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search deliveries..."
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
            <View style={styles.toggleButtons}>
              <TouchableOpacity
                style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
                onPress={() => setViewMode('list')}
              >
                <Text style={styles.toggleButtonText}>☰ List</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, viewMode === 'kanban' && styles.toggleButtonActive]}
                onPress={() => setViewMode('kanban')}
              >
                <Text style={styles.toggleButtonText}>🗃️ Kanban</Text>
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Loading deliveries...</Text>
            </View>
          ) : filteredDeliveries.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'No deliveries found' : 'No deliveries available'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity onPress={handleNewDelivery} style={styles.addFirstButton}>
                  <Text style={styles.addFirstButtonText}>Create Your First Delivery</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            viewMode === 'list' ? renderListMode() : renderKanbanMode()
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1625',
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
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  formContent: {
    padding: 20,
    flex: 1,
  },
  searchAndToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1625',
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flex: 1,
    minWidth: 200,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 10,
    color: 'rgba(255, 255, 255, 0.6)',
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
  toggleButtons: {
    flexDirection: 'row',
    backgroundColor: '#1A1625',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  toggleButton: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#FF6B9D',
  },
  toggleButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
    fontSize: 14,
  },
  table: {
    minWidth: 700,
    backgroundColor: '#1A1625',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2C243B',
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B9D',
    minHeight: 50,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    minHeight: 70,
  },
  tableCell: {
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tableCellText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  colReference: { width: 100 },
  colFrom: { width: 100 },
  colTo: { width: 100 },
  colContact: { width: 120 },
  colScheduledDate: { width: 120 },
  colStatus: { width: 80 },
  colActions: {
    width: 80,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  statusBadge: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignSelf: 'center',
  },
  statusDraft: { backgroundColor: 'rgba(255, 193, 7, 0.2)' },
  statusWaiting: { backgroundColor: 'rgba(255, 152, 0, 0.2)' },
  statusReady: { backgroundColor: 'rgba(0, 123, 255, 0.2)' },
  statusDone: { backgroundColor: 'rgba(40, 167, 69, 0.2)' },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  actionButton: {
    width: 35,
    height: 35,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 157, 0.2)',
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
    fontSize: 16,
    color: '#FF6B9D',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#2C243B',
    borderRadius: 12,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 15,
    textAlign: 'center',
  },
  addFirstButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 15,
    backgroundColor: '#FF6B9D',
  },
  addFirstButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  kanbanContainer: {
    flexDirection: 'row',
    gap: 15,
    paddingBottom: 20,
  },
  kanbanColumn: {
    width: width * 0.8 - 30,
    backgroundColor: '#1A1625',
    borderRadius: 12,
    padding: 15,
    minHeight: 200,
    maxHeight: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  kanbanColumnTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  statusDraftText: { color: '#FFC107' },
  statusWaitingText: { color: '#FF9800' },
  statusReadyText: { color: '#007BFF' },
  statusDoneText: { color: '#28A745' },
  kanbanCardsContainer: {
    flexGrow: 1,
  },
  kanbanCard: {
    backgroundColor: '#2C243B',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B9D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  kanbanCardReference: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  kanbanCardDetail: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  kanbanCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 8,
  },
  kanbanActionButton: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 107, 157, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 157, 0.3)',
  },
  kanbanActionButtonText: {
    fontSize: 14,
    color: '#FF6B9D',
  },
});

