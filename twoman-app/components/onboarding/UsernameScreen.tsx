import apiFetch from "@/utils/fetch";
import { useCallback, useEffect, useState } from "react";
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
import { globalStyles, mainPurple } from "../../constants/globalStyles";

const debounce = <F extends (...args: any[]) => void>(
  func: F,
  delay: number
): ((...args: Parameters<F>) => void) => {
  let timer: NodeJS.Timeout;
  return (...args: Parameters<F>) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

export default function NamePicker({
  onNext,
  onValueChange,
  value,
}: {
  onNext: () => void;
  onValueChange: (value: string) => void;
  value: string;
}) {
  const [availableUsername, setAvailableUsername] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [next, setNext] = useState(false);

  const handleValidateUsername = async (username: string) => {
    setIsCheckingUsername(true);
    const { valid } = await validateUsername(username);
    setAvailableUsername(valid);
    setIsCheckingUsername(false);
  };

  const debouncedValidation = useCallback(
    debounce(handleValidateUsername, 500),
    []
  );

  useEffect(() => {
    if (value) {
      debouncedValidation(value);
    }
  }, [value, debouncedValidation]);

  const handleValueChange = (value: string) => {
    const sanitizedValue = value.replace(/[^a-zA-Z0-9]/g, "");
    onValueChange(sanitizedValue.toLowerCase());
  };

  useEffect(() => {
    if (
      value.length > 3 &&
      value.length < 50 &&
      availableUsername &&
      !isCheckingUsername
    ) {
      setNext(true);
    } else {
      setNext(false);
    }
  }, [value, availableUsername, isCheckingUsername]);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <View
              style={{
                gap: 15,
                width: "100%",
                alignItems: "center",
              }}
            >
              <TextInput
                value={value}
                style={styles.input}
                onChangeText={(text: string) => handleValueChange(text)}
                placeholder="Enter a username"
                placeholderTextColor={"#6c6c6c"}
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={dismissKeyboard}
              />

              {value.length > 3 && value.length <= 50 && (
                <>
                  {!next ? (
                    <Text style={{ color: "#f05d5d" }}>
                      Username is not available
                    </Text>
                  ) : (
                    <Text style={{ color: "white" }}>Username is available</Text>
                  )}
                </>
              )}
              {value.length > 50 && (
                <Text style={{ color: "#f05d5d" }}>
                  Username must be less than 50 characters
                </Text>
              )}
              {value.length < 3 && value.length > 1 && (
                <Text style={{ color: "#f05d5d" }}>
                  Username length should at least 3 characters
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={onNext}
              style={[
                styles.nextButton,
                {
                  backgroundColor:
                    !next || isCheckingUsername ? "transparent" : "black",
                },
              ]}
              disabled={!next || isCheckingUsername}
            >
              <Text
                style={[
                  globalStyles.onBoardingNextButtonText,
                  {
                    color: !next || isCheckingUsername ? "lightgray" : "white",
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

const validateUsername = async (
  username: string
): Promise<{ valid: boolean }> => {
  try {
    const response = await apiFetch(`/profile/username?username=${username}`);

    console.log(response);

    if (!response.success) {
      return { valid: false };
    }

    return { valid: response.data as boolean };
  } catch (error) {
    console.log(error);
  }

  return { valid: false };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    gap: 15,
  },
  input: {
    width: "100%",
    padding: 15,
    borderRadius: 25,
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
