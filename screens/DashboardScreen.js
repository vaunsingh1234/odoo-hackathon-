import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Animated,
  Dimensions,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getUserDatabase,
  getReceipts,
  getDeliveries,
  getHistory,
  getInventoryItems,
  initUserDatabase,
} from "../database/db";
import StockScreen from "./StockScreen";
import SettingsScreen from "./SettingsScreen";
import ReceiptsListScreen from "./ReceiptsListScreen";
import DeliveriesListScreen from "./DeliveriesListScreen";

const { width } = Dimensions.get("window");

export default function DashboardScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [operationsSubTab, setOperationsSubTab] = useState("Receipts"); // 'Receipts' or 'Deliveries'
  const [receipts, setReceipts] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-width * 0.8));
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user && user.id) {
      loadDashboardData();
    }
  }, [user]);

  // Refresh dashboard when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user && user.id) {
        loadDashboardData();
      }
    }, [user])
  );

  const loadUser = async () => {
    try {
      const userJson = await AsyncStorage.getItem("currentUser");
      if (userJson) {
        setUser(JSON.parse(userJson));
      }
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const loadDashboardData = async (showRefresh = false) => {
    try {
      if (!user || !user.id) {
        console.log("User not loaded yet");
        return;
      }

      if (showRefresh) {
        setRefreshing(true);
      }

      // Initialize user's database if not already done
      await initUserDatabase(user.id);

      // Load receipts (user-specific)
      const receiptsData = await getReceipts(user.id);
      setReceipts(receiptsData || []);

      // Load deliveries (user-specific)
      const deliveriesData = await getDeliveries(user.id);
      setDeliveries(deliveriesData || []);

      // Load history (user-specific)
      const historyData = await getHistory(user.id);
      setHistory(historyData || []);
      setFilteredHistory(historyData || []);

      // Load inventory/stock (user-specific)
      const inventoryData = await getInventoryItems(user.id);
      setInventory(inventoryData || []);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      Alert.alert("Error", "Failed to load dashboard data");
    } finally {
      if (showRefresh) {
        setRefreshing(false);
      }
    }
  };

  const onRefresh = () => {
    loadDashboardData(true);
  };

  useEffect(() => {
    filterHistoryByDate();
  }, [selectedDate, history]);

  const filterHistoryByDate = () => {
    if (!selectedDate) {
      setFilteredHistory(history);
      return;
    }

    const selectedDateStr = new Date(selectedDate).toDateString();
    const filtered = history.filter((item) => {
      const itemDate = new Date(item.createdAt).toDateString();
      return itemDate === selectedDateStr;
    });
    setFilteredHistory(filtered);
  };

  const handleDateSelect = (year, month, day) => {
    const date = new Date(year, month - 1, day);
    setSelectedDate(date);
    setShowCalendar(false);
  };

  const clearDateFilter = () => {
    setSelectedDate(null);
  };

  const toggleMenu = () => {
    if (menuVisible) {
      // Close menu
      Animated.timing(slideAnim, {
        toValue: -width * 0.8,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Open menu
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
    setMenuVisible(!menuVisible);
  };

  const handleMenuSelect = (tab) => {
    setActiveTab(tab);
    toggleMenu();
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: async () => {
          await AsyncStorage.removeItem("currentUser");
          navigation.replace("Login");
        },
      },
    ]);
  };

  const getHeaderTitle = () => {
    if (activeTab === "Operations") {
      return operationsSubTab; // "Receipts" or "Deliveries"
    }
    return activeTab; // "Dashboard", "Stock", "Move History", "Settings"
  };

  const getReceiptStats = () => {
    const draft = receipts.filter((r) => r.status?.toLowerCase() === "draft").length;
    const ready = receipts.filter((r) => r.status?.toLowerCase() === "ready").length;
    const done = receipts.filter((r) => r.status?.toLowerCase() === "done").length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];
    const expectedToday = receipts.filter((r) => {
      if (!r.scheduledDate) return false;
      const scheduledDateStr = r.scheduledDate.split("T")[0];
      return scheduledDateStr === todayStr && r.status?.toLowerCase() !== "done";
    }).length;
    return { total: receipts.length, draft, ready, done, expectedToday };
  };

  const getDeliveryStats = () => {
    const draft = deliveries.filter((d) => d.status?.toLowerCase() === "draft").length;
    const waiting = deliveries.filter((d) => d.status?.toLowerCase() === "waiting").length;
    const ready = deliveries.filter((d) => d.status?.toLowerCase() === "ready").length;
    const done = deliveries.filter((d) => d.status?.toLowerCase() === "done").length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];
    const expectedToday = deliveries.filter((d) => {
      if (!d.scheduledDate) return false;
      const scheduledDateStr = d.scheduledDate.split("T")[0];
      return scheduledDateStr === todayStr && d.status?.toLowerCase() !== "done";
    }).length;
    return { total: deliveries.length, draft, waiting, ready, done, expectedToday };
  };

  const getStockStats = () => {
    const totalItems = inventory.length;
    const lowStock = inventory.filter((item) => (item.quantity || 0) < 10 && (item.quantity || 0) > 0).length;
    const outOfStock = inventory.filter((item) => (item.quantity || 0) === 0).length;
    const totalQuantity = inventory.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalValue = inventory.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0);
    return { totalItems, lowStock, outOfStock, totalQuantity, totalValue };
  };

  const receiptStats = getReceiptStats();
  const deliveryStats = getDeliveryStats();
  const stockStats = getStockStats();

  const renderDashboard = () => (
    <ScrollView
      style={styles.dashboardContent}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B9D" />
      }
    >
      {/* Receipt Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Receipt</Text>
        </View>

            <View style={styles.statsBox}>
              <View style={styles.statMainBox}>
                <Text style={styles.statNumber}>{receiptStats.ready}</Text>
                <Text style={styles.statLabel}>Ready to Receive</Text>
              </View>
              <View style={styles.statInfoContainer}>
                <Text style={styles.statText}>{receiptStats.draft} Draft</Text>
                <Text style={styles.statText}>{receiptStats.done} Done</Text>
                <Text style={styles.statText}>{receiptStats.expectedToday} Expected Today</Text>
                <Text style={styles.statText}>{receiptStats.total} Total</Text>
              </View>
            </View>

        {receipts.length > 0 ? (
          receipts.slice(0, 5).map((receipt) => (
            <View key={receipt.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {receipt.reference || "N/A"}
                </Text>
                <View style={[
                  styles.statusBadge,
                  receipt.status?.toLowerCase() === "done" && styles.statusDone,
                  receipt.status?.toLowerCase() === "ready" && styles.statusReady,
                  (receipt.status?.toLowerCase() === "draft" || !receipt.status) && styles.statusDraft,
                ]}>
                  <Text style={styles.statusText}>{receipt.status || "draft"}</Text>
                </View>
              </View>
              <View style={styles.itemDetails}>
                <Text style={styles.itemDetail}>From: {receipt.receiveFrom || "N/A"}</Text>
                {receipt.toLocation && (
                  <Text style={styles.itemDetail}>To: {receipt.toLocation}</Text>
                )}
                {receipt.contact && (
                  <Text style={styles.itemDetail}>Contact: {receipt.contact}</Text>
                )}
                {receipt.scheduledDate && (
                  <Text style={styles.itemDetail}>
                    Scheduled: {new Date(receipt.scheduledDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </Text>
                )}
                {receipt.items && receipt.items.length > 0 && (
                  <Text style={styles.itemDetail}>
                    {receipt.items.length} product{receipt.items.length > 1 ? "s" : ""} • Total Qty: {receipt.items.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                  </Text>
                )}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No receipts available</Text>
          </View>
        )}
      </View>

      {/* Stock/Inventory Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Stock</Text>
        </View>

        <View style={styles.statsBox}>
          <View style={styles.statMainBox}>
            <Text style={styles.statNumber}>{stockStats.totalItems}</Text>
            <Text style={styles.statLabel}>Total Products</Text>
          </View>
          <View style={styles.statInfoContainer}>
            <Text style={styles.statText}>Low Stock: {stockStats.lowStock}</Text>
            <Text style={styles.statText}>Out of Stock: {stockStats.outOfStock}</Text>
            <Text style={styles.statText}>Total Qty: {stockStats.totalQuantity}</Text>
            <Text style={styles.statText}>Total Value: ₹{stockStats.totalValue.toFixed(2)}</Text>
          </View>
        </View>

        {inventory.length > 0 ? (
          inventory.slice(0, 5).map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.productName || "N/A"}
                </Text>
                <View style={[
                  styles.statusBadge,
                  (item.quantity || 0) === 0 && styles.statusOutOfStock,
                  (item.quantity || 0) > 0 && (item.quantity || 0) < 10 && styles.statusLowStock,
                  (item.quantity || 0) >= 10 && styles.statusInStock,
                ]}>
                  <Text style={styles.statusText}>
                    {(item.quantity || 0) === 0 ? "Out" : (item.quantity || 0) < 10 ? "Low" : "In Stock"}
                  </Text>
                </View>
              </View>
              <View style={styles.itemDetails}>
                <Text style={styles.itemDetail}>Code: {item.productCode || "N/A"}</Text>
                <Text style={styles.itemDetail}>Quantity: {item.quantity || 0}</Text>
                <Text style={styles.itemDetail}>Unit Price: ₹{item.unitPrice || 0}</Text>
                <Text style={styles.itemDetail}>Category: {item.category || "N/A"}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No inventory items available</Text>
          </View>
        )}
      </View>

      {/* Delivery Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Delivery</Text>
        </View>

        <View style={styles.statsBox}>
          <View style={styles.statMainBox}>
            <Text style={styles.statNumber}>{deliveryStats.draft + deliveryStats.waiting + deliveryStats.ready}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statInfoContainer}>
            <Text style={styles.statText}>Draft: {deliveryStats.draft}</Text>
            <Text style={styles.statText}>Waiting: {deliveryStats.waiting}</Text>
            <Text style={styles.statText}>Ready: {deliveryStats.ready}</Text>
            <Text style={styles.statText}>Done: {deliveryStats.done}</Text>
            <Text style={styles.statText}>
              {deliveryStats.expectedToday} Expected Today
            </Text>
          </View>
        </View>

        {deliveries.length > 0 ? (
          deliveries.slice(0, 5).map((delivery) => (
            <View key={delivery.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {delivery.reference || `Delivery #${delivery.id}`}
                </Text>
                <View style={[styles.statusBadge, 
                  delivery.status?.toLowerCase() === "done" && styles.statusDone,
                  delivery.status?.toLowerCase() === "ready" && styles.statusReady,
                  delivery.status?.toLowerCase() === "waiting" && styles.statusWaiting,
                  delivery.status?.toLowerCase() === "draft" && styles.statusDraft,
                ]}>
                  <Text style={styles.statusText}>{delivery.status || "Draft"}</Text>
                </View>
              </View>
              <View style={styles.itemDetails}>
                <Text style={styles.itemDetail}>
                  To: {delivery.deliveryAddress || delivery.toLocation || "N/A"}
                </Text>
                {delivery.fromLocation && (
                  <Text style={styles.itemDetail}>From: {delivery.fromLocation}</Text>
                )}
                {delivery.contact && (
                  <Text style={styles.itemDetail}>Contact: {delivery.contact}</Text>
                )}
                {delivery.scheduledDate && (
                  <Text style={styles.itemDetail}>
                    Scheduled: {new Date(delivery.scheduledDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </Text>
                )}
                {delivery.items && delivery.items.length > 0 && (
                  <Text style={styles.itemDetail}>
                    {delivery.items.length} product{delivery.items.length > 1 ? "s" : ""} • Total Qty: {delivery.items.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                  </Text>
                )}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No deliveries available</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderHistory = () => {
    // Calendar Component
    const DatePickerComponent = ({ selectedDate, onDateSelect, onClose }) => {
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
      
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      const calendarDays = [];
      for (let i = 0; i < firstDayOfMonth; i++) {
        calendarDays.push(null);
      }
      for (let d = 1; d <= daysInMonth; d++) {
        calendarDays.push(d);
      }

      const handleDaySelect = (day) => {
        if (day !== null) {
          setSelectedDay(day);
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
        <View style={styles.calendarContainer}>
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

          <View style={styles.calendarDayNames}>
            {dayNames.map((dayName, index) => (
              <View key={index} style={styles.calendarDayNameCell}>
                <Text style={styles.calendarDayNameText}>{dayName}</Text>
              </View>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <View key={index} style={styles.calendarDayCell} />;
              }
              const isTodayDate = isToday(day);
              const isSelectedDate = isSelected(day);
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.calendarDayCell,
                    isTodayDate && styles.calendarDayToday,
                    isSelectedDate && styles.calendarDaySelected,
                  ]}
                  onPress={() => handleDaySelect(day)}
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

          <TouchableOpacity onPress={handleConfirm} style={styles.datePickerConfirmButton}>
            <LinearGradient
              colors={['#FF6B9D', '#C44569']}
              style={styles.datePickerConfirmGradient}
            >
              <Text style={styles.datePickerConfirmText}>Select Date</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    };

    return (
      <View style={styles.historyContainer}>
        <View style={styles.historyCardWrapper}>
          {/* Wavy Header with Gradient */}
          <View style={styles.historyWavyHeader}>
            <LinearGradient
              colors={['#9D50BB', '#6E48AA', '#8B5FBF']}
              style={styles.historyWaveGradient}
            >
              <Svg
                height="120"
                width="100%"
                viewBox="0 0 400 120"
                style={styles.historyWaveSvg}
              >
                <Path
                  d="M0,60 Q100,20 200,60 T400,60 L400,0 L0,0 Z"
                  fill="rgba(255, 255, 255, 0.1)"
                />
              </Svg>
            </LinearGradient>
            <View style={styles.historyHeaderContent}>
              <Text style={styles.historyTitle}>Move History</Text>
              <View style={styles.historyHeaderButtons}>
                <TouchableOpacity
                  onPress={() => setShowCalendar(true)}
                  style={styles.calendarButton}
                >
                  <Text style={styles.calendarButtonText}>📅</Text>
                </TouchableOpacity>
                {selectedDate && (
                  <TouchableOpacity
                    onPress={clearDateFilter}
                    style={styles.clearFilterButton}
                  >
                    <Text style={styles.clearFilterButtonText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Selected Date Display */}
          {selectedDate && (
            <View style={styles.filterInfo}>
              <Text style={styles.filterInfoText}>
                Showing moves for: {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
          )}

          {/* History Content */}
          <ScrollView
            style={styles.historyContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.historyScrollContent}
          >
            {filteredHistory.length === 0 ? (
              <View style={styles.historyEmptyState}>
                <Text style={styles.historyEmptyText}>
                  {selectedDate ? 'No history found for selected date' : 'No history available'}
                </Text>
              </View>
            ) : (
              filteredHistory.map((item) => (
                <View key={item.id} style={styles.historyCardItem}>
                  <View style={styles.historyHeader}>
                    <View style={styles.historyTypeBadge}>
                      <Text style={styles.historyType}>{item.type}</Text>
                    </View>
                    <Text style={styles.historyDate}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.historyOperation}>{item.operation}</Text>
                  <Text style={styles.historyProduct}>{item.productName}</Text>
                  {item.description && (
                    <Text style={styles.historyDescription}>
                      {item.description}
                    </Text>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </View>

        {/* Calendar Modal */}
        <Modal
          visible={showCalendar}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowCalendar(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.calendarModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Date to Filter</Text>
                <TouchableOpacity
                  onPress={() => setShowCalendar(false)}
                  style={styles.modalCloseButton}
                >
                  <Text style={styles.modalCloseButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.datePickerContainer}>
                <DatePickerComponent
                  selectedDate={selectedDate}
                  onDateSelect={handleDateSelect}
                  onClose={() => setShowCalendar(false)}
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  const menuItems = [
    "Dashboard",
    "Operations",
    "Stock",
    "Move History",
    "Settings",
  ];

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.header}>
        {/* Hamburger Menu Icon */}
        <TouchableOpacity onPress={toggleMenu} style={styles.menuIcon}>
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
        </TouchableOpacity>

        {/* Dynamic Title */}
        <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>

        {/* Profile Icon */}
        <TouchableOpacity onPress={handleLogout} style={styles.profileIcon}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {user?.loginId?.charAt(0).toUpperCase() || "A"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Side Menu/Dropdown */}
      <Modal
        transparent={true}
        visible={menuVisible}
        animationType="none"
        onRequestClose={toggleMenu}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={toggleMenu}
        >
          <Animated.View
            style={[
              styles.menuContainer,
              {
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Menu</Text>
              <TouchableOpacity onPress={toggleMenu} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.menuContent}>
              {menuItems.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.menuItem,
                    activeTab === item && styles.menuItemActive,
                  ]}
                  onPress={() => handleMenuSelect(item)}
                >
                  <Text
                    style={[
                      styles.menuItemText,
                      activeTab === item && styles.menuItemTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.menuFooter}>
              <Text style={styles.menuFooterText}>Logged in as:</Text>
              <Text style={styles.menuFooterUser}>
                {user?.loginId || "User"}
              </Text>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {activeTab === "Dashboard" && renderDashboard()}
        {activeTab === "Move History" && renderHistory()}
        {activeTab === "Stock" && <StockScreen />}
        {activeTab === "Settings" && <SettingsScreen />}
        {activeTab === "Operations" && (
          <View style={styles.operationsContainer}>
            <View style={styles.operationsTabs}>
              <TouchableOpacity
                style={[
                  styles.operationsTab,
                  operationsSubTab === "Receipts" && styles.operationsTabActive,
                ]}
                onPress={() => setOperationsSubTab("Receipts")}
              >
                <Text
                  style={[
                    styles.operationsTabText,
                    operationsSubTab === "Receipts" && styles.operationsTabTextActive,
                  ]}
                >
                  Receipts
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.operationsTab,
                  operationsSubTab === "Deliveries" && styles.operationsTabActive,
                ]}
                onPress={() => setOperationsSubTab("Deliveries")}
              >
                <Text
                  style={[
                    styles.operationsTabText,
                    operationsSubTab === "Deliveries" && styles.operationsTabTextActive,
                  ]}
                >
                  Deliveries
                </Text>
              </TouchableOpacity>
            </View>
            {operationsSubTab === "Receipts" && <ReceiptsListScreen />}
            {operationsSubTab === "Deliveries" && <DeliveriesListScreen />}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A1625",
  },
  header: {
    backgroundColor: "#2C243B",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  menuIcon: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  hamburgerLine: {
    width: 24,
    height: 3,
    backgroundColor: "#FFFFFF",
    marginVertical: 3,
    borderRadius: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  profileIcon: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FF6B9D",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF6B9D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    flexDirection: "row",
  },
  menuContainer: {
    width: width * 0.8,
    backgroundColor: "#2C243B",
    height: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  menuHeader: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  menuTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  menuContent: {
    flex: 1,
    paddingTop: 10,
  },
  menuItem: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  menuItemActive: {
    backgroundColor: "rgba(255, 107, 157, 0.1)",
    borderLeftWidth: 4,
    borderLeftColor: "#FF6B9D",
  },
  menuItemText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "500",
  },
  menuItemTextActive: {
    color: "#FF6B9D",
    fontWeight: "700",
  },
  menuFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  menuFooterText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    marginBottom: 4,
  },
  menuFooterUser: {
    fontSize: 16,
    color: "#FF6B9D",
    fontWeight: "600",
  },
  mainContent: {
    flex: 1,
  },
  dashboardContent: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  sectionBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FF6B9D",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF6B9D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  statsBox: {
    backgroundColor: "#2C243B",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#FF6B9D",
    borderStyle: "dashed",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  statMainBox: {
    backgroundColor: "#FF6B9D",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignSelf: "flex-start",
    minWidth: 120,
    shadowColor: "#FF6B9D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  statNumber: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
  },
  statInfoContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    alignItems: "center",
  },
  statText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },
  itemCard: {
    backgroundColor: "#2C243B",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#FF6B9D",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  itemName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  statusPending: {
    backgroundColor: "rgba(255, 107, 157, 0.2)",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FF6B9D",
    textTransform: "capitalize",
  },
  itemDetails: {
    gap: 6,
  },
  itemDetail: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.65)",
    lineHeight: 20,
  },
  emptyCard: {
    backgroundColor: "#2C243B",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderStyle: "dashed",
  },
  emptyText: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.5)",
  },
  historyCard: {
    backgroundColor: "#2C243B",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  historyTypeBadge: {
    backgroundColor: "rgba(255, 107, 157, 0.2)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  historyType: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FF6B9D",
    textTransform: "uppercase",
  },
  historyDate: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.5)",
    fontWeight: "500",
  },
  historyOperation: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  historyProduct: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 4,
  },
  historyDescription: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.5)",
    marginTop: 4,
    lineHeight: 18,
  },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  placeholderText: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.5)",
    fontWeight: "500",
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  operationsContainer: {
    flex: 1,
  },
  operationsTabs: {
    flexDirection: "row",
    backgroundColor: "#2C243B",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  operationsTab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  operationsTabActive: {
    borderBottomColor: "#FF6B9D",
  },
  operationsTabText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "500",
  },
  operationsTabTextActive: {
    color: "#FF6B9D",
    fontWeight: "700",
  },
  statusDone: {
    backgroundColor: "rgba(76, 175, 80, 0.2)",
  },
  statusReady: {
    backgroundColor: "rgba(255, 193, 7, 0.2)",
  },
  statusWaiting: {
    backgroundColor: "rgba(255, 152, 0, 0.2)",
  },
  statusDraft: {
    backgroundColor: "rgba(158, 158, 158, 0.2)",
  },
  statusOutOfStock: {
    backgroundColor: "rgba(244, 67, 54, 0.2)",
  },
  statusLowStock: {
    backgroundColor: "rgba(255, 193, 7, 0.2)",
  },
  statusInStock: {
    backgroundColor: "rgba(76, 175, 80, 0.2)",
  },
  historyContainer: {
    flex: 1,
    backgroundColor: "#0F0F1E",
  },
  historyCardWrapper: {
    flex: 1,
    backgroundColor: "#1A1A2E",
    borderRadius: 0,
  },
  historyWavyHeader: {
    height: 100,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 10,
    overflow: "hidden",
  },
  historyWaveGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  historyWaveSvg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  historyHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 20,
    zIndex: 1,
    marginTop: 10,
  },
  historyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  historyContent: {
    flex: 1,
  },
  historyScrollContent: {
    padding: 20,
    paddingBottom: 30,
  },
  historyEmptyState: {
    padding: 40,
    alignItems: "center",
  },
  historyEmptyText: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.5)",
  },
  historyCardItem: {
    backgroundColor: "#2C243B",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  historyHeaderButtons: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  calendarButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "rgba(255, 107, 157, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FF6B9D",
  },
  calendarButtonText: {
    fontSize: 20,
  },
  clearFilterButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "rgba(244, 67, 54, 0.2)",
    borderWidth: 1,
    borderColor: "#F44336",
  },
  clearFilterButtonText: {
    color: "#F44336",
    fontSize: 12,
    fontWeight: "600",
  },
  filterInfo: {
    backgroundColor: "rgba(255, 107, 157, 0.1)",
    padding: 12,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#FF6B9D",
  },
  filterInfoText: {
    color: "#FF6B9D",
    fontSize: 14,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  calendarModalContent: {
    backgroundColor: "#2C243B",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseButtonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  datePickerContainer: {
    padding: 20,
  },
  calendarContainer: {
    padding: 15,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingVertical: 10,
  },
  calendarNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 107, 157, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  calendarNavText: {
    fontSize: 24,
    color: "#FF6B9D",
    fontWeight: "bold",
  },
  calendarMonthYear: {
    alignItems: "center",
  },
  calendarMonthText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  calendarYearText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "500",
  },
  calendarDayNames: {
    flexDirection: "row",
    marginBottom: 10,
  },
  calendarDayNameCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  calendarDayNameText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.6)",
    textTransform: "uppercase",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  calendarDayCell: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 4,
  },
  calendarDayText: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },
  calendarDayToday: {
    backgroundColor: "rgba(255, 193, 7, 0.2)",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#FFC107",
  },
  calendarDayTextToday: {
    color: "#FFC107",
    fontWeight: "bold",
  },
  calendarDaySelected: {
    backgroundColor: "#FF6B9D",
    borderRadius: 8,
  },
  calendarDayTextSelected: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  calendarSelectedDate: {
    backgroundColor: "#1A1625",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 157, 0.3)",
  },
  calendarSelectedDateLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 5,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  calendarSelectedDateValue: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  datePickerConfirmButton: {
    marginTop: 20,
    borderRadius: 8,
    overflow: "hidden",
  },
  datePickerConfirmGradient: {
    paddingVertical: 15,
    alignItems: "center",
  },
  datePickerConfirmText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
