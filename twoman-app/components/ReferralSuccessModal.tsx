import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { X, Gift, Users } from 'lucide-react-native';
import { mainBackgroundColor, secondaryBackgroundColor } from '@/constants/globalStyles';

// TODO: Install and use Lottie animation
// import LottieView from 'lottie-react-native';

interface ReferralSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  referrerName?: string;
}

const { width, height } = Dimensions.get('window');

export default function ReferralSuccessModal({
  visible,
  onClose,
  referrerName,
}: ReferralSuccessModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView intensity={20} style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="white" />
          </TouchableOpacity>

          <View style={styles.content}>
            {/* TODO: Replace with Lottie animation */}
            <View style={styles.animationPlaceholder}>
              <Gift size={80} color="#FF6B6B" />
            </View>

            <Text style={styles.title}>Welcome to 2 Man!</Text>
            
            <Text style={styles.subtitle}>
              Referral code redeemed successfully!
            </Text>

            <View style={styles.benefitsContainer}>
              <View style={styles.benefitItem}>
                <Gift size={24} color="#4CAF50" />
                <Text style={styles.benefitText}>
                  You got 1 week of Pro free!
                </Text>
              </View>
              
              <View style={styles.benefitItem}>
                <Users size={24} color="#4CAF50" />
                <Text style={styles.benefitText}>
                  {referrerName ? `You're now friends with ${referrerName}!` : "You're now friends with your referrer!"}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.continueButton} onPress={onClose}>
              <Text style={styles.continueButtonText}>Let's Go!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  container: {
    width: width * 0.85,
    maxWidth: 400,
    backgroundColor: secondaryBackgroundColor,
    borderRadius: 20,
    padding: 0,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  animationPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 32,
  },
  benefitsContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  benefitText: {
    flex: 1,
    fontSize: 16,
    color: 'white',
  },
  continueButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});