import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Share } from 'react-native';

export const REFERRAL_DEEP_LINK_PREFIX = 'twoman://invite/';
export const REFERRAL_UNIVERSAL_LINK_PREFIX = 'https://twoman.dating/invite/';

export interface ReferralLinkData {
  referralCode: string;
}

// Parse referral code from deep link URL
export function parseReferralLink(url: string): ReferralLinkData | null {
  try {
    let referralCode = '';
    
    if (url.startsWith(REFERRAL_DEEP_LINK_PREFIX)) {
      referralCode = url.replace(REFERRAL_DEEP_LINK_PREFIX, '');
    } else if (url.startsWith(REFERRAL_UNIVERSAL_LINK_PREFIX)) {
      referralCode = url.replace(REFERRAL_UNIVERSAL_LINK_PREFIX, '');
    }
    
    // Validate referral code format (8 characters, alphanumeric)
    if (referralCode.length === 8 && /^[A-Z0-9]+$/.test(referralCode)) {
      return { referralCode };
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing referral link:', error);
    return null;
  }
}

// Generate referral deep link
export function generateReferralLink(referralCode: string): string {
  return `${REFERRAL_DEEP_LINK_PREFIX}${referralCode}`;
}

// Generate universal referral link
export function generateUniversalReferralLink(referralCode: string): string {
  return `${REFERRAL_UNIVERSAL_LINK_PREFIX}${referralCode}`;
}

// Generate shareable referral link with fallback
export function generateShareableReferralLink(referralCode: string): string {
  // Use universal link for sharing so it works for users without the app
  return generateUniversalReferralLink(referralCode);
}

// Hook to handle deep link navigation
export function useDeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    // Handle initial URL when app is opened from a deep link
    const handleInitialURL = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          handleDeepLink(initialUrl);
        }
      } catch (error) {
        console.error('Error getting initial URL:', error);
      }
    };

    // Handle URLs when app is already running
    const handleUrlChange = (event: { url: string }) => {
      handleDeepLink(event.url);
    };

    const handleDeepLink = (url: string) => {
      console.log('Received deep link:', url);
      
      const referralData = parseReferralLink(url);
      if (referralData) {
        // Store referral code for use during registration
        storeReferralCode(referralData.referralCode);
        
        // Navigate to appropriate screen
        // If user is not logged in, go to auth screen
        // If user is logged in, show referral info
        router.push('/auth' as any); // Type assertion for now
      }
    };

    handleInitialURL();
    
    const subscription = Linking.addEventListener('url', handleUrlChange);

    return () => {
      subscription?.remove();
    };
  }, [router]);
}

// Store referral code in AsyncStorage for use during registration
export async function storeReferralCode(referralCode: string): Promise<void> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem('@referral_code', referralCode);
    console.log('Stored referral code:', referralCode);
  } catch (error) {
    console.error('Error storing referral code:', error);
  }
}

// Retrieve stored referral code
export async function getStoredReferralCode(): Promise<string | null> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const referralCode = await AsyncStorage.getItem('@referral_code');
    return referralCode;
  } catch (error) {
    console.error('Error getting stored referral code:', error);
    return null;
  }
}

// Clear stored referral code after use
export async function clearStoredReferralCode(): Promise<void> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.removeItem('@referral_code');
    console.log('Cleared stored referral code');
  } catch (error) {
    console.error('Error clearing stored referral code:', error);
  }
}

// Share referral link using native share
export async function shareReferralLink(referralCode: string, userName?: string): Promise<void> {
  try {
    const referralLink = generateShareableReferralLink(referralCode);
    
    const message = userName 
      ? `Hey! Join me on 2 Man using my referral code ${referralCode}. Download the app and use this link: ${referralLink}`
      : `Join 2 Man and get 1 month Pro free! Use my referral code ${referralCode} or this link: ${referralLink}`;

    await Share.share({
      message: message,
      url: referralLink, // iOS only
      title: 'Join 2 Man - Get 1 Month Pro Free!',
    });
  } catch (error) {
    console.error('Error sharing referral link:', error);
    throw error;
  }
}