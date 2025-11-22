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
import { findUserByLoginIdAndEmailId, updateUserPassword } from '../database/db';

export default function ForgetPasswordScreen({ navigation }) {
  const [loginId, setLoginId] = useState('');
  const [emailId, setEmailId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [reEnterPassword, setReEnterPassword] = useState('');

  const validatePassword = (pwd) => {
    const hasLowerCase = /[a-z]/.test(pwd);
    const hasUpperCase = /[A-Z]/.test(pwd);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/;'~`]/.test(pwd);
    const hasMinLength = pwd.length > 8;
    
    return hasLowerCase && hasUpperCase && hasSpecialChar && hasMinLength;
  };

  const handleResetPassword = async () => {
    if (!loginId.trim() || !emailId.trim() || !newPassword.trim() || !reEnterPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!validatePassword(newPassword)) {
      Alert.alert(
        'Error',
        'Password must contain:\n- At least one lowercase letter\n- At least one uppercase letter\n- At least one special character\n- More than 8 characters'
      );
      return;
    }

    if (newPassword !== reEnterPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      // Find user in SQLite database
      const user = await findUserByLoginIdAndEmailId(loginId.trim(), emailId.trim());

      if (!user) {
        Alert.alert('Error', 'Invalid Login Id or Email Id');
        return;
      }

      // Update password in SQLite database
      const updated = await updateUserPassword(loginId.trim(), emailId.trim(), newPassword);

      if (updated) {
        Alert.alert('Success', 'Password reset successfully!', [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ]);
      } else {
        Alert.alert('Error', 'Failed to update password. Please try again.');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      Alert.alert('Error', 'An error occurred. Please try again.');
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
                <Text style={styles.title}>Reset Password</Text>
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

                {/* Email Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>E-mail</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your Email Id"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={emailId}
                    onChangeText={setEmailId}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <View style={styles.underline} />
                </View>

                {/* New Password Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>New Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Min 8 chars, uppercase, lowercase, special"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <View style={styles.underline} />
                </View>

                {/* Confirm Password Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Confirm New Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter new password"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={reEnterPassword}
                    onChangeText={setReEnterPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <View style={styles.underline} />
                </View>

                {/* Reset Button with Gradient */}
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={handleResetPassword}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#FF6B9D', '#C44569', '#F8B500']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buttonGradient}
                  >
                    <Text style={styles.resetButtonText}>Reset Password</Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Back to Login Link */}
                <TouchableOpacity
                  onPress={() => navigation.navigate('Login')}
                  style={styles.backLink}
                >
                  <Text style={styles.backLinkText}>Back to Login</Text>
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
  resetButton: {
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
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  backLink: {
    alignItems: 'center',
  },
  backLinkText: {
    fontSize: 15,
    color: '#FF6B9D',
    fontWeight: '600',
  },
});
