import { OnboardScreenProps } from "@/app/(app)/onboard";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { globalStyles } from "../../constants/globalStyles";

const SCREEN_WIDTH = Dimensions.get("screen").width;

const AgePicker = ({
  onNext,
  onValueChange,
  value,
}: OnboardScreenProps<Date>) => {
  const [dateOfBirth, setDateOfBirth] = useState<Date>(value);

  useEffect(() => {
    onValueChange(dateOfBirth);
  }, [dateOfBirth]);

  const ages = Array.from({ length: 83 }, (_, i) => (i + 18).toString());

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "space-between" }}>
      <View style={styles.container}>
        <DateTimePicker
          value={dateOfBirth}
          mode="date"
          display="spinner"
          onChange={(event, date) => setDateOfBirth(date || new Date())}
          maximumDate={(() => {
            let date = new Date();
            date.setFullYear(date.getFullYear() - 18);
            return date;
          })()}
          themeVariant="dark"
        />
      </View>
      <View style={globalStyles.onboardingNextButtonContainer}>
        <TouchableOpacity
          onPress={onNext}
          style={globalStyles.onboardingNextButton}
        >
          <Text style={globalStyles.onBoardingNextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    gap: 80,
  },
  label: {
    fontSize: 24,
    fontWeight: "900",
    color: "white",
  },
  picker: {
    width: 150,
    height: 150,
  },
  selectedAge: {
    fontSize: 18,
    color: "white",
  },
});

export default AgePicker;
