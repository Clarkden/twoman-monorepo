import { OnboardScreenProps } from "@/app/(app)/onboard";
import { Interests } from "@/constants/Interests";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MultiSelect } from "react-native-element-dropdown";
import {
  borderColor,
  mainPurple,
  secondaryBackgroundColor,
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
    <View
      style={{
        padding: 20,
        height: "100%",
      }}
    >
      <View
        style={{
          alignItems: "flex-end",
        }}
      >
        <Text
          style={{
            color: "lightgray",
            fontSize: 14,
            marginBottom: 20,
          }}
        >
          {selected.length}/5
        </Text>
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
        searchPlaceholder="Search..."
        activeColor={"rgba(150, 150, 150, 0.39)"}
        value={selected}
        onChange={(item) => {
          if (item.length > 5) return;

          setSelected(item);
        }}
        selectedStyle={styles.selectedStyle}
      />
      <TouchableOpacity onPress={onNext} style={[styles.nextButton]}>
        <Text style={styles.nextButtonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  dropdown: {
    height: 50,
    backgroundColor: "transparent",
    borderRadius: 25,
    borderWidth: 1,
    padding: 10,
    borderColor: "rgba(255, 255, 255, 0.4)",
    marginBottom: 10,
  },
  placeholderStyle: {
    fontSize: 14,
    color: "white",
  },
  selectedTextStyle: {
    fontSize: 12,
    color: "white",
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 14,
    borderWidth: 0,
    color: "white",
  },
  icon: {
    marginRight: 5,
  },
  selectedStyle: {
    borderRadius: 25,
    borderColor: mainPurple,
  },
  itemContainerStyle: {
    backgroundColor: "transparent",
  },
  itemTextStyle: {
    color: "black",
    fontSize: 12,
  },
  containerStyle: {
    backgroundColor: "white",
    borderRadius: 25,
    marginTop: 10,
  },
  nextButton: {
    backgroundColor: "black",
    padding: 10,
    borderRadius: 25,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  nextButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
