import {
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import PhoneInput from "react-native-phone-number-input";
import { useState, useRef, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { LucideX } from "lucide-react-native";
import {
  accentGray,
  mainBackgroundColor,
  mainPurple,
  secondaryBackgroundColor,
} from "@/constants/globalStyles";

export default function PhoneAuthModal({
  phoneNumber,
  setPhoneNumber,
  onClose,
  onNext,
}: {
  phoneNumber: string;
  setPhoneNumber: (phoneNumber: string) => void;
  onClose: () => void;
  onNext: () => void;
}) {
  const [value, setValue] = useState("");
  const [formattedValue, setFormattedValue] = useState("");
  const [valid, setValid] = useState(false);
  const phoneInput = useRef<PhoneInput>(null);

  useEffect(() => {
    setPhoneNumber(formattedValue);

    const checkValid = phoneInput.current?.isValidNumber(value);
    setValid(checkValid ? checkValid : false);
  }, [formattedValue]);

  return (
    <View style={{ flex: 1, backgroundColor: mainBackgroundColor }}>
      <StatusBar style="light" />

      <View style={styles.nativeModalHeader}>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          activeOpacity={0.7}
        >
          <LucideX color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.nativeModalTitle}>Phone Number</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View style={styles.contentContainer}>
          <View style={styles.headerSection}>
            <Text style={styles.mainTitle}>Enter Your Number</Text>
            <Text style={styles.subtitle}>
              We'll send you a verification code to confirm your phone number
            </Text>
          </View>

          <View style={styles.inputSection}>
            <PhoneInput
              ref={phoneInput}
              defaultValue={value}
              defaultCode="US"
              layout="first"
              onChangeText={(text) => {
                setValue(text);
              }}
              onChangeFormattedText={(text) => {
                setFormattedValue(text);
              }}
              containerStyle={styles.phoneInputContainer}
              textContainerStyle={styles.phoneTextContainer}
              codeTextStyle={styles.phoneCodeText}
              textInputStyle={styles.phoneTextInput}
              placeholder="Phone number"
              textInputProps={{
                placeholderTextColor: accentGray,
                selectionColor: "white",
                cursorColor: "white",
              }}
              flagButtonStyle={styles.flagButton}
              countryPickerButtonStyle={styles.countryPickerButton}
              renderDropdownImage={
                <Text style={{ color: "white", fontSize: 16 }}>▼</Text>
              }
              withDarkTheme
              autoFocus
            />
          </View>

          <View style={styles.disclaimerSection}>
            <Text style={styles.disclaimerText}>
              By continuing, you may receive SMS messages for verification and
              security purposes.
            </Text>
          </View>
        </View>

        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity
            onPress={onNext}
            style={[
              styles.nextButton,
              {
                backgroundColor: valid ? mainPurple : secondaryBackgroundColor,
                borderWidth: valid ? 0 : 1,
                borderColor: valid ? "transparent" : "rgba(163, 100, 245, 0.3)",
              },
            ]}
            disabled={!valid}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.nextButtonText,
                {
                  color: valid ? "white" : accentGray,
                },
              ]}
            >
              Send Code
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
  closeButton: {
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
  },
  phoneInputContainer: {
    backgroundColor: secondaryBackgroundColor,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  phoneTextContainer: {
    backgroundColor: secondaryBackgroundColor,
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255, 255, 255, 0.1)",
  },
  phoneCodeText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  phoneTextInput: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  flagButton: {
    backgroundColor: "transparent",
  },
  countryPickerButton: {
    backgroundColor: "transparent",
  },
  bottomButtonContainer: {
    padding: 24,
    paddingBottom: 34, // Extra padding for safe area
    backgroundColor: mainBackgroundColor,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  nextButton: {
    paddingVertical: 18,
    borderRadius: 16,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: mainPurple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  disclaimerSection: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 20,
  },
  disclaimerText: {
    color: accentGray,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
    maxWidth: 300,
  },
});
