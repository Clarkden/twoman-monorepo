import { OnboardScreenProps } from "@/app/(app)/onboard";
import { globalStyles, mainPurple } from "@/constants/globalStyles";
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

export default function BioPicker({
  value,
  onValueChange,
  onNext,
}: OnboardScreenProps<string>) {
  const [localValue, setLocalValue] = useState(value);
  const [next, setNext] = useState(false);

  useEffect(() => {
    onValueChange(localValue);

    if (localValue.length > 2 && localValue.length < 200) {
      setNext(true);
    } else {
      setNext(false);
    }
  }, [localValue]);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <View style={{ width: "100%" }}>
              <View
                style={{
                  width: "100%",
                  alignItems: "flex-end",
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{
                    color: localValue.length > 200 ? "#f05d5d" : "lightgray",
                    fontSize: 14,
                    fontWeight: "500",
                    opacity: localValue.length > 100 ? 1 : 0,
                  }}
                >
                  {localValue.length}/200
                </Text>
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  value={localValue}
                  style={styles.input}
                  onChangeText={(text: string) => setLocalValue(text)}
                  placeholder="Enter a short bio"
                  placeholderTextColor={"#6c6c6c"}
                  multiline
                  returnKeyType="done"
                  blurOnSubmit={true}
                  onSubmitEditing={dismissKeyboard}
                />
              </View>
            </View>
            <TouchableOpacity
              onPress={onNext}
              style={[
                styles.nextButton,
                {
                  backgroundColor: !next ? "transparent" : "black",
                },
              ]}
              disabled={!next}
            >
              <Text
                style={[
                  globalStyles.onBoardingNextButtonText,
                  {
                    color: !next ? "lightgray" : "white",
                  },
                ]}
              >
                Next
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    flex: 1,
  },
  inputContainer: {
    width: "100%",
    height: 100,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    backgroundColor: "white",
    color: "black",
  },
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
