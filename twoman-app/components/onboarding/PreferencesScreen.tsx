import { OnboardScreenProps, Preferences } from "@/app/(app)/onboard";
import { MaterialIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  borderColor,
  globalStyles,
  mainPurple,
} from "../../constants/globalStyles";

export default function PreferencesPicker({
  onNext,
  value,
  onValueChange,
}: OnboardScreenProps<Preferences>) {
  return (
    <ScrollView>
      <View style={{ marginBottom: 140 }}>
        <View style={styles.container}>
          <View style={styles.preferenceContainer}>
            <Text style={styles.preferenceLabel}>Gender</Text>
            <View style={styles.genderButtonContainer}>
              <Pressable
                onPress={() =>
                  onValueChange({
                    ...value,
                    gender: "male",
                  })
                }
                style={[
                  styles.genderButton,
                  {
                    backgroundColor:
                      value.gender === "male"
                        ? "#6499f5"
                        : "rgba(38, 38, 38, 0.2)",
                  },
                ]}
              >
                <MaterialIcons
                  name="boy"
                  size={82}
                  color={value.gender === "male" ? "#000" : "#6499f5"}
                />
              </Pressable>
              <Pressable
                onPress={() =>
                  onValueChange({
                    ...value,
                    gender: "female",
                  })
                }
                style={[
                  styles.genderButton,
                  {
                    backgroundColor:
                      value.gender === "female"
                        ? "#e964f5"
                        : "rgba(38, 38, 38, 0.2)",
                  },
                ]}
              >
                <MaterialIcons
                  name="girl"
                  size={82}
                  color={value.gender === "female" ? "#000" : "#e964f5"}
                />
              </Pressable>
            </View>
          </View>
          <View style={styles.sliderContainer}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={styles.preferenceLabel}>Minimum Age</Text>
              <Text style={{ color: "white" }}>{value.ageMin}</Text>
            </View>
            <Slider
              value={value.ageMin}
              style={styles.slider}
              minimumValue={18}
              maximumValue={100}
              minimumTrackTintColor="#FFFFFF"
              maximumTrackTintColor={borderColor}
              onValueChange={(item) => {
                onValueChange({
                  ...value,
                  ageMin: item,
                });
              }}
              onSlidingComplete={(item) => {
                if (item > value.ageMax)
                  onValueChange({
                    ...value,
                    ageMax: item,
                  });
              }}
              step={1}
            />
          </View>
          <View style={styles.sliderContainer}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={styles.preferenceLabel}>Maximum Age</Text>
              <Text style={{ color: "white" }}>{value.ageMax}</Text>
            </View>
            <Slider
              value={value.ageMax}
              style={styles.slider}
              minimumValue={18}
              maximumValue={100}
              lowerLimit={value.ageMin}
              minimumTrackTintColor="#FFFFFF"
              maximumTrackTintColor={borderColor}
              onValueChange={(item) => {
                onValueChange({
                  ...value,
                  ageMax: item,
                });
              }}
              step={1}
            />
          </View>
          <View style={styles.sliderContainer}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={styles.preferenceLabel}>Maximum Distance</Text>
              <Text style={{ color: "white" }}>
                {value.distance} {value.distance === 1 ? "mile" : "miles "}
              </Text>
            </View>
            <Slider
              value={value.distance}
              style={styles.slider}
              minimumValue={1}
              maximumValue={100}
              minimumTrackTintColor="#FFFFFF"
              maximumTrackTintColor={borderColor}
              onValueChange={(item) => {
                onValueChange({
                  ...value,
                  distance: item,
                });
              }}
              step={1}
            />
          </View>
          <TouchableOpacity
            onPress={onNext}
            style={[
              globalStyles.onboardingNextButton,
              {
                backgroundColor: !value.gender ? "transparent" : "black",
              },
            ]}
            disabled={!value.gender}
          >
            <Text
              style={[
                globalStyles.onBoardingNextButtonText,
                {
                  color: !value.gender ? "lightgray" : "white",
                },
              ]}
            >
              Next
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 40,
  },
  preferenceContainer: {
    gap: 10,
  },
  preferenceLabel: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
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
  genderButtonContainer: {
    flexDirection: "row",
    gap: 20,
  },
  sliderContainer: {
    gap: 10,
  },
  slider: {
    width: "100%",
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
