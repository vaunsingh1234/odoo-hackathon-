import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { findUserByLoginId, initUserDatabase } from '../database/db';

export default function LoginScreen({ navigation }) {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!loginId.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both Login Id and Password');
      return;
    }

    try {
      // Find user in SQLite database
      const user = await findUserByLoginId(loginId.trim());

      if (!user) {
        Alert.alert('Error', 'Invalid Login Id or Password');
        return;
      }

      if (user.password !== password) {
        Alert.alert('Error', 'Invalid Login Id or Password');
        return;
      }

      // Check if email is verified
      if (user.isEmailVerified === 0 || user.isEmailVerified === null) {
        Alert.alert(
          'Email Not Verified',
          'Please verify your email address before logging in. Check your email for the verification code.',
          [
            {
              text: 'Resend Code',
              onPress: async () => {
                try {
                  const { resendVerificationCode } = require('../database/db');
                  const newCode = await resendVerificationCode(user.emailId);
                  Alert.alert(
                    'Code Resent',
                    `New verification code sent to ${user.emailId}\n\nCode: ${newCode}\n\n(For demo purposes, showing code here since app works offline)`,
                    [
                      {
                        text: 'Verify Now',
                        onPress: () => navigation.navigate('EmailVerification', {
                          emailId: user.emailId,
                          verificationCode: newCode,
                        }),
                      },
                      { text: 'OK' },
                    ]
                  );
                } catch (error) {
                  Alert.alert('Error', 'Failed to resend verification code');
                }
              },
            },
            { text: 'Cancel' },
          ]
        );
        return;
      }

      // Initialize user's inventory database
      await initUserDatabase(user.id);

      // Store current user session in AsyncStorage (for quick access)
      await AsyncStorage.setItem('currentUser', JSON.stringify({
        id: user.id,
        loginId: user.loginId,
        emailId: user.emailId,
      }));
      // Navigate to dashboard screen
      navigation.replace('Home');
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'An error occurred during login. Please try again.');
    }
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
                <Text style={styles.title}>Hello there, welcome back</Text>
              </View>

              {/* Form Content */}
              <View style={styles.formContent}>
                {/* Login Id Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Login Id</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your Login Id"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={loginId}
                    onChangeText={setLoginId}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <View style={styles.underline} />
                </View>

                {/* Password Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your Password"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <View style={styles.underline} />
                </View>

                {/* Forgot Password Link */}
                <TouchableOpacity
                  onPress={() => navigation.navigate('ForgetPassword')}
                  style={styles.forgotLink}
                >
                  <Text style={styles.forgotText}>Forgot your Password?</Text>
                </TouchableOpacity>

                {/* Sign In Button with Gradient */}
                <TouchableOpacity
                  style={styles.signInButton}
                  onPress={handleLogin}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#FF6B9D', '#C44569', '#F8B500']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buttonGradient}
                  >
                    <Text style={styles.signInButtonText}>Sign In</Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Sign Up Link */}
                <TouchableOpacity
                  onPress={() => navigation.navigate('SignUp')}
                  style={styles.signUpLink}
                >
                  <Text style={styles.signUpLinkText}>New here? <Text style={styles.signUpLinkTextBold}>Sign Up instead</Text></Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    height: 140,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
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
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    zIndex: 1,
    marginTop: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  formContent: {
    padding: 30,
    flex: 1,
  },
  inputContainer: {
    marginBottom: 30,
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
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 35,
  },
  forgotText: {
    fontSize: 15,
    color: '#FF6B9D',
    fontWeight: '600',
  },
  signInButton: {
    borderRadius: 20,
    overflow: 'hidden',
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
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  signUpLink: {
    alignItems: 'center',
  },
  signUpLinkText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '400',
  },
  signUpLinkTextBold: {
    color: '#FF6B9D',
    fontWeight: '700',
  },
});
