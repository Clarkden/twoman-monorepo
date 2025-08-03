import { Gender, OnboardScreenProps } from "@/app/(app)/onboard";
import { MaterialIcons } from "@expo/vector-icons";
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { globalStyles } from "../../constants/globalStyles";

const SCREEN_WIDTH = Dimensions.get("screen").width;

export default function GenderPicker({
  onNext,
  value,
  onValueChange,
}: OnboardScreenProps<Gender>) {
  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "space-between" }}>
      <View style={styles.container}>
        <Pressable
          onPress={() => onValueChange("male")}
          style={[
            styles.genderButton,
            {
              backgroundColor:
                value === "male" ? "#6499f5" : "rgba(38, 38, 38, 0.2)",
            },
          ]}
        >
          <MaterialIcons
            name="boy"
            size={82}
            color={value === "male" ? "#000" : "#6499f5"}
          />
        </Pressable>
        <Pressable
          onPress={() => onValueChange("female")}
          style={[
            styles.genderButton,
            {
              backgroundColor:
                value === "female" ? "#e964f5" : "rgba(38, 38, 38, 0.2)",
            },
          ]}
        >
          <MaterialIcons
            name="girl"
            size={82}
            color={value === "female" ? "#000" : "#e964f5"}
          />
        </Pressable>
      </View>
      <View style={globalStyles.onboardingNextButtonContainer}>
        <TouchableOpacity
          onPress={onNext}
          style={[
            globalStyles.onboardingNextButton,
            {
              backgroundColor: value === null ? "transparent" : "black",
            },
          ]}
          disabled={value === null}
        >
          <Text
            style={[
              globalStyles.onBoardingNextButtonText,
              { color: value === null ? "lightgray" : "white" },
            ]}
          >
            Next
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 20,
  },
  genderButton: {
    padding: 10,
    borderRadius: 10,
    height: 150,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(38, 38, 38, 0.2)",
  },
  button: {
    width: SCREEN_WIDTH - 40,
    height: 45,
    borderRadius: 25,
    backgroundColor: "black",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
  },
});
