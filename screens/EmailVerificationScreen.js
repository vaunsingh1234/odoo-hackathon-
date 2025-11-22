import React, { useState, useEffect } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { verifyEmail, resendVerificationCode } from '../database/db';

export default function EmailVerificationScreen({ route, navigation }) {
  const { emailId, verificationCode } = route.params || {};
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [showCode, setShowCode] = useState(true); // Show code by default

  useEffect(() => {
    // Show the verification code in an alert (since we can't actually send emails offline)
    if (verificationCode) {
      Alert.alert(
        '📧 Email Verification Code',
        `Your verification code has been sent to:\n\n${emailId}\n\nVerification Code: ${verificationCode}\n\n(For demo purposes, code is shown here since app works offline. In production, this would be sent via email.)`,
        [{ text: 'Got it!' }]
      );
    }

    // Countdown timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [verificationCode, emailId]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerify = async () => {
    if (!code.trim() || code.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit verification code');
      return;
    }

    setIsVerifying(true);
    try {
      const verified = await verifyEmail(emailId, code.trim());
      if (verified) {
        Alert.alert(
          'Success',
          'Email verified successfully! You can now login.',
          [
            {
              text: 'OK',
              onPress: () => navigation.replace('Login'),
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Invalid verification code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    try {
      const newCode = await resendVerificationCode(emailId);
      setTimeLeft(600); // Reset timer
      setShowCode(true); // Show the new code
      Alert.alert(
        '📧 Code Resent',
        `New verification code sent to:\n\n${emailId}\n\nVerification Code: ${newCode}\n\n(For demo purposes, code is shown here since app works offline. In production, this would be sent via email.)`,
        [{ text: 'Got it!' }]
      );
      // Update the route params to show new code
      route.params.verificationCode = newCode;
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to resend code. Please try again.');
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
                <Text style={styles.title}>Verify Your Email</Text>
              </View>

              {/* Form Content */}
              <View style={styles.formContent}>
                <Text style={styles.infoText}>
                  We've sent a verification code to:
                </Text>
                <Text style={styles.emailText}>{emailId}</Text>
                
                {/* Email Preview Card */}
                <View style={styles.emailCard}>
                  <View style={styles.emailHeader}>
                    <Text style={styles.emailSubject}>📧 Security Alert - Verification Code</Text>
                    <Text style={styles.emailFrom}>From: noreply@inventoryapp.com</Text>
                  </View>
                  <View style={styles.emailBody}>
                    <Text style={styles.emailBodyText}>
                      Your verification code is:
                    </Text>
                    {showCode && verificationCode ? (
                      <View style={styles.codeDisplayBox}>
                        <Text style={styles.codeDisplayText}>{verificationCode}</Text>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        onPress={() => setShowCode(true)}
                        style={styles.showCodeButton}
                      >
                        <Text style={styles.showCodeText}>Tap to show code</Text>
                      </TouchableOpacity>
                    )}
                    <Text style={styles.emailBodyTextSmall}>
                      This code will expire in 10 minutes.
                    </Text>
                    <Text style={styles.emailBodyTextSmall}>
                      (For demo: Code shown here since app works offline)
                    </Text>
                  </View>
                </View>

                <Text style={styles.infoTextSmall}>
                  Please enter the 6-digit code below
                </Text>

                {/* Verification Code Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Verification Code</Text>
                  <TextInput
                    style={styles.codeInput}
                    placeholder="000000"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={code}
                    onChangeText={(text) => setCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                  <View style={styles.underline} />
                </View>

                {/* Timer */}
                {timeLeft > 0 && (
                  <Text style={styles.timerText}>
                    Code expires in: {formatTime(timeLeft)}
                  </Text>
                )}

                {/* Verify Button */}
                <TouchableOpacity
                  style={[styles.verifyButton, isVerifying && styles.verifyButtonDisabled]}
                  onPress={handleVerify}
                  activeOpacity={0.8}
                  disabled={isVerifying}
                >
                  <LinearGradient
                    colors={['#FF6B9D', '#C44569', '#F8B500']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buttonGradient}
                  >
                    <Text style={styles.verifyButtonText}>
                      {isVerifying ? 'Verifying...' : 'Verify Email'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Resend Code */}
                <TouchableOpacity
                  onPress={handleResendCode}
                  style={styles.resendLink}
                  disabled={timeLeft > 0}
                >
                  <Text style={[styles.resendText, timeLeft > 0 && styles.resendTextDisabled]}>
                    {timeLeft > 0 ? `Resend code in ${formatTime(timeLeft)}` : 'Resend Code'}
                  </Text>
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
  infoText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    color: '#FF6B9D',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 20,
  },
  infoTextSmall: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  emailCard: {
    backgroundColor: '#1A1625',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 157, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  emailHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 12,
    marginBottom: 12,
  },
  emailSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  emailFrom: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  emailBody: {
    paddingTop: 8,
  },
  emailBodyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
    lineHeight: 20,
  },
  emailBodyTextSmall: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 8,
    lineHeight: 18,
  },
  codeDisplayBox: {
    backgroundColor: '#FF6B9D',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginVertical: 12,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  codeDisplayText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 8,
  },
  showCodeButton: {
    backgroundColor: 'rgba(255, 107, 157, 0.2)',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#FF6B9D',
    borderStyle: 'dashed',
  },
  showCodeText: {
    fontSize: 14,
    color: '#FF6B9D',
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 10,
    fontWeight: '600',
  },
  codeInput: {
    fontSize: 32,
    color: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 0,
    fontWeight: 'bold',
    letterSpacing: 8,
    textAlign: 'center',
  },
  underline: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginTop: 8,
    borderRadius: 1,
  },
  timerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 30,
  },
  verifyButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 25,
    shadowColor: '#FF6B9D',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  resendLink: {
    alignItems: 'center',
  },
  resendText: {
    fontSize: 15,
    color: '#FF6B9D',
    fontWeight: '600',
  },
  resendTextDisabled: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
});

