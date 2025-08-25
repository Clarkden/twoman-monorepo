import React, { useEffect, useState, useCallback } from "react";
import {
  Alert,
  StyleSheet,
  View,
  Text,
  Linking,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import { LinearGradient } from "expo-linear-gradient";
import {
  mainBackgroundColor,
  mainPurple,
  secondaryBackgroundColor,
  accentGray,
} from "@/constants/globalStyles";
import { StatusBar } from "expo-status-bar";
import { BlurView } from "expo-blur";
import { FeatureFlag, SessionData } from "@/types/api";
import apiFetch from "@/utils/fetch";
import { LucidePhone } from "lucide-react-native";
import PhoneAuthModal from "@/components/PhoneAuthModalContent";
import PhoneAuthVerifyModal from "@/components/PhoneAuthModalVerifyContent";
import { useAppleInfo, useGoogleInfo, useSession } from "@/stores/auth";
import { LoginWithApple, LoginWithGoogle } from "@/utils/auth";
import { AntDesign } from "@expo/vector-icons";
import { GoogleSigninButton } from "@react-native-google-signin/google-signin";

const { height: SCREEN_HEIGHT } = Dimensions.get("screen");
const platform = Platform.OS;

// Component prop types
interface AuthHeaderProps {
  screenHeight: number;
}

interface FeatureIconProps {
  emoji: string;
  label: string;
  screenHeight: number;
}

interface FeatureIconsProps {
  screenHeight: number;
}

interface SignInSectionProps {
  smsAuthEnabled: boolean;
  screenHeight: number;
  onAppleSignIn: () => void;
  onGoogleSignIn: () => void;
  onPhoneAuthPress: () => void;
}

interface AuthModalProps {
  visible: boolean;
  phoneAuthStep: "send" | "verify";
  phoneNumber: string;
  phoneVerifyError: string;
  setPhoneNumber: (phone: string) => void;
  onClose: () => void;
  onNextStep: () => void;
  onBackStep: () => void;
  onResendCode: () => void;
  onVerifyCode: (code: string) => void;
}

// Header Component
function AuthHeader({ screenHeight }: AuthHeaderProps) {
  return (
    <View
      style={{
        alignItems: "center",
        marginBottom: screenHeight > 800 ? 20 : 15,
        marginTop: screenHeight > 800 ? 50 : screenHeight > 700 ? 35 : 20,
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: screenHeight > 800 ? 80 : screenHeight > 700 ? 60 : 42,
          fontWeight: "900",
          textAlign: "center",
          letterSpacing: -1,
        }}
      >
        Dating But{" "}
        <Text
          style={{
            color: mainPurple,
          }}
        >
          Fun
        </Text>
      </Text>
      <Text
        style={{
          color: accentGray,
          fontSize: screenHeight > 800 ? 18 : screenHeight > 700 ? 16 : 14,
          fontWeight: "500",
          textAlign: "center",
          marginTop: screenHeight > 800 ? 8 : 6,
          letterSpacing: 0.5,
        }}
      >
        Real connections, real friends, real fun
      </Text>
    </View>
  );
}

// Individual Feature Icon Component
function FeatureIcon({ emoji, label, screenHeight }: FeatureIconProps) {
  const iconSize = screenHeight > 800 ? 100 : screenHeight > 700 ? 85 : 70;
  const emojiSize = screenHeight > 800 ? 40 : screenHeight > 700 ? 34 : 28;
  const gap = screenHeight > 800 ? 20 : screenHeight > 700 ? 16 : 12;
  const labelSize = screenHeight > 800 ? 16 : screenHeight > 700 ? 15 : 14;

  return (
    <View
      style={{
        flexDirection: "column",
        alignItems: "center",
        gap: gap,
      }}
    >
      <View
        style={{
          width: iconSize,
          height: iconSize,
          borderRadius: iconSize / 2,
          backgroundColor: "rgba(163, 100, 245, 0.15)",
          borderWidth: 2,
          borderColor: "rgba(163, 100, 245, 0.4)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontSize: emojiSize,
          }}
        >
          {emoji}
        </Text>
      </View>
      <Text
        style={{
          color: "white",
          fontWeight: "700",
          fontSize: labelSize,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// Feature Icons Container Component
function FeatureIcons({ screenHeight }: FeatureIconsProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
        marginTop: screenHeight > 800 ? 30 : screenHeight > 700 ? 25 : 20,
      }}
    >
      <FeatureIcon emoji="🔍" label="Discover" screenHeight={screenHeight} />
      <FeatureIcon emoji="💞" label="Match" screenHeight={screenHeight} />
      <FeatureIcon emoji="💬" label="Connect" screenHeight={screenHeight} />
    </View>
  );
}

// Sign In Section Component
function SignInSection({
  smsAuthEnabled,
  screenHeight,
  onAppleSignIn,
  onGoogleSignIn,
  onPhoneAuthPress,
}: SignInSectionProps) {
  return (
    <View
      style={{
        width: "100%",
        padding: screenHeight > 800 ? 30 : screenHeight > 700 ? 25 : 20,
        backgroundColor: "rgba(169, 175, 177, 0.2)",
        borderTopLeftRadius: screenHeight > 800 ? 50 : 40,
        borderTopRightRadius: screenHeight > 800 ? 50 : 40,
        gap: screenHeight > 800 ? 20 : screenHeight > 700 ? 18 : 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      }}
    >
      <View
        style={{
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <Text
          style={{
            fontSize: screenHeight > 800 ? 24 : screenHeight > 700 ? 22 : 20,
            fontWeight: "800",
            color: "white",
            marginBottom: 4,
          }}
        >
          Get Started
        </Text>
        <Text
          style={{
            color: accentGray,
            fontSize: screenHeight > 800 ? 16 : screenHeight > 700 ? 15 : 14,
            fontWeight: "500",
          }}
        >
          Sign in to start your dating journey
        </Text>
      </View>

      {Platform.OS === "ios" && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
          cornerRadius={15}
          style={[
            styles.button,
            {
              height: screenHeight > 800 ? 52 : 48,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 8,
            },
          ]}
          onPress={onAppleSignIn}
        />
      )}

      {Platform.OS === "android" && (
        <TouchableOpacity
          style={[
            styles.button,
            {
              height: screenHeight > 800 ? 52 : 48,
              backgroundColor: "#ffffff",
              borderRadius: 15,
              borderWidth: 1,
              borderColor: "#dadce0",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 4,
            },
          ]}
          onPress={onGoogleSignIn}
          activeOpacity={0.8}
        >
          <AntDesign name="google" size={24} color="black" />
          <Text
            style={{
              fontSize: screenHeight > 800 ? 18 : 16,
              fontWeight: "600",
              color: "#3c4043",
              fontFamily: platform === "ios" ? "System" : "Roboto",
              letterSpacing: 0.25,
            }}
          >
            Sign in with Google
          </Text>
        </TouchableOpacity>
      )}

      {smsAuthEnabled && (
        <TouchableOpacity
          style={{
            borderRadius: 15,
            backgroundColor: "rgba(255, 255, 255, 0.15)",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.3)",
            height: screenHeight > 800 ? 52 : 48,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
          }}
          onPress={onPhoneAuthPress}
          activeOpacity={0.8}
        >
          <LucidePhone color="white" width={16} height={16} />
          <Text
            style={{
              fontSize: screenHeight > 800 ? 17 : 15,
              fontWeight: "600",
              color: "white",
            }}
          >
            Sign in with Phone
          </Text>
        </TouchableOpacity>
      )}

      <Text
        style={{
          color: accentGray,
          fontSize: 12,
          textAlign: "center",
          lineHeight: 16,
          marginTop: 8,
        }}
      >
        <Text>By signing in, you agree to our </Text>
        <Text
          onPress={() => Linking.openURL("https://twoman.dating/terms")}
          style={{
            color: "rgba(255, 255, 255, 0.8)",
            textDecorationLine: "underline",
            fontWeight: "500",
          }}
        >
          Terms of Service
        </Text>
        <Text> and </Text>
        <Text
          onPress={() => Linking.openURL("https://twoman.dating/privacy")}
          style={{
            color: "rgba(255, 255, 255, 0.8)",
            textDecorationLine: "underline",
            fontWeight: "500",
          }}
        >
          Privacy Policy
        </Text>
      </Text>
    </View>
  );
}

// Auth Modal Component
function AuthModal({
  visible,
  phoneAuthStep,
  phoneNumber,
  phoneVerifyError,
  setPhoneNumber,
  onClose,
  onNextStep,
  onBackStep,
  onResendCode,
  onVerifyCode,
}: AuthModalProps) {
  return (
    <Modal visible={visible} onRequestClose={onClose} animationType="slide">
      <View
        style={{
          flex: 1,
          backgroundColor: mainBackgroundColor,
        }}
      >
        <ScrollView>
          {phoneAuthStep === "send" ? (
            <PhoneAuthModal
              phoneNumber={phoneNumber}
              setPhoneNumber={setPhoneNumber}
              onClose={onClose}
              onNext={onNextStep}
            />
          ) : (
            <PhoneAuthVerifyModal
              onBack={onBackStep}
              resendCode={onResendCode}
              verifyCode={onVerifyCode}
              verifyError={phoneVerifyError}
            />
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// Background Component
function AuthBackground() {
  return (
    <>
      <StatusBar style={"light"} />
      <BlurView
        intensity={0}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 500,
          zIndex: 0,
        }}
      >
        <LinearGradient
          colors={["transparent", "#9141fa"]}
          style={{
            height: 500,
            width: "100%",
            zIndex: -1,
            opacity: 0.8,
          }}
        />
      </BlurView>
    </>
  );
}

// Main Auth Component
export default function Auth() {
  const { session, setSession } = useSession();
  const { setAppleInfo } = useAppleInfo();
  const { setGoogleInfo } = useGoogleInfo();
  const router = useRouter();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [smsAuthEnabled, setSMSAuthEnabled] = useState(false);
  const [phoneAuthStep, setPhoneAuthStep] = useState<"send" | "verify">("send");
  const [phoneAuthModalVisible, setPhoneAuthModalVisible] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [phoneVerifyError, setPhoneVerifyError] = useState<string>("");
  const [attemptedToVerify, setAttemptedToVerify] = useState(false);

  const handleAppleSignIn = async () => {
    setIsAuthenticating(true);
    try {
      const { sessionData, appleUserId, appleUserName } =
        await LoginWithApple();
      if (sessionData) {
        setSession(sessionData);
        setAppleInfo(appleUserId, appleUserName);
        router.push("/(app)/");
      } else {
        Alert.alert("Error", "Apple sign in failed. Please try again.");
      }
    } catch (error) {
      console.error("Apple sign in error:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    try {
      const { sessionData, googleUserId, googleUserName } =
        await LoginWithGoogle();
      if (sessionData) {
        setSession(sessionData);
        setGoogleInfo(googleUserId, googleUserName);
        router.push("/(app)/");
      } else {
        Alert.alert("Error", "Google sign in failed. Please try again.");
      }
    } catch (error) {
      console.error("Google sign in error:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGetSMSAuthFlag = useCallback(async () => {
    try {
      const response = await apiFetch<FeatureFlag>("/flag/sms");

      if (!response.success) {
        console.log(response);
        return;
      }

      if (response.data.IsEnabled) {
        setSMSAuthEnabled(true);
      }
    } catch (error) {
      console.log(error);
    }
  }, []);

  const handlePhoneAuth = useCallback(async (phone: string) => {
    if (!phone) return;

    try {
      const response = await apiFetch("/auth/phone", {
        method: "POST",
        body: {
          phone_number: phone,
        },
      });

      if (!response.success) {
        console.log(response);
        return;
      }
    } catch (error) {
      console.log(error);
    }
  }, []);

  const handlePhoneAuthVerify = async (phone: string, code: string) => {
    if (!phone || !code) {
      return;
    }

    setPhoneVerifyError("");

    try {
      const response = await apiFetch<SessionData>("/auth/phone/verify", {
        method: "POST",
        body: {
          phone_number: phone,
          code: code,
        },
      });

      if (!response.success) {
        setPhoneVerifyError(response.error);
        return;
      }

      setSession(response.data);

      console.log("successful external auth login");
      setPhoneAuthModalVisible(false);
      router.push("/(app)/");
    } catch (error) {
      console.log(error);
    }
  };

  const handlePhoneAuthModalClose = () => {
    setPhoneAuthModalVisible(false);
    setPhoneAuthStep("send");
    setAttemptedToVerify(false);
    setPhoneVerifyError("");
  };

  const handlePhoneAuthNextStep = () => {
    setPhoneAuthStep("verify");
  };

  const handlePhoneAuthBackStep = () => {
    setPhoneAuthStep("send");
    setAttemptedToVerify(false);
    setPhoneVerifyError("");
  };

  const handleResendCode = () => {
    handlePhoneAuth(phoneNumber);
  };

  const handleVerifyCode = (code: string) => {
    handlePhoneAuthVerify(phoneNumber, code);
  };

  useEffect(() => {
    if (phoneAuthStep === "verify" && !attemptedToVerify && phoneNumber) {
      handlePhoneAuth(phoneNumber);
      setAttemptedToVerify(true);
    }
  }, [phoneAuthStep, attemptedToVerify, phoneNumber, handlePhoneAuth]);

  useEffect(() => {
    handleGetSMSAuthFlag();
  }, [handleGetSMSAuthFlag]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: mainBackgroundColor,
      }}
    >
      <AuthModal
        visible={phoneAuthModalVisible}
        phoneAuthStep={phoneAuthStep}
        phoneNumber={phoneNumber}
        phoneVerifyError={phoneVerifyError}
        setPhoneNumber={setPhoneNumber}
        onClose={handlePhoneAuthModalClose}
        onNextStep={handlePhoneAuthNextStep}
        onBackStep={handlePhoneAuthBackStep}
        onResendCode={handleResendCode}
        onVerifyCode={handleVerifyCode}
      />

      <AuthBackground />

      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1, justifyContent: "center" }}>
          <AuthHeader screenHeight={SCREEN_HEIGHT} />
          <FeatureIcons screenHeight={SCREEN_HEIGHT} />
        </SafeAreaView>
      </View>

      <SignInSection
        smsAuthEnabled={smsAuthEnabled}
        screenHeight={SCREEN_HEIGHT}
        onAppleSignIn={handleAppleSignIn}
        onGoogleSignIn={handleGoogleSignIn}
        onPhoneAuthPress={() => setPhoneAuthModalVisible(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: 20,
    borderBottomEndRadius: 50,
    borderBottomLeftRadius: 50,
  },
  button: {
    width: "100%",
  },
  graphicContainer: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
});
