import { useNavigation } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  borderColor,
  mainBackgroundColor,
  secondaryBackgroundColor,
} from "@/constants/globalStyles";
import Slider from "@react-native-community/slider";
import { useEffect, useState } from "react";
import { Profile } from "@/types/api";
import { getProfile, updateProfile } from "@/utils/profile";
import LoadingIndicator from "@/components/LoadingIndicator";
import { MaterialIcons } from "@expo/vector-icons";
import { useDebounce } from "use-debounce";
import profileStore from "@/stores/profile";
import { useSession } from "@/stores/auth";

export default function PreferencesScreen() {
  const { profile: storedProfile, updateProfile: updateStoredProfile } =
    profileStore();

  const [profile, setProfile] = useState<Profile | null>(storedProfile);
  const [debouncedProfile] = useDebounce(profile, 500);
  const userId = useSession((state) => state.session?.user_id);
  const navigation = useNavigation();

  const handleGetProfile = async () => {
    const profile = await getProfile("me");

    if (!profile) return;

    setProfile(profile);
    updateStoredProfile(profile);
  };

  useEffect(() => {
    if (debouncedProfile) {
      updateProfile(debouncedProfile);
    }
  }, [debouncedProfile]);

  useEffect(() => {
    if (!navigation.isFocused) return;

    handleGetProfile();
  }, [navigation.isFocused]);

  if (!profile) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: mainBackgroundColor,
        }}
      >
        <LoadingIndicator size={36} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scrollViewContent}
      style={styles.scrollView}
    >
      <View style={styles.container}>
        <View style={styles.container}>
          <View style={styles.preferenceContainer}>
            <Text style={styles.preferenceLabel}>Gender</Text>
            <View style={styles.genderButtonContainer}>
              <Pressable
                onPress={() =>
                  setProfile({
                    ...profile,
                    preferred_gender: "male",
                  })
                }
                style={[
                  styles.genderButton,
                  {
                    backgroundColor:
                      profile.preferred_gender === "male"
                        ? "#6499f5"
                        : secondaryBackgroundColor,
                  },
                ]}
              >
                <MaterialIcons
                  name="boy"
                  size={82}
                  color={
                    profile.preferred_gender === "male"
                      ? secondaryBackgroundColor
                      : "#6499f5"
                  }
                />
              </Pressable>
              <Pressable
                onPress={() =>
                  setProfile({
                    ...profile,
                    preferred_gender: "female",
                  })
                }
                style={[
                  styles.genderButton,
                  {
                    backgroundColor:
                      profile.preferred_gender === "female"
                        ? "#e964f5"
                        : secondaryBackgroundColor,
                  },
                ]}
              >
                <MaterialIcons
                  name="girl"
                  size={82}
                  color={
                    profile.preferred_gender === "female"
                      ? secondaryBackgroundColor
                      : "#e964f5"
                  }
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
              <Text style={{ color: "white" }}>
                {profile.preferred_age_min}
              </Text>
            </View>
            <Slider
              value={profile.preferred_age_min}
              style={styles.slider}
              minimumValue={18}
              maximumValue={100}
              minimumTrackTintColor={"#fff"}
              maximumTrackTintColor={borderColor}
              onValueChange={(item) => {
                setProfile({
                  ...profile,
                  preferred_age_min: item,
                });
              }}
              onSlidingComplete={(item) => {
                if (item > profile.preferred_age_max)
                  setProfile({
                    ...profile,
                    preferred_distance_max: profile.preferred_age_max,
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
              <Text style={{ color: "white" }}>
                {profile.preferred_age_max}
              </Text>
            </View>
            <Slider
              value={profile.preferred_age_max}
              style={styles.slider}
              minimumValue={18}
              maximumValue={100}
              lowerLimit={profile.preferred_age_min}
              minimumTrackTintColor={"#fff"}
              maximumTrackTintColor={borderColor}
              onValueChange={(item) => {
                setProfile({
                  ...profile,
                  preferred_age_max: item,
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
                {profile.preferred_distance_max}{" "}
                {profile.preferred_distance_max === 1 ? "mile" : "miles "}
              </Text>
            </View>
            <Slider
              value={profile.preferred_distance_max}
              style={styles.slider}
              minimumValue={1}
              maximumValue={100}
              minimumTrackTintColor={"#fff"}
              maximumTrackTintColor={borderColor}
              onValueChange={(item) => {
                setProfile({
                  ...profile,
                  preferred_distance_max: item,
                });
              }}
              step={1}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: mainBackgroundColor,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  container: {
    padding: 10,
    paddingVertical: 20,
    gap: 20,
  },
  backContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backText: {
    color: "white",
    fontSize: 16,
    marginLeft: 10,
  },
  preferenceContainer: {
    gap: 10,
  },
  preferenceLabel: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  genderButton: {
    padding: 10,
    borderRadius: 10,
    height: 150,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: borderColor,
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
});
