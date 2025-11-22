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
  createDelivery,
  updateDelivery,
  getDeliveryById,
  updateDeliveryStatus,
  generateDeliveryReference,
  getWarehouses,
  getLocations,
  getInventoryItems,
  getInventoryItemByCode,
} from '../database/db';
import {
  generateDeliveryPDF,
  generateAndSavePDF,
  sharePDF,
  printPDF,
} from '../utils/pdfGenerator';

export default function DeliveryFormScreen({ delivery, user, onClose }) {
  const [formData, setFormData] = useState({
    reference: '',
    deliveryAddress: '',
    responsible: user?.loginId || '',
    scheduledDate: '',
    operationType: '',
    fromLocation: '',
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
  const [stockErrors, setStockErrors] = useState({}); // Track items with insufficient stock
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [pdfUri, setPdfUri] = useState(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const operationTypes = ['Pickup', 'Delivery', 'Transfer', 'Return'];

  useEffect(() => {
    loadData();
    if (delivery) {
      loadDeliveryData();
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

  const loadDeliveryData = async () => {
    try {
      const deliveryData = await getDeliveryById(user.id, delivery.id);
      if (deliveryData) {
        setFormData({
          reference: deliveryData.reference || '',
          deliveryAddress: deliveryData.deliveryAddress || '',
          responsible: deliveryData.responsible || user?.loginId || '',
          scheduledDate: deliveryData.scheduledDate || '',
          operationType: deliveryData.operationType || '',
          fromLocation: deliveryData.fromLocation || '',
          toLocation: deliveryData.toLocation || '',
          contact: deliveryData.contact || '',
          notes: deliveryData.notes || '',
        });
        setStatus(deliveryData.status || 'draft');
        setItems(deliveryData.items || []);
        // Check stock for existing items
        checkStockForAllItems(deliveryData.items || []);
      }
    } catch (error) {
      console.error('Error loading delivery:', error);
      Alert.alert('Error', 'Failed to load delivery data');
    }
  };

  const generateReference = async () => {
    try {
      const warehousesData = await getWarehouses(user.id);
      const warehouseCode = warehousesData.length > 0 ? warehousesData[0].shortCode : 'WH1';
      const ref = await generateDeliveryReference(user.id, warehouseCode);
      setFormData((prev) => ({ ...prev, reference: ref }));
    } catch (error) {
      console.error('Error generating reference:', error);
    }
  };

  // Check stock availability for all items
  const checkStockForAllItems = async (itemsToCheck) => {
    const errors = {};
    for (let i = 0; i < itemsToCheck.length; i++) {
      const item = itemsToCheck[i];
      if (item.productCode && item.quantity) {
        const inventoryItem = await getInventoryItemByCode(user.id, item.productCode);
        if (!inventoryItem || inventoryItem.quantity < item.quantity) {
          errors[i] = true;
        }
      }
    }
    setStockErrors(errors);
  };

  // Check stock for a single item
  const checkStockForItem = async (index, productCode, quantity) => {
    if (!productCode || !quantity) {
      const newErrors = { ...stockErrors };
      delete newErrors[index];
      setStockErrors(newErrors);
      return;
    }

    try {
      const inventoryItem = await getInventoryItemByCode(user.id, productCode);
      const availableStock = inventoryItem ? inventoryItem.quantity : 0;

      if (availableStock < quantity) {
        const newErrors = { ...stockErrors };
        newErrors[index] = true;
        setStockErrors(newErrors);
        Alert.alert(
          'Insufficient Stock',
          `Only ${availableStock} units available for ${inventoryItem?.productName || productCode}. Required: ${quantity}`,
          [{ text: 'OK' }]
        );
      } else {
        const newErrors = { ...stockErrors };
        delete newErrors[index];
        setStockErrors(newErrors);
      }
    } catch (error) {
      console.error('Error checking stock:', error);
    }
  };

  const handleDateChange = (year, month, day) => {
    const date = new Date(year, month - 1, day);
    const dateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    setFormData((prev) => ({ ...prev, scheduledDate: dateString }));
    setSelectedDate(date);
    setShowDatePicker(false);
  };

  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  const openProductPicker = (index) => {
    setCurrentProductIndex(index);
    setProductSearchQuery('');
    setShowProductPicker(true);
  };

  const getFilteredProducts = () => {
    if (!productSearchQuery) return inventory;
    const query = productSearchQuery.toLowerCase();
    return inventory.filter(
      (item) =>
        item.productName?.toLowerCase().includes(query) ||
        item.productCode?.toLowerCase().includes(query)
    );
  };

  const selectProduct = (product) => {
    if (currentProductIndex === null) {
      // Add new item
      const newItem = {
        productCode: product.productCode,
        productName: product.productName,
        quantity: '',
        unitPrice: product.unitPrice || 0,
      };
      setItems([...items, newItem]);
    } else {
      // Update existing item
      const updatedItems = [...items];
      updatedItems[currentProductIndex] = {
        ...updatedItems[currentProductIndex],
        productCode: product.productCode,
        productName: product.productName,
        unitPrice: product.unitPrice || 0,
      };
      setItems(updatedItems);
      // Check stock for this item
      if (updatedItems[currentProductIndex].quantity) {
        checkStockForItem(
          currentProductIndex,
          product.productCode,
          parseInt(updatedItems[currentProductIndex].quantity) || 0
        );
      }
    }
    setShowProductPicker(false);
    setCurrentProductIndex(null);
  };

  const addProductLine = () => {
    setItems([...items, { productCode: '', productName: '', quantity: '', unitPrice: 0 }]);
  };

  const removeProductLine = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    const newErrors = { ...stockErrors };
    delete newErrors[index];
    // Reindex remaining errors
    const reindexedErrors = {};
    Object.keys(newErrors).forEach((key) => {
      const keyNum = parseInt(key);
      if (keyNum > index) {
        reindexedErrors[keyNum - 1] = true;
      } else if (keyNum < index) {
        reindexedErrors[keyNum] = true;
      }
    });
    setStockErrors(reindexedErrors);
  };

  const updateItem = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setItems(updatedItems);

    // If quantity or productCode changed, check stock
    if (field === 'quantity' || field === 'productCode') {
      const item = updatedItems[index];
      if (item.productCode && item.quantity) {
        checkStockForItem(index, item.productCode, parseInt(item.quantity) || 0);
      }
    }
  };

  const handleSave = async () => {
    // Validate form
    if (!formData.deliveryAddress.trim()) {
      Alert.alert('Error', 'Please enter delivery address');
      return;
    }

    if (!formData.scheduledDate) {
      Alert.alert('Error', 'Please select scheduled date');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Error', 'Please add at least one product');
      return;
    }

    // Validate items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.productName || !item.productName.trim()) {
        Alert.alert('Error', `Please enter product name for item ${i + 1}`);
        return;
      }
      if (!item.quantity || parseInt(item.quantity) <= 0) {
        Alert.alert('Error', `Please enter valid quantity for item ${i + 1}`);
        return;
      }
    }

    // Check if any items have insufficient stock
    if (Object.keys(stockErrors).length > 0) {
      Alert.alert(
        'Insufficient Stock',
        'Some items have insufficient stock. Please adjust quantities before saving.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    try {
      const deliveryData = {
        reference: formData.reference,
        deliveryAddress: formData.deliveryAddress,
        responsible: formData.responsible,
        scheduledDate: formData.scheduledDate,
        operationType: formData.operationType,
        fromLocation: formData.fromLocation,
        toLocation: formData.toLocation,
        contact: formData.contact,
        notes: formData.notes,
        status: status,
        items: items.map((item) => ({
          productCode: item.productCode,
          productName: item.productName,
          quantity: parseInt(item.quantity) || 0,
          unitPrice: parseFloat(item.unitPrice) || 0,
        })),
      };

      let deliveryId = delivery?.id;
      if (delivery) {
        await updateDelivery(user.id, delivery.id, deliveryData);
      } else {
        deliveryId = await createDelivery(user.id, deliveryData);
      }

      Alert.alert('Success', delivery ? 'Delivery updated successfully' : 'Delivery created successfully', [
        { text: 'OK', onPress: () => onClose && onClose() },
      ]);

      return deliveryId;
    } catch (error) {
      console.error('Error saving delivery:', error);
      Alert.alert('Error', 'Failed to save delivery');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    // Before changing to "done", check stock
    if (newStatus === 'done') {
      // Re-check stock for all items
      await checkStockForAllItems(items);
      if (Object.keys(stockErrors).length > 0) {
        Alert.alert(
          'Cannot Complete Delivery',
          'Some items have insufficient stock. Please adjust quantities before completing the delivery.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Final validation
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.productCode && item.quantity) {
          const inventoryItem = await getInventoryItemByCode(user.id, item.productCode);
          const availableStock = inventoryItem ? inventoryItem.quantity : 0;
          if (availableStock < parseInt(item.quantity)) {
            Alert.alert(
              'Insufficient Stock',
              `Cannot complete delivery. ${inventoryItem?.productName || item.productCode} has only ${availableStock} units available, but ${item.quantity} are required.`,
              [{ text: 'OK' }]
            );
            return;
          }
        }
      }
    }

    try {
      // First save the delivery if it's new
      if (!delivery) {
        // Update status state before saving
        setStatus(newStatus);
        const deliveryId = await handleSave();
        // After saving, if status is "done", update it to trigger stock reduction
        if (newStatus === 'done' && deliveryId) {
          await updateDeliveryStatus(user.id, deliveryId, newStatus);
        }
        Alert.alert('Success', 'Delivery created and status updated');
      } else {
        // Update status (this will also reduce stock if status is "done")
        await updateDeliveryStatus(user.id, delivery.id, newStatus);
        setStatus(newStatus);
        Alert.alert('Success', 'Delivery status updated');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update delivery status');
    }
  };

  const handlePrint = async () => {
    // Validate that we have minimum required data
    if (!formData.reference || items.length === 0) {
      Alert.alert('Error', 'Please ensure the delivery has a reference and at least one product before printing');
      return;
    }

    try {
      setGeneratingPDF(true);
      
      // Prepare delivery data for PDF (use current form data)
      const deliveryData = {
        reference: formData.reference,
        deliveryAddress: formData.deliveryAddress || 'N/A',
        responsible: formData.responsible || user?.loginId || 'N/A',
        scheduledDate: formData.scheduledDate,
        operationType: formData.operationType || 'N/A',
        fromLocation: formData.fromLocation || 'N/A',
        toLocation: formData.toLocation || 'N/A',
        contact: formData.contact || 'N/A',
        status: status,
        notes: formData.notes || '',
      };

      // Generate PDF HTML
      const html = generateDeliveryPDF(deliveryData, items);
      
      // Generate and save PDF
      const filename = `Delivery_${deliveryData.reference.replace(/\//g, '_')}_${Date.now()}.pdf`;
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

  const handleCancel = () => {
    Alert.alert('Cancel', 'Are you sure you want to cancel?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', onPress: () => onClose && onClose() },
    ]);
  };

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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Wavy Header */}
      <View style={styles.wavyHeader}>
        <Svg
          height="100"
          width="100%"
          viewBox="0 0 1440 320"
          style={styles.waveSvg}
          preserveAspectRatio="none"
        >
          <Path
            d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,112C672,96,768,96,864,112C960,128,1056,160,1152,160C1248,160,1344,128,1392,112L1440,96L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"
            fill="#1A1A2E"
          />
        </Svg>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Delivery Order</Text>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Status Flow */}
        <View style={styles.statusContainer}>
          <View style={styles.statusFlow}>
            <View style={[styles.statusStep, status === 'draft' && styles.statusStepActive]}>
              <Text style={styles.statusStepText}>Draft</Text>
            </View>
            <View style={styles.statusArrow}>
              <Text style={styles.statusArrowText}>→</Text>
            </View>
            <View style={[styles.statusStep, status === 'waiting' && styles.statusStepActive]}>
              <Text style={styles.statusStepText}>Waiting</Text>
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
        </View>

        {/* Reference Field */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Reference</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={formData.reference}
            editable={false}
            placeholderTextColor="#888"
          />
        </View>

        {/* Delivery Address */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Delivery Address</Text>
          <TextInput
            style={styles.input}
            value={formData.deliveryAddress}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, deliveryAddress: text }))}
            placeholder="Enter delivery address"
            placeholderTextColor="#666"
          />
          <View style={styles.inputUnderline} />
        </View>

        {/* Scheduled Date */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Scheduled Date</Text>
          <TouchableOpacity onPress={openDatePicker} style={styles.dateInputButton}>
            <Text style={[styles.dateInputText, !formData.scheduledDate && styles.dateInputPlaceholder]}>
              {formData.scheduledDate || 'Select Date'}
            </Text>
            <View style={styles.inputUnderline} />
          </TouchableOpacity>
        </View>

        {/* Responsible */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Responsible</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={formData.responsible}
            editable={false}
            placeholderTextColor="#888"
          />
        </View>

        {/* Operation Type */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Operation Type</Text>
          <View style={styles.dropdownContainer}>
            <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
              {operationTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.dropdownOption,
                    formData.operationType === type && styles.dropdownOptionSelected,
                  ]}
                  onPress={() => setFormData((prev) => ({ ...prev, operationType: type }))}
                >
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      formData.operationType === type && styles.dropdownOptionTextSelected,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.inputUnderline} />
        </View>

        {/* Products Table */}
        <View style={styles.productsSection}>
          <Text style={styles.sectionTitle}>Products</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colProduct]}>Product</Text>
            <Text style={[styles.tableHeaderText, styles.colQuantity]}>Quantity</Text>
            <Text style={[styles.tableHeaderText, styles.colActions]}>Actions</Text>
          </View>

          {items.map((item, index) => (
            <View
              key={index}
              style={[
                styles.tableRow,
                stockErrors[index] && styles.tableRowError,
              ]}
            >
              <TouchableOpacity
                style={styles.colProduct}
                onPress={() => openProductPicker(index)}
              >
                <Text style={[styles.tableCellText, stockErrors[index] && styles.tableCellTextError]}>
                  {item.productName || 'Select Product'}
                </Text>
                {item.productCode && (
                  <Text style={styles.tableCellSubtext}>({item.productCode})</Text>
                )}
              </TouchableOpacity>
              <View style={styles.colQuantity}>
                <TextInput
                  style={[
                    styles.tableInput,
                    stockErrors[index] && styles.tableInputError,
                  ]}
                  value={item.quantity.toString()}
                  onChangeText={(text) => updateItem(index, 'quantity', text)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#666"
                />
              </View>
              <TouchableOpacity
                style={styles.colActions}
                onPress={() => removeProductLine(index)}
              >
                <Text style={styles.deleteButton}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity onPress={addProductLine} style={styles.addProductButton}>
            <LinearGradient
              colors={['#FF6B9D', '#C44569']}
              style={styles.addProductGradient}
            >
              <Text style={styles.addProductText}>Add New Product</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {status === 'draft' && (
            <TouchableOpacity
              onPress={() => handleStatusChange('waiting')}
              style={styles.actionButton}
              disabled={loading}
            >
              <LinearGradient
                colors={['#FF6B9D', '#C44569']}
                style={styles.actionButtonGradient}
              >
                <Text style={styles.actionButtonText}>Move to Waiting</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {status === 'waiting' && (
            <TouchableOpacity
              onPress={() => handleStatusChange('ready')}
              style={styles.actionButton}
              disabled={loading}
            >
              <LinearGradient
                colors={['#FF6B9D', '#C44569']}
                style={styles.actionButtonGradient}
              >
                <Text style={styles.actionButtonText}>Move to Ready</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {status === 'ready' && (
            <TouchableOpacity
              onPress={() => handleStatusChange('done')}
              style={styles.actionButton}
              disabled={loading}
            >
              <LinearGradient
                colors={['#FF6B9D', '#C44569']}
                style={styles.actionButtonGradient}
              >
                <Text style={styles.actionButtonText}>Validate / Mark as Done</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {status === 'done' && (
            <TouchableOpacity
              onPress={handlePrint}
              style={styles.actionButton}
            >
              <LinearGradient
                colors={['#FF6B9D', '#C44569']}
                style={styles.actionButtonGradient}
              >
                <Text style={styles.actionButtonText}>Print</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleSave}
            style={styles.actionButton}
            disabled={loading}
          >
            <LinearGradient
              colors={['#4ECDC4', '#44A08D']}
              style={styles.actionButtonGradient}
            >
              <Text style={styles.actionButtonText}>Save</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCancel}
            style={[styles.actionButton, styles.cancelButton]}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <DatePickerComponent
              selectedDate={selectedDate}
              onDateSelect={handleDateChange}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Product Picker Modal */}
      <Modal
        visible={showProductPicker}
        transparent={true}
        animationType="slide"
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
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.productSearchInput}
              placeholder="Search products..."
              placeholderTextColor="#666"
              value={productSearchQuery}
              onChangeText={setProductSearchQuery}
            />
            <ScrollView style={styles.productList}>
              {getFilteredProducts().map((product) => {
                const availableStock = product.quantity || 0;
                const isLowStock = availableStock < 10;
                const isOutOfStock = availableStock === 0;
                return (
                  <TouchableOpacity
                    key={product.id}
                    style={styles.productItem}
                    onPress={() => selectProduct(product)}
                  >
                    <View style={styles.productItemContent}>
                      <Text style={styles.productItemName}>{product.productName}</Text>
                      <Text style={styles.productItemCode}>{product.productCode}</Text>
                      <View style={styles.productItemStock}>
                        <Text style={styles.productItemStockLabel}>Stock:</Text>
                        <View
                          style={[
                            styles.stockBadge,
                            isOutOfStock && styles.stockBadgeRed,
                            isLowStock && !isOutOfStock && styles.stockBadgeYellow,
                            !isLowStock && !isOutOfStock && styles.stockBadgeGreen,
                          ]}
                        >
                          <Text style={styles.stockBadgeText}>
                            {availableStock} {isOutOfStock ? '(Out of Stock)' : isLowStock ? '(Low)' : ''}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
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
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pdfModalBody}>
              <Text style={styles.pdfModalText}>
                Your delivery PDF has been generated successfully!
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1E',
  },
  wavyHeader: {
    height: 120,
    backgroundColor: '#1A1A2E',
    position: 'relative',
  },
  waveSvg: {
    position: 'absolute',
    bottom: 0,
  },
  headerContent: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  statusContainer: {
    marginBottom: 20,
  },
  statusFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  statusStep: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 157, 0.3)',
  },
  statusStepActive: {
    backgroundColor: 'rgba(255, 107, 157, 0.2)',
    borderColor: '#FF6B9D',
  },
  statusStepText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
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
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    fontSize: 16,
    color: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 107, 157, 0.3)',
  },
  inputDisabled: {
    opacity: 0.6,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  inputUnderline: {
    height: 1,
    backgroundColor: 'rgba(255, 107, 157, 0.3)',
    marginTop: -1,
  },
  dateInputButton: {
    paddingVertical: 12,
  },
  dateInputText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  dateInputPlaceholder: {
    color: '#666',
  },
  dropdownContainer: {
    maxHeight: 150,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 107, 157, 0.3)',
  },
  dropdownScroll: {
    maxHeight: 150,
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  dropdownOptionSelected: {
    backgroundColor: 'rgba(255, 107, 157, 0.1)',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  dropdownOptionTextSelected: {
    color: '#FF6B9D',
    fontWeight: '600',
  },
  productsSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 107, 157, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 107, 157, 0.3)',
    marginBottom: 10,
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  tableRowError: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#FF0000',
  },
  colProduct: {
    flex: 2,
  },
  colQuantity: {
    flex: 1,
    marginLeft: 10,
  },
  colActions: {
    flex: 1,
    alignItems: 'flex-end',
  },
  tableCellText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  tableCellTextError: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  tableCellSubtext: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  tableInput: {
    fontSize: 14,
    color: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 157, 0.3)',
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  tableInputError: {
    borderColor: '#FF0000',
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
  },
  deleteButton: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '600',
  },
  addProductButton: {
    marginTop: 15,
    borderRadius: 8,
    overflow: 'hidden',
  },
  addProductGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  addProductText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    marginTop: 20,
    gap: 15,
  },
  actionButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A2E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: 20,
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalCloseText: {
    fontSize: 24,
    color: '#FFFFFF',
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
    marginTop: 20,
    borderRadius: 8,
    overflow: 'hidden',
  },
  datePickerConfirmGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  datePickerConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  productSearchInput: {
    fontSize: 16,
    color: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 157, 0.3)',
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  productList: {
    maxHeight: 400,
  },
  productItem: {
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  productItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productItemName: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1,
  },
  productItemCode: {
    fontSize: 12,
    color: '#888',
    marginLeft: 10,
  },
  productItemStock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  productItemStockLabel: {
    fontSize: 12,
    color: '#888',
    marginRight: 5,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stockBadgeGreen: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  stockBadgeYellow: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
  },
  stockBadgeRed: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
  },
  stockBadgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  pdfModalContent: {
    backgroundColor: '#1A1A2E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    padding: 20,
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
    backgroundColor: '#1A1A2E',
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

