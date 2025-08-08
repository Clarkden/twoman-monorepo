import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import {
  mainBackgroundColor,
  secondaryBackgroundColor,
  mainPurple,
  globalStyles,
} from "../constants/globalStyles";
import { useSession } from "../stores/auth";
import { useWebSocketStore } from "../stores/websocketStore";

const { height } = Dimensions.get("window");

interface ConnectionErrorScreenProps {
  visible: boolean;
}

export default function ConnectionErrorScreen({
  visible,
}: ConnectionErrorScreenProps) {
  const { setSession } = useSession();
  const { manualRetry } = useWebSocketStore();

  if (!visible) return null;

  const handleRetryConnection = () => {
    console.log("User tapped retry connection");
    manualRetry();
  };

  const handleLogout = () => {
    console.log("User chose to logout from connection error screen");
    setSession(null);
  };

  return (
    <View style={styles.container}>
      {/* Main Content - Centered */}
      <View style={styles.content}>
        {/* Error Icon */}
        <View style={styles.iconContainer}>
          <FontAwesome name="exclamation-triangle" size={64} color="#ff6b6b" />
        </View>

        {/* Error Message */}
        <Text style={styles.title}>Connection Problem</Text>
        <Text style={styles.subtitle}>
          We're having trouble connecting to our servers. This might be due to a
          network issue or server maintenance.
        </Text>
      </View>

      {/* Action Buttons - Bottom */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[
            globalStyles.onboardingNextButton,
            styles.buttonRow,
            styles.retryButton,
          ]}
          onPress={handleRetryConnection}
          activeOpacity={0.8}
        >
          <FontAwesome name="refresh" size={20} color="white" />
          <Text
            style={[globalStyles.onBoardingNextButtonText, { marginLeft: 8 }]}
          >
            Retry Connection
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            globalStyles.onboardingNextButton,
            styles.logoutButton,
            styles.buttonRow,
          ]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <FontAwesome name="sign-out" size={20} color="#ff6b6b" />
          <Text
            style={[
              globalStyles.onBoardingNextButtonText,
              styles.logoutButtonText,
              { marginLeft: 8 },
            ]}
          >
            Logout
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: mainBackgroundColor,
    flex: 1,
    zIndex: 9999,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: "white",
    textAlign: "center",
    opacity: 0.8,
    lineHeight: 24,
  },
  buttonsContainer: {
    width: "100%",
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  retryButton: {
    backgroundColor: mainPurple,
  },
  logoutButton: {
    backgroundColor: secondaryBackgroundColor,
    borderWidth: 2,
    borderColor: "#ff6b6b",
  },
  logoutButtonText: {
    color: "#ff6b6b",
  },
});
