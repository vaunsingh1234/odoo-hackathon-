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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { getReceipts, deleteReceipt } from '../database/db';
import ReceiptFormScreen from './ReceiptFormScreen';

export default function ReceiptsListScreen() {
  const [user, setUser] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [filteredReceipts, setFilteredReceipts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'kanban'
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user && user.id) {
      loadReceipts();
    }
  }, [user]);

  useEffect(() => {
    filterReceipts();
  }, [searchQuery, receipts]);

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

  const loadReceipts = async () => {
    try {
      setLoading(true);
      const data = await getReceipts(user.id);
      setReceipts(data || []);
      setFilteredReceipts(data || []);
    } catch (error) {
      console.error('Error loading receipts:', error);
      Alert.alert('Error', 'Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  const filterReceipts = () => {
    if (!searchQuery.trim()) {
      setFilteredReceipts(receipts);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = receipts.filter(
      (receipt) =>
        receipt.reference?.toLowerCase().includes(query) ||
        receipt.contact?.toLowerCase().includes(query) ||
        receipt.receiveFrom?.toLowerCase().includes(query)
    );
    setFilteredReceipts(filtered);
  };

  const handleNewReceipt = () => {
    setSelectedReceipt(null);
    setShowForm(true);
  };

  const handleEditReceipt = (receipt) => {
    setSelectedReceipt(receipt);
    setShowForm(true);
  };

  const handleDeleteReceipt = (receipt) => {
    Alert.alert(
      'Delete Receipt',
      `Are you sure you want to delete receipt "${receipt.reference}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReceipt(user.id, receipt.id);
              Alert.alert('Success', 'Receipt deleted successfully');
              loadReceipts();
            } catch (error) {
              console.error('Error deleting receipt:', error);
              Alert.alert('Error', 'Failed to delete receipt');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'draft':
        return '#FFA500';
      case 'ready':
        return '#4CAF50';
      case 'done':
        return '#2196F3';
      default:
        return 'rgba(255, 255, 255, 0.5)';
    }
  };

  const renderListView = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.table}>
        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.colReference]}>Reference</Text>
          <Text style={[styles.tableHeaderText, styles.colFrom]}>From</Text>
          <Text style={[styles.tableHeaderText, styles.colTo]}>To</Text>
          <Text style={[styles.tableHeaderText, styles.colContact]}>Contact</Text>
          <Text style={[styles.tableHeaderText, styles.colDate]}>Schedule Date</Text>
          <Text style={[styles.tableHeaderText, styles.colStatus]}>Status</Text>
          <Text style={[styles.tableHeaderText, styles.colActions]}>Actions</Text>
        </View>

        {/* Table Rows */}
        {filteredReceipts.map((receipt) => (
          <TouchableOpacity
            key={receipt.id}
            style={styles.tableRow}
            onPress={() => handleEditReceipt(receipt)}
          >
            <View style={[styles.tableCell, styles.colReference]}>
              <Text style={styles.cellText}>{receipt.reference || 'N/A'}</Text>
            </View>
            <View style={[styles.tableCell, styles.colFrom]}>
              <Text style={styles.cellText}>{receipt.receiveFrom || 'N/A'}</Text>
            </View>
            <View style={[styles.tableCell, styles.colTo]}>
              <Text style={styles.cellText}>{receipt.toLocation || 'N/A'}</Text>
            </View>
            <View style={[styles.tableCell, styles.colContact]}>
              <Text style={styles.cellText}>{receipt.contact || 'N/A'}</Text>
            </View>
            <View style={[styles.tableCell, styles.colDate]}>
              <Text style={styles.cellText}>
                {receipt.scheduledDate
                  ? new Date(receipt.scheduledDate).toLocaleDateString()
                  : 'N/A'}
              </Text>
            </View>
            <View style={[styles.tableCell, styles.colStatus]}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(receipt.status) + '20' },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(receipt.status) },
                  ]}
                >
                  {receipt.status || 'draft'}
                </Text>
              </View>
            </View>
            <View style={[styles.tableCell, styles.colActions]}>
              <TouchableOpacity
                onPress={() => handleEditReceipt(receipt)}
                style={styles.actionButton}
              >
                <Text style={styles.actionButtonText}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteReceipt(receipt)}
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

  const renderKanbanView = () => {
    const statusGroups = {
      draft: filteredReceipts.filter((r) => r.status?.toLowerCase() === 'draft'),
      ready: filteredReceipts.filter((r) => r.status?.toLowerCase() === 'ready'),
      done: filteredReceipts.filter((r) => r.status?.toLowerCase() === 'done'),
    };

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.kanbanContainer}>
        {Object.entries(statusGroups).map(([status, items]) => (
          <View key={status} style={styles.kanbanColumn}>
            <View style={[styles.kanbanHeader, { borderLeftColor: getStatusColor(status) }]}>
              <Text style={styles.kanbanTitle}>{status.toUpperCase()}</Text>
              <Text style={styles.kanbanCount}>({items.length})</Text>
            </View>
            <ScrollView style={styles.kanbanCards}>
              {items.map((receipt) => (
                <TouchableOpacity
                  key={receipt.id}
                  style={styles.kanbanCard}
                  onPress={() => handleEditReceipt(receipt)}
                >
                  <Text style={styles.kanbanCardReference}>{receipt.reference}</Text>
                  <Text style={styles.kanbanCardText}>From: {receipt.receiveFrom}</Text>
                  <Text style={styles.kanbanCardText}>To: {receipt.toLocation || 'N/A'}</Text>
                  {receipt.scheduledDate && (
                    <Text style={styles.kanbanCardDate}>
                      {new Date(receipt.scheduledDate).toLocaleDateString()}
                    </Text>
                  )}
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
      <ReceiptFormScreen
        receipt={selectedReceipt}
        user={user}
        onClose={() => {
          setShowForm(false);
          setSelectedReceipt(null);
          loadReceipts();
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Dark Card Container */}
          <View style={styles.card}>
            {/* Wavy Header with Gradient */}
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
                <Text style={styles.title}>Receipts</Text>
                <View style={styles.headerActions}>
                  <TouchableOpacity
                    onPress={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')}
                    style={styles.viewToggleButton}
                  >
                    <Text style={styles.viewToggleText}>
                      {viewMode === 'list' ? '📋' : '📊'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleNewReceipt} style={styles.addButton}>
                    <LinearGradient
                      colors={['#FF6B9D', '#C44569', '#F8B500']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.addButtonGradient}
                    >
                      <Text style={styles.addButtonText}>NEW</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Form Content */}
            <View style={styles.formContent}>
              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by reference or contact..."
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    style={styles.clearButton}
                  >
                    <Text style={styles.clearButtonText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Receipts List or Kanban */}
              {loading ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>Loading receipts...</Text>
                </View>
              ) : filteredReceipts.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'No receipts found' : 'No receipts available'}
                  </Text>
                  {!searchQuery && (
                    <TouchableOpacity onPress={handleNewReceipt} style={styles.addFirstButton}>
                      <Text style={styles.addFirstButtonText}>Create Your First Receipt</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : viewMode === 'list' ? (
                renderListView()
              ) : (
                renderKanbanView()
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1625',
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
  headerActions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  viewToggleButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  viewToggleText: {
    fontSize: 20,
  },
  addButton: {
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 4 },
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
  table: {
    minWidth: 800,
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
    fontSize: 13,
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
    minHeight: 60,
  },
  tableCell: {
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  colReference: {
    width: 140,
  },
  colFrom: {
    width: 120,
  },
  colTo: {
    width: 120,
  },
  colContact: {
    width: 140,
  },
  colDate: {
    width: 130,
  },
  colStatus: {
    width: 100,
    alignItems: 'center',
  },
  colActions: {
    width: 120,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  cellText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'center',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  actionButton: {
    width: 40,
    height: 40,
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
    fontSize: 18,
  },
  kanbanContainer: {
    flexDirection: 'row',
    paddingBottom: 20,
  },
  kanbanColumn: {
    width: 280,
    marginRight: 15,
    backgroundColor: '#1A1625',
    borderRadius: 12,
    overflow: 'hidden',
  },
  kanbanHeader: {
    padding: 15,
    borderLeftWidth: 4,
    backgroundColor: '#2C243B',
  },
  kanbanTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  kanbanCount: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  kanbanCards: {
    maxHeight: 500,
  },
  kanbanCard: {
    backgroundColor: '#2C243B',
    padding: 15,
    margin: 10,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B9D',
  },
  kanbanCardReference: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FF6B9D',
    marginBottom: 8,
  },
  kanbanCardText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  kanbanCardDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 8,
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
});

