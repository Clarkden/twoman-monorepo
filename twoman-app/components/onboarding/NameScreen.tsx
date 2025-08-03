import { useAppleInfo } from "@/stores/auth";
import { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { globalStyles } from "../../constants/globalStyles";

export default function NamePicker({
  onNext,
  onValueChange,
  value,
}: {
  onNext: () => void;
  onValueChange: (value: string) => void;
  value: string;
}) {
  const { name } = useAppleInfo();

  const [next, setNext] = useState(false);

  const handleValueChange = (value: string) => {
    onValueChange(value);
  };

  useEffect(() => {
    if (value.length > 2 && value.length < 50) {
      setNext(true);
    } else {
      setNext(false);
    }
  }, [value]);

  useEffect(() => {
    if (name) {
      onValueChange(name);
    }
  }, [name, onValueChange]);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View style={{ flex: 1, padding: 20, justifyContent: "space-between" }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.container}>
              <TextInput
                value={value}
                style={styles.input}
                onChangeText={(text: string) => handleValueChange(text)}
                placeholder="Enter your first name"
                placeholderTextColor={"#6c6c6c"}
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={dismissKeyboard}
              />
              {value.length > 50 && (
                <Text style={{ color: "#f05d5d" }}>
                  Name must be less than 50 characters
                </Text>
              )}
            </View>
          </ScrollView>

          {next && (
            <View style={globalStyles.onboardingNextButtonContainer}>
              <TouchableOpacity
                onPress={onNext}
                style={globalStyles.onboardingNextButton}
                activeOpacity={0.8}
              >
                <Text style={globalStyles.onBoardingNextButtonText}>
                  Continue
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    gap: 15,
  },
  headerContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    color: "white",
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
  },
  input: {
    width: "100%",
    padding: 15,
    borderRadius: 25,
    backgroundColor: "white",
    color: "black",
  },
  nextButton: {
    backgroundColor: "black",
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
