# Inventory Management System - Mobile App

## Quick Start

To access this mobile app, you need to download the Expo Go app which is available on App Store/Play Store:

**Download Link**: https://play.google.com/store/apps/details?id=host.exp.exponent

### Scan QR Code

Once you have Expo Go installed, scan the QR code below from your mobile device:

<div align="center">
  <img src="./assets/qr-code.jpg" alt="QR Code for Expo App" width="300" height="300" />
</div>

**Note**: Make sure your mobile device and computer are on the same network, or use the tunnel option when starting the Expo server (`npx expo start --tunnel`).

# Inventory Management System

A mobile application built with React Native and Expo for managing inventory. The app works completely offline using local storage.

## Features

- **Login System**: Secure authentication with offline storage
- **Sign Up**: User registration with validation
- **Forget Password**: Password reset functionality
- **Offline Support**: All data stored locally using AsyncStorage

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm start
```

3. Run on your device:
   - Scan the QR code with Expo Go app (iOS/Android)
   - Or press `a` for Android emulator
   - Or press `i` for iOS simulator

## Project Structure

```
├── App.js                 # Main app component with navigation
├── screens/
│   ├── LoginScreen.js     # Login page
│   ├── SignUpScreen.js    # Sign up page
│   ├── ForgetPasswordScreen.js  # Password reset page
│   └── HomeScreen.js      # Home screen (placeholder)
├── package.json
└── README.md
```

## Login Requirements

- Check for Login Credentials
- Match credentials and allow user to login
- If credentials don't match, show error: "Invalid Login Id or Password"
- Navigate to SignUp page when "Sign Up" is clicked
- Navigate to Forget Password page when "Forget Password" is clicked

## Sign Up Requirements

- Create user database in the system on signup
- Validation rules:
  1. Login ID must be unique and between 6-12 characters
  2. Email ID should not be duplicate in database
  3. Password must be unique and contain:
     - At least one lowercase letter
     - At least one uppercase letter
     - At least one special character
     - Length more than 8 characters

## Technologies Used

- React Native
- Expo
- React Navigation
- AsyncStorage (for offline storage)
- Expo Linear Gradient

## Notes

- All user data is stored locally on the device
- No internet connection required
- Data persists between app sessions
