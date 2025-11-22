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
import { createUser, loginIdExists, emailIdExists } from '../database/db';

export default function SignUpScreen({ navigation }) {
  const [loginId, setLoginId] = useState('');
  const [emailId, setEmailId] = useState('');
  const [password, setPassword] = useState('');
  const [reEnterPassword, setReEnterPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateLoginId = (id) => {
    return id.length >= 6 && id.length <= 12;
  };

  const validateEmail = (email) => {
    // More robust email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const trimmedEmail = email.trim();
    
    // Check for multiple @ symbols
    const atCount = (trimmedEmail.match(/@/g) || []).length;
    if (atCount !== 1) {
      return false;
    }
    
    return emailRegex.test(trimmedEmail);
  };

  const validatePassword = (pwd) => {
    // Must contain: lowercase, uppercase, special character, and length > 8
    const hasLowerCase = /[a-z]/.test(pwd);
    const hasUpperCase = /[A-Z]/.test(pwd);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/;'~`]/.test(pwd);
    const hasMinLength = pwd.length > 8;
    
    return hasLowerCase && hasUpperCase && hasSpecialChar && hasMinLength;
  };

  const handleSignUp = async () => {
    if (isSubmitting) return;

    // Validation
    if (!loginId.trim() || !emailId.trim() || !password.trim() || !reEnterPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!validateLoginId(loginId.trim())) {
      Alert.alert('Error', 'Login ID must be between 6-12 characters');
      return;
    }

    const trimmedEmail = emailId.trim();
    if (!validateEmail(trimmedEmail)) {
      Alert.alert('Error', 'Please enter a valid email address\n\nMake sure:\n- Email has only one @ symbol\n- Valid format: name@domain.com');
      return;
    }

    if (!validatePassword(password)) {
      Alert.alert(
        'Error',
        'Password must contain:\n- At least one lowercase letter\n- At least one uppercase letter\n- At least one special character\n- More than 8 characters'
      );
      return;
    }

    if (password !== reEnterPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if loginId already exists in SQLite database
      if (await loginIdExists(loginId.trim())) {
        Alert.alert('Error', 'Login ID already exists. Please choose a different one.');
        setIsSubmitting(false);
        return;
      }

      // Check if email already exists in SQLite database
      if (await emailIdExists(trimmedEmail)) {
        Alert.alert('Error', 'Email ID already exists in the database');
        setIsSubmitting(false);
        return;
      }

      // Generate 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Create new user in SQLite database with verification code
      await createUser(loginId.trim(), trimmedEmail, password, verificationCode);

      // Navigate to email verification screen
      navigation.navigate('EmailVerification', {
        emailId: trimmedEmail,
        verificationCode: verificationCode,
      });
    } catch (error) {
      console.error('Sign up error:', error);
      if (error.message === 'Login ID already exists') {
        Alert.alert('Error', 'Login ID already exists. Please choose a different one.');
      } else if (error.message === 'Email ID already exists') {
        Alert.alert('Error', 'Email ID already exists in the database');
      } else {
        Alert.alert('Error', `An error occurred during sign up: ${error.message}`);
      }
    } finally {
      setIsSubmitting(false);
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
                <Text style={styles.title}>Get on Board</Text>
              </View>

              {/* Form Content */}
              <View style={styles.formContent}>
                {/* Login Id Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Login Id</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="6-12 characters"
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
                    placeholder="your.email@example.com"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={emailId}
                    onChangeText={setEmailId}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <View style={styles.underline} />
                </View>

                {/* Password Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Enter Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Min 8 chars, uppercase, lowercase, special"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <View style={styles.underline} />
                </View>

                {/* Confirm Password Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter your password"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={reEnterPassword}
                    onChangeText={setReEnterPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <View style={styles.underline} />
                </View>

                {/* Terms Text */}
                <Text style={styles.termsText}>
                  By creating an account, you agree to the <Text style={styles.termsLink}>Terms and Use</Text> and <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>

                {/* Sign Up Button with Gradient */}
                <TouchableOpacity
                  style={[styles.signUpButton, isSubmitting && styles.signUpButtonDisabled]}
                  onPress={handleSignUp}
                  activeOpacity={0.8}
                  disabled={isSubmitting}
                >
                  <LinearGradient
                    colors={['#FF6B9D', '#C44569', '#F8B500']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buttonGradient}
                  >
                    <Text style={styles.signUpButtonText}>
                      {isSubmitting ? 'Creating Account...' : 'Sign Up'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Sign In Link */}
                <TouchableOpacity
                  onPress={() => navigation.navigate('Login')}
                  style={styles.signInLink}
                >
                  <Text style={styles.signInLinkText}>I am already a member</Text>
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
  termsText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 18,
  },
  termsLink: {
    color: '#FF6B9D',
    fontWeight: '600',
  },
  signUpButton: {
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
  signUpButtonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signUpButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  signInLink: {
    alignItems: 'center',
  },
  signInLinkText: {
    fontSize: 15,
    color: '#FF6B9D',
    fontWeight: '600',
  },
});
