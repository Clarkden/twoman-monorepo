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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import { LinearGradient } from "expo-linear-gradient";
import { mainBackgroundColor, mainPurple } from "@/constants/globalStyles";
import { StatusBar } from "expo-status-bar";
import { BlurView } from "expo-blur";
import { FeatureFlag, SessionData } from "@/types/api";
import apiFetch from "@/utils/fetch";
import { LucidePhone } from "lucide-react-native";
import PhoneAuthModal from "@/components/PhoneAuthModalContent";
import PhoneAuthVerifyModal from "@/components/PhoneAuthModalVerifyContent";
import { useAppleInfo, useSession } from "@/stores/auth";
import { LoginWithApple } from "@/utils/auth";

const { height: SCREEN_HEIGHT } = Dimensions.get("screen");

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
    <Text
      style={{
        color: "white",
        fontSize: screenHeight > 800 ? 100 : 60,
        fontWeight: "bold",
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
  );
}

// Individual Feature Icon Component
function FeatureIcon({ emoji, label, screenHeight }: FeatureIconProps) {
  const iconSize = screenHeight > 800 ? 100 : 80;
  const emojiSize = screenHeight > 800 ? 40 : 30;

  return (
    <View
      style={{
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
      }}
    >
      <View
        style={{
          width: iconSize,
          height: iconSize,
          borderRadius: 80,
          borderWidth: 2,
          borderColor: mainPurple,
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
      <Text style={{ color: "white", fontWeight: "700" }}>{label}</Text>
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
        marginTop: screenHeight > 800 ? 60 : 35,
      }}
    >
      <FeatureIcon emoji="🔍" label="Find" screenHeight={screenHeight} />
      <FeatureIcon emoji="😈" label="Match" screenHeight={screenHeight} />
      <FeatureIcon emoji="💬" label="Chat" screenHeight={screenHeight} />
    </View>
  );
}

// Sign In Section Component
function SignInSection({
  smsAuthEnabled,
  screenHeight,
  onAppleSignIn,
  onPhoneAuthPress,
}: SignInSectionProps) {
  return (
    <View
      style={{
        height: smsAuthEnabled ? 300 : 250,
        width: "100%",
        padding: 30,
        backgroundColor: "rgba(169,175,177, 0.2)",
        borderTopLeftRadius: 50,
        borderTopRightRadius: 50,
        gap: 20,
      }}
    >
      <Text style={{ fontSize: 20, fontWeight: "bold", color: "white" }}>
        Sign in
      </Text>

      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
        cornerRadius={15}
        style={[styles.button, { height: screenHeight > 800 ? 44 : 40 }]}
        onPress={onAppleSignIn}
      />

      {smsAuthEnabled && (
        <TouchableOpacity
          style={{
            borderRadius: 30,
            backgroundColor: "white",
            height: screenHeight > 800 ? 44 : 40,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
          }}
          onPress={onPhoneAuthPress}
        >
          <LucidePhone color="black" fill="black" width={12} height={12} />
          <Text
            style={{
              fontSize: screenHeight > 800 ? 17 : 15,
              fontWeight: "500",
            }}
          >
            Sign in with Phone Number
          </Text>
        </TouchableOpacity>
      )}

      <Text
        style={{
          color: "white",
          fontSize: 12,
          padding: 10,
        }}
      >
        <Text>By signing in, you agree to our </Text>
        <Text
          onPress={() => Linking.openURL("https://twoman.dating/terms")}
          style={{
            color: "lightgray",
            textDecorationLine: "underline",
          }}
        >
          Terms of Service
        </Text>
        <Text> and </Text>
        <Text
          onPress={() => Linking.openURL("https://twoman.dating/privacy")}
          style={{
            color: "lightgray",
            textDecorationLine: "underline",
          }}
        >
          Privacy Policy.
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
        <SafeAreaView>
          <AuthHeader screenHeight={SCREEN_HEIGHT} />
          <FeatureIcons screenHeight={SCREEN_HEIGHT} />
        </SafeAreaView>
      </View>

      <SignInSection
        smsAuthEnabled={smsAuthEnabled}
        screenHeight={SCREEN_HEIGHT}
        onAppleSignIn={handleAppleSignIn}
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
