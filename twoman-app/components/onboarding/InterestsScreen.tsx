import { OnboardScreenProps } from "@/app/(app)/onboard";
import { Interests } from "@/constants/Interests";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MultiSelect } from "react-native-element-dropdown";
import {
  borderColor,
  mainPurple,
  secondaryBackgroundColor,
  globalStyles,
} from "../../constants/globalStyles";

interface InterestItem {
  label: string;
  value: string;
}

export default function InterestsPicker({
  onNext,
  value,
  onValueChange,
}: OnboardScreenProps<string[]>) {
  const [interestsList, setInterestsList] = useState<InterestItem[]>([]);
  const [selected, setSelected] = useState<string[]>(value);

  useEffect(() => {
    const mapInterestsList = (interests: string[]) => {
      return interests.map((interest) => {
        return {
          label: interest,
          value: interest,
        };
      });
    };

    setInterestsList(mapInterestsList(Interests));
  }, []);

  useEffect(() => {
    onValueChange(selected);
  }, [selected]);

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "space-between" }}>
      <View style={styles.container}>
        <Text style={styles.subtitle}>
          Choose up to 5 interests that describe you
        </Text>

        <View style={styles.countContainer}>
          <Text style={styles.countText}>{selected.length}/5</Text>
        </View>

        <MultiSelect
          style={styles.dropdown}
          placeholderStyle={styles.placeholderStyle}
          selectedTextStyle={styles.selectedTextStyle}
          inputSearchStyle={styles.inputSearchStyle}
          iconStyle={styles.iconStyle}
          containerStyle={styles.containerStyle}
          itemContainerStyle={styles.itemContainerStyle}
          itemTextStyle={styles.itemTextStyle}
          search
          data={interestsList}
          labelField="label"
          valueField="value"
          placeholder="Select interests"
          searchPlaceholder="Type to search interests..."
          activeColor={"rgba(163, 100, 245, 0.2)"}
          value={selected}
          onChange={(item) => {
            if (item.length > 5) return;
            setSelected(item);
          }}
          selectedStyle={styles.selectedStyle}
          searchPlaceholderTextColor="#888"
        />
      </View>

      {selected.length > 0 && (
        <View style={globalStyles.onboardingNextButtonContainer}>
          <TouchableOpacity
            onPress={onNext}
            style={globalStyles.onboardingNextButton}
            activeOpacity={0.8}
          >
            <Text style={globalStyles.onBoardingNextButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    gap: 20,
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
  subtitle: {
    color: "#aaa",
    fontSize: 16,
    fontWeight: "400",
    textAlign: "center",
    lineHeight: 22,
  },
  countContainer: {
    width: "100%",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  countText: {
    color: "#aaa",
    fontSize: 14,
    fontWeight: "500",
  },
  dropdown: {
    height: 50,
    backgroundColor: secondaryBackgroundColor,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    borderColor: "rgba(255, 255, 255, 0.1)",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  placeholderStyle: {
    fontSize: 16,
    color: "#888",
    fontWeight: "500",
  },
  selectedTextStyle: {
    fontSize: 14,
    color: "white",
    fontWeight: "500",
  },
  iconStyle: {
    width: 20,
    height: 20,
    tintColor: "white",
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
    borderWidth: 0,
    color: "white",
    backgroundColor: "transparent",
    paddingHorizontal: 16,
  },
  selectedStyle: {
    borderRadius: 12,
    backgroundColor: "rgba(163, 100, 245, 0.2)",
    borderColor: mainPurple,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  itemContainerStyle: {
    backgroundColor: "transparent",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  itemTextStyle: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  containerStyle: {
    backgroundColor: secondaryBackgroundColor,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
    maxHeight: 300,
  },
});
