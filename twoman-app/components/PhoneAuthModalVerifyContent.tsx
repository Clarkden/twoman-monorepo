import {
  accentGray,
  mainBackgroundColor,
  mainPurple,
  secondaryBackgroundColor,
} from "@/constants/globalStyles";

import { ChevronLeft } from "lucide-react-native";
import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

export default function PhoneAuthVerifyModal({
  onBack,
  resendCode,
  verifyCode,
  verifyError,
}: {
  onBack: () => void;
  resendCode: () => void;
  verifyCode: (code: string) => void;
  verifyError: string;
}) {
  const [code, setCode] = useState<string>("");

  return (
    <View style={{ flex: 1, backgroundColor: mainBackgroundColor }}>
      <View style={styles.nativeModalHeader}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.nativeModalTitle}>Verification</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View style={styles.contentContainer}>
          <View style={styles.headerSection}>
            <Text style={styles.mainTitle}>Enter Verification Code</Text>
            <Text style={styles.subtitle}>
              We've sent a 6-digit code to your phone number. Enter it below to
              continue.
            </Text>
          </View>

          <View style={styles.inputSection}>
            {verifyError ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{verifyError}</Text>
              </View>
            ) : null}

            <TextInput
              style={[
                styles.codeInput,
                verifyError ? styles.codeInputError : null,
              ]}
              placeholderTextColor={accentGray}
              placeholder="Enter 6-digit code"
              value={code}
              onChangeText={(text) => setCode(text)}
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              textAlign="center"
              selectionColor="white"
              cursorColor="white"
            />
          </View>

          <View style={styles.helpSection}>
            <Text style={styles.helpText}>
              Didn't receive the code? Check your spam folder or{" "}
              <Text style={styles.helpLink} onPress={resendCode}>
                resend it
              </Text>
              .
            </Text>
          </View>
        </View>

        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity
            onPress={resendCode}
            style={[styles.secondaryButton]}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Resend Code</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => verifyCode(code)}
            style={[
              styles.primaryButton,
              {
                backgroundColor:
                  code.length >= 6 ? mainPurple : secondaryBackgroundColor,
                borderWidth: code.length >= 6 ? 0 : 1,
                borderColor:
                  code.length >= 6 ? "transparent" : "rgba(163, 100, 245, 0.3)",
              },
            ]}
            disabled={code.length < 6}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.primaryButtonText,
                {
                  color: code.length >= 6 ? "white" : accentGray,
                },
              ]}
            >
              Verify Code
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  nativeModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60, // Account for status bar
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: secondaryBackgroundColor,
    alignItems: "center",
    justifyContent: "center",
  },
  nativeModalTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  headerSection: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  mainTitle: {
    color: "white",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: accentGray,
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
  },
  inputSection: {
    marginBottom: 30,
    gap: 24,
  },
  errorContainer: {
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 59, 48, 0.3)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  errorText: {
    color: "#ff3b30",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  codeInput: {
    backgroundColor: secondaryBackgroundColor,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    padding: 20,
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  codeInputError: {
    borderColor: "rgba(255, 59, 48, 0.5)",
    backgroundColor: "rgba(255, 59, 48, 0.05)",
  },
  bottomButtonContainer: {
    padding: 24,
    paddingBottom: 34,
    backgroundColor: mainBackgroundColor,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    gap: 12,
  },
  secondaryButton: {
    backgroundColor: secondaryBackgroundColor,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  primaryButton: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: mainPurple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  helpSection: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 20,
  },
  helpText: {
    color: accentGray,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 300,
  },
  helpLink: {
    color: mainPurple,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
