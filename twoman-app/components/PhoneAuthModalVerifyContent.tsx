import {
  accentGray,
  mainBackgroundColor,
  mainPurple,
  secondaryBackgroundColor,
} from "@/constants/globalStyles";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
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
    <SafeAreaView>
      <BlurView
        intensity={0}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 400,
          zIndex: 0,
        }}
      >
        <LinearGradient
          colors={["#9141fa", "transparent"]}
          style={{
            height: 400,
            width: "100%",
            zIndex: -1,
            opacity: 0.8,
          }}
        />
      </BlurView>
      <View
        style={{
          padding: 20,
          gap: 20,
        }}
      >
        <Pressable onPress={onBack} style={[styles.backButton]}>
          <ChevronLeft size={24} color={mainPurple} />
        </Pressable>
        {verifyError ? (
          <Text
            style={{
              color: "red",
              fontSize: 14,
              fontWeight: "400",
            }}
          >
            {verifyError}
          </Text>
        ) : null}
        <TextInput
          style={{
            padding: 20,
            backgroundColor: mainBackgroundColor,
            borderRadius: 25,
            color: "white",
          }}
          placeholderTextColor={accentGray}
          placeholder="000000"
          value={code}
          onChangeText={(text) => setCode(text)}
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          keyboardType="number-pad"
          maxLength={6}
        />
        <View
          style={{
            flexDirection: "row",
            gap: 10,
          }}
        >
          <TouchableOpacity
            onPress={resendCode}
            style={[
              styles.nextButton,
              {
                backgroundColor: secondaryBackgroundColor,
              },
            ]}
          >
            <Text style={[styles.nextButtonText]}>Resend</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => verifyCode(code)}
            style={[
              styles.nextButton,
              {
                backgroundColor: code.length < 5 ? "transparent" : mainPurple,
              },
            ]}
            disabled={code.length < 5}
          >
            <Text
              style={[
                styles.nextButtonText,
                {
                  color: code.length < 5 ? accentGray : "white",
                },
              ]}
            >
              Verify
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 45,
    height: 45,
    borderRadius: 25,
    backgroundColor: mainBackgroundColor,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButton: {
    backgroundColor: mainPurple,
    padding: 10,
    borderRadius: 25,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
