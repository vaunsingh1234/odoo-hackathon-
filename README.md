# StockMaster - Offline-First Inventory Management System

A mobile inventory management system designed for warehouse staff to manage products, receipts, deliveries, transfers, and stock adjustments entirely from a local database with automatic synchronization when connectivity returns.

## Features

- **Offline-First Architecture**: All operations work without internet connection
- **User Authentication**: Login, Sign Up, OTP Password Reset
- **Dashboard**: KPIs, filters, and document overview
- **Product Management**: Full CRUD with reorder alerts
- **Inventory Operations**: Receipts, Deliveries, Transfers, Stock Adjustments
- **Ledger/History**: Complete audit trail of all stock movements
- **User Profile & Settings**: Profile management and preferences

## Technology Stack

- React Native 0.72.6
- SQLite (react-native-sqlite-storage) for local database
- React Navigation for navigation
- React Native Paper for UI components
- AsyncStorage for secure credential storage

## Installation

```bash
npm install
```

For iOS:
```bash
cd ios && pod install && cd ..
```

## Running the App

```bash
# Start Metro bundler
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## Project Structure

```
stockmaster/
├── src/
│   ├── database/          # Database schema and operations
│   ├── screens/           # All screen components
│   ├── components/        # Reusable UI components
│   ├── navigation/        # Navigation configuration
│   ├── services/          # Business logic and sync
│   ├── utils/             # Helper functions
│   └── types/             # TypeScript types
├── App.js                 # Main app entry point
└── package.json
```

## Database Schema

- **Users**: Authentication and user profiles
- **Products**: Product catalog with SKU, category, unit
- **Warehouses**: Location/warehouse information
- **StockLevels**: Product stock by warehouse
- **Transactions**: Receipts, deliveries, transfers, adjustments
- **SyncQueue**: Pending operations for server sync

## Offline Sync

The app uses an optimistic UI approach - all changes are saved locally immediately. When online, a background sync process uploads queued changes to the server and fetches updates.

