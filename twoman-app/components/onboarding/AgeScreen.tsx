import { OnboardScreenProps } from "@/app/(app)/onboard";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { globalStyles } from "../../constants/globalStyles";

const SCREEN_WIDTH = Dimensions.get("screen").width;

const AgePicker = ({
  onNext,
  onValueChange,
  value,
}: OnboardScreenProps<Date>) => {
  const [dateOfBirth, setDateOfBirth] = useState<Date>(value);
  const [showPicker, setShowPicker] = useState<boolean>(Platform.OS === "ios"); // iOS inline, Android on demand

  useEffect(() => {
    onValueChange(dateOfBirth);
  }, [dateOfBirth, onValueChange]);

  const maximumDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d;
  }, []);

  const minimumDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 100);
    return d;
  }, []);

  const handleAndroidChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    // Always hide the dialog on any outcome
    if (Platform.OS === "android") setShowPicker(false);

    if (event.type === "set" && selectedDate) {
      // Only commit on "OK"
      setDateOfBirth(selectedDate);
    }
    // If dismissed, do nothing (keeps previous date)
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "space-between" }}>
      <View style={styles.container}>
        {/* Android: show a button that opens the dialog; iOS: show inline spinner */}
        {Platform.OS === "android" ? (
          <>
            <TouchableOpacity
              onPress={() => setShowPicker(true)}
              style={styles.dateButton}
              activeOpacity={0.9}
            >
              <Text style={styles.dateButtonText}>
                {dateOfBirth.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
              <Text style={styles.tapToChangeText}>Tap to change</Text>
            </TouchableOpacity>

            {showPicker && (
              <DateTimePicker
                value={dateOfBirth}
                mode="date"
                display="calendar"
                onChange={handleAndroidChange}
                maximumDate={maximumDate}
                minimumDate={minimumDate}
              />
            )}
          </>
        ) : (
          <View style={styles.iosPickerCard}>
            <DateTimePicker
              value={dateOfBirth}
              mode="date"
              display="spinner"
              onChange={(_e, d) => d && setDateOfBirth(d)}
              maximumDate={maximumDate}
              minimumDate={minimumDate}
              themeVariant="dark"
            />
          </View>
        )}
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
  dateButton: {
    backgroundColor: "#262626",
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    minHeight: 100,
  },
  dateButtonText: {
    fontSize: 20,
    color: "white",
    textAlign: "center",
    fontWeight: "600",
    marginBottom: 8,
    lineHeight: 28,
  },
  tapToChangeText: {
    fontSize: 14,
    color: "#aaa",
    textAlign: "center",
    fontWeight: "400",
  },
  iosPickerCard: {
    width: SCREEN_WIDTH - 40,
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    paddingVertical: 8,
  },
});

export default AgePicker;
