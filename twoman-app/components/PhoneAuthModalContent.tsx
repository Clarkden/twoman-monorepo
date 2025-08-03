import {
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Pressable,
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
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

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
        }}
      >
        <StatusBar style="dark" />
        <View style={styles.container}>
          <Pressable onPress={onClose}>
            <LucideX color="white" />
          </Pressable>
          <Text
            style={{
              color: "white",
              fontSize: 20,
              fontWeight: "bold",
            }}
          >
            Enter Phone Number
          </Text>
          <SafeAreaView style={styles.wrapper}>
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
              containerStyle={{
                backgroundColor: "#000",
                borderRadius: 25,
                overflow: "hidden",
                width: "100%",
              }}
              textContainerStyle={{
                backgroundColor: "#000",
              }}
              codeTextStyle={{
                color: "white",
              }}
              textInputStyle={{
                color: "white",
              }}
              textInputProps={{
                placeholderTextColor: "gray",
              }}
              withDarkTheme
              autoFocus
            />
            <TouchableOpacity
              onPress={onNext}
              style={[
                styles.nextButton,
                {
                  backgroundColor: !valid ? "transparent" : mainPurple,
                  marginTop: 20,
                },
              ]}
              disabled={!valid}
            >
              <Text
                style={[
                  styles.nextButtonText,
                  {
                    color: !valid ? accentGray : "white",
                  },
                ]}
              >
                Next
              </Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  button: {},
  container: {
    gap: 20,
  },
  wrapper: {},
  message: {},
  nextButton: {
    backgroundColor: mainPurple,
    padding: 10,
    borderRadius: 25,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
