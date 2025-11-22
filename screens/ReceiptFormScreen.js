import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import {
  createReceipt,
  updateReceipt,
  getReceiptById,
  updateReceiptStatus,
  generateReceiptReference,
  getWarehouses,
  getLocations,
  getInventoryItems,
} from '../database/db';
import {
  generateReceiptPDF,
  generateAndSavePDF,
  sharePDF,
  printPDF,
} from '../utils/pdfGenerator';

export default function ReceiptFormScreen({ receipt, user, onClose }) {
  const [formData, setFormData] = useState({
    reference: '',
    receiveFrom: '',
    responsible: user?.loginId || '',
    scheduledDate: '',
    toLocation: '',
    contact: '',
    notes: '',
  });
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('draft');
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [currentProductIndex, setCurrentProductIndex] = useState(null);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [pdfUri, setPdfUri] = useState(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useEffect(() => {
    loadData();
    if (receipt) {
      loadReceiptData();
    } else {
      generateReference();
    }
  }, []);

  const loadData = async () => {
    try {
      const [warehousesData, locationsData, inventoryData] = await Promise.all([
        getWarehouses(user.id),
        getLocations(user.id),
        getInventoryItems(user.id),
      ]);
      setWarehouses(warehousesData || []);
      setLocations(locationsData || []);
      setInventory(inventoryData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadReceiptData = async () => {
    try {
      const receiptData = await getReceiptById(user.id, receipt.id);
      if (receiptData) {
        setFormData({
          reference: receiptData.reference || '',
          receiveFrom: receiptData.receiveFrom || '',
          responsible: receiptData.responsible || user?.loginId || '',
          scheduledDate: receiptData.scheduledDate || '',
          toLocation: receiptData.toLocation || '',
          contact: receiptData.contact || '',
          notes: receiptData.notes || '',
        });
        setStatus(receiptData.status || 'draft');
        setItems(receiptData.items || []);
      }
    } catch (error) {
      console.error('Error loading receipt:', error);
      Alert.alert('Error', 'Failed to load receipt data');
    }
  };

  const generateReference = async () => {
    try {
      const warehousesData = await getWarehouses(user.id);
      const warehouseCode = warehousesData.length > 0 ? warehousesData[0].shortCode : 'WH1';
      const ref = await generateReceiptReference(user.id, warehouseCode);
      setFormData((prev) => ({ ...prev, reference: ref }));
    } catch (error) {
      console.error('Error generating reference:', error);
    }
  };

  const addProductLine = () => {
    setItems([
      ...items,
      {
        id: Date.now(),
        productName: '',
        productCode: '',
        quantity: '',
        unitPrice: '',
      },
    ]);
  };

  const removeProductLine = (id) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateProductLine = (id, field, value) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          // Auto-fill product name if product code matches inventory
          if (field === 'productCode' && value) {
            const inventoryItem = inventory.find(
              (inv) => inv.productCode?.toUpperCase() === value.toUpperCase()
            );
            if (inventoryItem) {
              updated.productName = inventoryItem.productName;
              updated.unitPrice = inventoryItem.unitPrice?.toString() || '';
            }
          }
          return updated;
        }
        return item;
      })
    );
  };

  const handleDateChange = (year, month, day) => {
    const date = new Date(year, month - 1, day);
    setSelectedDate(date);
    const dateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    setFormData({
      ...formData,
      scheduledDate: dateString,
    });
    setShowDatePicker(false);
  };

  const openDatePicker = () => {
    if (formData.scheduledDate) {
      const [year, month, day] = formData.scheduledDate.split('-');
      setSelectedDate(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
    }
    setShowDatePicker(true);
  };

  const openProductPicker = (index) => {
    setCurrentProductIndex(index);
    setProductSearchQuery('');
    setShowProductPicker(true);
  };

  const selectProduct = (inventoryItem) => {
    if (currentProductIndex !== null && inventoryItem) {
      const item = items[currentProductIndex];
      // Update all fields at once to avoid state update issues
      setItems(
        items.map((it, idx) => {
          if (idx === currentProductIndex) {
            return {
              ...it,
              productCode: inventoryItem.productCode || '',
              productName: inventoryItem.productName || '',
              unitPrice: inventoryItem.unitPrice?.toString() || '0',
            };
          }
          return it;
        })
      );
    }
    setShowProductPicker(false);
    setCurrentProductIndex(null);
  };

  const getFilteredProducts = () => {
    if (!productSearchQuery.trim()) {
      return inventory;
    }
    const query = productSearchQuery.toLowerCase();
    return inventory.filter(
      (item) =>
        item.productName?.toLowerCase().includes(query) ||
        item.productCode?.toLowerCase().includes(query)
    );
  };

  const handleSave = async () => {
    if (!formData.receiveFrom.trim()) {
      Alert.alert('Error', 'Please enter "Receive From"');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Error', 'Please add at least one product');
      return;
    }

    // Validate items
    for (const item of items) {
      if (!item.productName || !item.productName.trim()) {
        Alert.alert('Error', 'Please select a product for all items. Tap "Select Product from Stock" to choose a product.');
        return;
      }
      if (!item.quantity || parseFloat(item.quantity) <= 0) {
        Alert.alert('Error', 'Please enter valid quantity for all items');
        return;
      }
    }

    try {
      setLoading(true);
      const receiptData = {
        ...formData,
        status,
        items: items.map((item) => ({
          productName: item.productName.trim(),
          productCode: item.productCode.trim() || null,
          quantity: parseInt(item.quantity) || 0,
          unitPrice: parseFloat(item.unitPrice) || 0,
        })),
      };

      if (receipt) {
        await updateReceipt(user.id, receipt.id, receiptData);
        Alert.alert('Success', 'Receipt updated successfully');
      } else {
        await createReceipt(user.id, receiptData);
        Alert.alert('Success', 'Receipt created successfully');
      }
      onClose();
    } catch (error) {
      console.error('Error saving receipt:', error);
      Alert.alert('Error', error.message || 'Failed to save receipt');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!receipt) {
      Alert.alert('Error', 'Please save the receipt first');
      return;
    }

    try {
      setLoading(true);
      await updateReceiptStatus(user.id, receipt.id, newStatus);
      setStatus(newStatus);
      Alert.alert('Success', `Receipt status changed to ${newStatus}`);
      if (newStatus === 'done') {
        Alert.alert(
          'Stock Updated',
          'Items have been added to your inventory!',
          [{ text: 'OK', onPress: onClose }]
        );
      }
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    // Validate that we have minimum required data
    if (!formData.reference || items.length === 0) {
      Alert.alert('Error', 'Please ensure the receipt has a reference and at least one product before printing');
      return;
    }

    try {
      setGeneratingPDF(true);
      
      // Prepare receipt data for PDF (use current form data)
      const receiptData = {
        reference: formData.reference,
        receiveFrom: formData.receiveFrom || 'N/A',
        responsible: formData.responsible || user?.loginId || 'N/A',
        scheduledDate: formData.scheduledDate,
        toLocation: formData.toLocation || 'N/A',
        contact: formData.contact || 'N/A',
        status: status,
        notes: formData.notes || '',
      };

      // Generate PDF HTML
      const html = generateReceiptPDF(receiptData, items);
      
      // Generate and save PDF
      const filename = `Receipt_${receiptData.reference.replace(/\//g, '_')}_${Date.now()}.pdf`;
      const uri = await generateAndSavePDF(html, filename);
      
      setPdfUri(uri);
      setShowPDFModal(true);
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleDownloadPDF = () => {
    Alert.alert('Download', 'PDF has been saved to your device');
    setShowPDFModal(false);
  };

  const handleSharePDF = async () => {
    try {
      if (!pdfUri) return;
      await sharePDF(pdfUri);
    } catch (error) {
      console.error('Error sharing PDF:', error);
      Alert.alert('Error', 'Failed to share PDF');
    }
  };

  const handlePrintPDF = async () => {
    try {
      if (!pdfUri) return;
      await printPDF(pdfUri);
    } catch (error) {
      console.error('Error printing PDF:', error);
      Alert.alert('Error', 'Failed to print PDF');
    }
  };

  const getStatusButtons = () => {
    if (status === 'draft') {
      return (
        <TouchableOpacity
          onPress={() => handleStatusChange('ready')}
          style={styles.statusButton}
        >
          <LinearGradient
            colors={['#4CAF50', '#45a049']}
            style={styles.statusButtonGradient}
          >
            <Text style={styles.statusButtonText}>Move to Ready</Text>
          </LinearGradient>
        </TouchableOpacity>
      );
    } else if (status === 'ready') {
      return (
        <TouchableOpacity
          onPress={() => handleStatusChange('done')}
          style={styles.statusButton}
        >
          <LinearGradient
            colors={['#2196F3', '#1976D2']}
            style={styles.statusButtonGradient}
          >
            <Text style={styles.statusButtonText}>Validate / Mark as Done</Text>
          </LinearGradient>
        </TouchableOpacity>
      );
    } else if (status === 'done') {
      return (
        <TouchableOpacity onPress={handlePrint} style={styles.statusButton}>
          <LinearGradient
            colors={['#FF6B9D', '#C44569']}
            style={styles.statusButtonGradient}
          >
            <Text style={styles.statusButtonText}>Print</Text>
          </LinearGradient>
        </TouchableOpacity>
      );
    }
    return null;
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
            <View style={styles.card}>
              {/* Wavy Header */}
              <View style={styles.wavyHeader}>
                <LinearGradient
                  colors={['#9D50BB', '#6E48AA', '#8B5FBF']}
                  style={styles.waveGradient}
                >
                  <Svg height="100" width="100%" viewBox="0 0 400 100" style={styles.waveSvg}>
                    <Path
                      d="M0,40 Q100,10 200,40 T400,40 L400,0 L0,0 Z"
                      fill="rgba(255, 255, 255, 0.1)"
                    />
                  </Svg>
                </LinearGradient>
                <View style={styles.headerContent}>
                  <Text style={styles.title}>
                    {receipt ? 'Edit Receipt' : 'New Receipt'}
                  </Text>
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Form Content */}
              <View style={styles.formContent}>
                {/* Status Flow Indicator */}
                <View style={styles.statusFlow}>
                  <View style={[styles.statusStep, status === 'draft' && styles.statusStepActive]}>
                    <Text style={styles.statusStepText}>Draft</Text>
                  </View>
                  <View style={styles.statusArrow}>
                    <Text style={styles.statusArrowText}>→</Text>
                  </View>
                  <View style={[styles.statusStep, status === 'ready' && styles.statusStepActive]}>
                    <Text style={styles.statusStepText}>Ready</Text>
                  </View>
                  <View style={styles.statusArrow}>
                    <Text style={styles.statusArrowText}>→</Text>
                  </View>
                  <View style={[styles.statusStep, status === 'done' && styles.statusStepActive]}>
                    <Text style={styles.statusStepText}>Done</Text>
                  </View>
                </View>

                {/* Reference (Read-only) */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Reference</Text>
                  <TextInput
                    style={[styles.input, styles.readOnlyInput]}
                    value={formData.reference}
                    editable={false}
                    placeholder="Auto-generated"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  />
                  <View style={styles.underline} />
                </View>

                {/* Receive From */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Receive From *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter vendor/supplier name"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={formData.receiveFrom}
                    onChangeText={(text) =>
                      setFormData({ ...formData, receiveFrom: text })
                    }
                  />
                  <View style={styles.underline} />
                </View>

                {/* Responsible (Auto-filled) */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Responsible</Text>
                  <TextInput
                    style={[styles.input, styles.readOnlyInput]}
                    value={formData.responsible}
                    editable={false}
                    placeholder="Auto-filled with logged in user"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  />
                  <View style={styles.underline} />
                </View>

                {/* Scheduled Date with Calendar */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Scheduled Date</Text>
                  <TouchableOpacity
                    onPress={openDatePicker}
                    style={styles.datePickerButton}
                  >
                    <Text
                      style={[
                        styles.datePickerText,
                        !formData.scheduledDate && styles.datePickerPlaceholder,
                      ]}
                    >
                      {formData.scheduledDate
                        ? new Date(formData.scheduledDate).toLocaleDateString()
                        : 'Select Date 📅'}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.underline} />
                </View>

                {/* To Location */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>To (Location)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter location or warehouse"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={formData.toLocation}
                    onChangeText={(text) =>
                      setFormData({ ...formData, toLocation: text })
                    }
                  />
                  <View style={styles.underline} />
                </View>

                {/* Contact */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Contact</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter contact information"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={formData.contact}
                    onChangeText={(text) =>
                      setFormData({ ...formData, contact: text })
                    }
                  />
                  <View style={styles.underline} />
                </View>

                {/* Products Section */}
                <View style={styles.inputGroup}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.inputLabel}>Products *</Text>
                    <TouchableOpacity onPress={addProductLine} style={styles.addProductButton}>
                      <Text style={styles.addProductButtonText}>+ Add Product Line</Text>
                    </TouchableOpacity>
                  </View>

                  {items.map((item, index) => {
                    const inventoryItem = item.productCode
                      ? inventory.find(
                          (inv) =>
                            inv.productCode?.toUpperCase() === item.productCode.toUpperCase()
                        )
                      : null;
                    const stockAvailable = inventoryItem ? inventoryItem.quantity || 0 : null;

                    return (
                      <View key={item.id} style={styles.productLine}>
                        <View style={styles.productLineHeader}>
                          <Text style={styles.productLineNumber}>Product {index + 1}</Text>
                          {items.length > 1 && (
                            <TouchableOpacity
                              onPress={() => removeProductLine(item.id)}
                              style={styles.removeProductButton}
                            >
                              <Text style={styles.removeProductButtonText}>✕</Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        {/* Product Selection Button */}
                        <TouchableOpacity
                          onPress={() => openProductPicker(index)}
                          style={styles.selectProductButton}
                        >
                          <Text style={styles.selectProductButtonText}>
                            {item.productName
                              ? `📦 ${item.productName}${item.productCode ? ` (${item.productCode})` : ''}`
                              : 'Select Product from Stock 📦'}
                          </Text>
                        </TouchableOpacity>

                        {/* Stock Availability Indicator */}
                        {stockAvailable !== null && (
                          <View
                            style={[
                              styles.stockIndicator,
                              stockAvailable > 0
                                ? styles.stockAvailable
                                : styles.stockUnavailable,
                            ]}
                          >
                            <Text style={styles.stockText}>
                              {stockAvailable > 0
                                ? `✓ Stock Available: ${stockAvailable} units`
                                : '⚠ No Stock Available'}
                            </Text>
                          </View>
                        )}

                        {!item.productName && (
                          <Text style={styles.hintText}>
                            Tap above to select a product from your inventory
                          </Text>
                        )}

                        <View style={styles.productRow}>
                          <TextInput
                            style={[styles.productInput, styles.productInputHalf]}
                            placeholder="Quantity *"
                            placeholderTextColor="rgba(255, 255, 255, 0.4)"
                            value={item.quantity}
                            onChangeText={(text) =>
                              updateProductLine(item.id, 'quantity', text.replace(/[^0-9]/g, ''))
                            }
                            keyboardType="number-pad"
                          />
                          <TextInput
                            style={[styles.productInput, styles.productInputHalf]}
                            placeholder="Unit Price"
                            placeholderTextColor="rgba(255, 255, 255, 0.4)"
                            value={item.unitPrice}
                            onChangeText={(text) =>
                              updateProductLine(
                                item.id,
                                'unitPrice',
                                text.replace(/[^0-9.]/g, '')
                              )
                            }
                            keyboardType="decimal-pad"
                          />
                        </View>
                      </View>
                    );
                  })}

                  {items.length === 0 && (
                    <TouchableOpacity onPress={addProductLine} style={styles.addFirstProduct}>
                      <Text style={styles.addFirstProductText}>+ Add Your First Product</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Notes */}
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

                {/* Status Buttons */}
                {getStatusButtons()}

                {/* Save Button */}
                <TouchableOpacity
                  onPress={handleSave}
                  style={styles.saveButton}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#FF6B9D', '#C44569', '#F8B500']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.saveButtonGradient}
                  >
                    <Text style={styles.saveButtonText}>
                      {loading ? 'Saving...' : receipt ? 'Update Receipt' : 'Create Receipt'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Product Picker Modal */}
      <Modal
        visible={showProductPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProductPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Product from Stock</Text>
              <TouchableOpacity
                onPress={() => setShowProductPicker(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.modalSearchContainer}>
              <Text style={styles.modalSearchIcon}>🔍</Text>
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search products..."
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={productSearchQuery}
                onChangeText={setProductSearchQuery}
              />
            </View>

            {/* Product List */}
            <ScrollView style={styles.modalProductList}>
              {getFilteredProducts().length === 0 ? (
                <View style={styles.modalEmptyState}>
                  <Text style={styles.modalEmptyText}>
                    {inventory.length === 0
                      ? 'No products in inventory. Add products in Stock page first.'
                      : 'No products found'}
                  </Text>
                </View>
              ) : (
                getFilteredProducts().map((inventoryItem) => (
                  <TouchableOpacity
                    key={inventoryItem.id}
                    style={styles.modalProductItem}
                    onPress={() => selectProduct(inventoryItem)}
                  >
                    <View style={styles.modalProductInfo}>
                      <Text style={styles.modalProductName}>
                        {inventoryItem.productName}
                      </Text>
                      {inventoryItem.productCode && (
                        <Text style={styles.modalProductCode}>
                          Code: {inventoryItem.productCode}
                        </Text>
                      )}
                      <View
                        style={[
                          styles.modalStockBadge,
                          (inventoryItem.quantity || 0) > 0
                            ? styles.modalStockBadgeAvailable
                            : styles.modalStockBadgeUnavailable,
                        ]}
                      >
                        <Text style={styles.modalStockBadgeText}>
                          Stock: {inventoryItem.quantity || 0} units
                        </Text>
                      </View>
                    </View>
                    {inventoryItem.unitPrice && (
                      <Text style={styles.modalProductPrice}>
                        ₹{inventoryItem.unitPrice.toFixed(2)}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal - Sliding Window */}
      <Modal
        visible={showDatePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.datePickerModalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Scheduled Date</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <DatePickerComponent
              selectedDate={selectedDate}
              onDateSelect={handleDateChange}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* PDF Options Modal */}
      <Modal
        visible={showPDFModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPDFModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pdfModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>PDF Generated</Text>
              <TouchableOpacity
                onPress={() => setShowPDFModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pdfModalBody}>
              <Text style={styles.pdfModalText}>
                Your receipt PDF has been generated successfully!
              </Text>
              
              <View style={styles.pdfOptionsContainer}>
                <TouchableOpacity
                  onPress={handleDownloadPDF}
                  style={styles.pdfOptionButton}
                >
                  <LinearGradient
                    colors={['#4ECDC4', '#44A08D']}
                    style={styles.pdfOptionGradient}
                  >
                    <Text style={styles.pdfOptionText}>📥 Download PDF</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handlePrintPDF}
                  style={styles.pdfOptionButton}
                >
                  <LinearGradient
                    colors={['#FF6B9D', '#C44569']}
                    style={styles.pdfOptionGradient}
                  >
                    <Text style={styles.pdfOptionText}>🖨️ Print</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSharePDF}
                  style={styles.pdfOptionButton}
                >
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.pdfOptionGradient}
                  >
                    <Text style={styles.pdfOptionText}>📤 Share</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Loading Modal for PDF Generation */}
      <Modal
        visible={generatingPDF}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.loadingModalOverlay}>
          <View style={styles.loadingModalContent}>
            <ActivityIndicator size="large" color="#FF6B9D" />
            <Text style={styles.loadingModalText}>Generating PDF...</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Enhanced Calendar Component
function DatePickerComponent({ selectedDate, onDateSelect }) {
  const currentDate = selectedDate || new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(currentDate.getDate());

  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthShort = months[month - 1].substring(0, 3);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  
  // Day names
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Generate calendar days
  const calendarDays = [];
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  // Add all days of the month
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }

  const handleDaySelect = (day) => {
    if (day !== null) {
      setSelectedDay(day);
      // Immediately confirm the date when a day is selected
      onDateSelect(year, month, day);
    }
  };

  const handleConfirm = () => {
    onDateSelect(year, month, selectedDay);
  };

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
    setSelectedDay(1);
  };

  const isToday = (day) => {
    return day === todayDay && month === todayMonth && year === todayYear;
  };

  const isSelected = (day) => {
    return day === selectedDay;
  };

  return (
    <View style={styles.calendarWrapper}>
      <ScrollView 
        style={styles.calendarScrollView} 
        contentContainerStyle={styles.calendarContainer}
        showsVerticalScrollIndicator={true}
      >
        {/* Month/Year Header */}
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.calendarNavButton}>
            <Text style={styles.calendarNavText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.calendarMonthYear}>
            <Text style={styles.calendarMonthText}>{monthShort}</Text>
            <Text style={styles.calendarYearText}>{year}</Text>
          </View>
          <TouchableOpacity onPress={handleNextMonth} style={styles.calendarNavButton}>
            <Text style={styles.calendarNavText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Day Names Row */}
        <View style={styles.calendarDayNames}>
          {dayNames.map((dayName, index) => (
            <View key={index} style={styles.calendarDayNameCell}>
              <Text style={styles.calendarDayNameText}>{dayName}</Text>
            </View>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <View key={`empty-${index}`} style={styles.calendarDayCell} />;
            }
            const isTodayDate = isToday(day);
            const isSelectedDate = isSelected(day);
            return (
              <TouchableOpacity
                key={`day-${day}-${index}`}
                style={[
                  styles.calendarDayCell,
                  isTodayDate && styles.calendarDayToday,
                  isSelectedDate && styles.calendarDaySelected,
                ]}
                onPress={() => handleDaySelect(day)}
                activeOpacity={0.6}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text
                  style={[
                    styles.calendarDayText,
                    isTodayDate && styles.calendarDayTextToday,
                    isSelectedDate && styles.calendarDayTextSelected,
                  ]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Date Display */}
        <View style={styles.calendarSelectedDate}>
          <Text style={styles.calendarSelectedDateLabel}>Selected Date:</Text>
          <Text style={styles.calendarSelectedDateValue}>
            {new Date(year, month - 1, selectedDay).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>

        {/* Confirm Button (Optional - for manual confirmation) */}
        <TouchableOpacity onPress={handleConfirm} style={styles.datePickerConfirmButton}>
          <LinearGradient
            colors={['#FF6B9D', '#C44569']}
            style={styles.datePickerConfirmGradient}
          >
            <Text style={styles.datePickerConfirmText}>Confirm Date</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
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
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  formContent: {
    padding: 20,
    flex: 1,
  },
  statusFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    paddingVertical: 15,
    backgroundColor: '#1A1625',
    borderRadius: 12,
  },
  statusStep: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusStepActive: {
    backgroundColor: '#FF6B9D',
  },
  statusStepText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
    fontSize: 14,
  },
  statusArrow: {
    marginHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusArrowText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 18,
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
  readOnlyInput: {
    color: 'rgba(255, 255, 255, 0.6)',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  addProductButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 157, 0.2)',
    borderWidth: 1,
    borderColor: '#FF6B9D',
  },
  addProductButtonText: {
    color: '#FF6B9D',
    fontSize: 13,
    fontWeight: '600',
  },
  productLine: {
    backgroundColor: '#1A1625',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B9D',
  },
  productLineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  productLineNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B9D',
  },
  removeProductButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeProductButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: 'bold',
  },
  productInput: {
    fontSize: 16,
    color: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 0,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  productRow: {
    flexDirection: 'row',
    gap: 15,
  },
  productInputHalf: {
    flex: 1,
  },
  addFirstProduct: {
    padding: 20,
    borderRadius: 10,
    backgroundColor: '#1A1625',
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 157, 0.3)',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addFirstProductText: {
    color: '#FF6B9D',
    fontSize: 14,
    fontWeight: '600',
  },
  statusButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  statusButtonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 30,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 8 },
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
  },
  datePickerButton: {
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  datePickerText: {
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  datePickerPlaceholder: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  selectProductButton: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 157, 0.2)',
    borderWidth: 1,
    borderColor: '#FF6B9D',
    marginBottom: 10,
  },
  selectProductButtonText: {
    color: '#FF6B9D',
    fontSize: 15,
    fontWeight: '600',
  },
  stockIndicator: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  stockAvailable: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  stockUnavailable: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  stockText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  hintText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 5,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#2C243B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
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
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1625',
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalSearchIcon: {
    fontSize: 20,
    marginRight: 10,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    paddingVertical: 12,
  },
  modalProductList: {
    maxHeight: 400,
  },
  modalEmptyState: {
    padding: 40,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
  modalProductItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 10,
    backgroundColor: '#1A1625',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B9D',
  },
  modalProductInfo: {
    flex: 1,
  },
  modalProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  modalProductCode: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 6,
  },
  modalStockBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  modalStockBadgeAvailable: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  modalStockBadgeUnavailable: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
  },
  modalStockBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalProductPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B9D',
  },
  datePickerModalContent: {
    backgroundColor: '#2C243B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    width: '100%',
    minHeight: 500,
  },
  calendarWrapper: {
    flex: 1,
    minHeight: 450,
  },
  calendarScrollView: {
    flex: 1,
  },
  calendarContainer: {
    padding: 20,
    paddingBottom: 30,
    minHeight: 450,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 10,
  },
  calendarNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 157, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarNavText: {
    fontSize: 24,
    color: '#FF6B9D',
    fontWeight: 'bold',
  },
  calendarMonthYear: {
    alignItems: 'center',
  },
  calendarMonthText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  calendarYearText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  calendarDayNames: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  calendarDayNameCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  calendarDayNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  calendarDayCell: {
    width: '14.28%',
    minHeight: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 3,
    paddingVertical: 10,
    borderRadius: 8,
  },
  calendarDayText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  calendarDayToday: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFC107',
  },
  calendarDayTextToday: {
    color: '#FFC107',
    fontWeight: 'bold',
  },
  calendarDaySelected: {
    backgroundColor: '#FF6B9D',
    borderRadius: 8,
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  calendarSelectedDate: {
    backgroundColor: '#1A1625',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 157, 0.3)',
  },
  calendarSelectedDateLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  calendarSelectedDateValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  datePickerConfirmButton: {
    borderRadius: 15,
    overflow: 'hidden',
    marginTop: 10,
  },
  datePickerConfirmGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pdfModalContent: {
    backgroundColor: '#2C243B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
  },
  pdfModalBody: {
    padding: 20,
  },
  pdfModalText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 30,
  },
  pdfOptionsContainer: {
    gap: 15,
  },
  pdfOptionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  pdfOptionGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfOptionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingModalContent: {
    backgroundColor: '#2C243B',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    minWidth: 200,
  },
  loadingModalText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 15,
    fontWeight: '500',
  },
});

