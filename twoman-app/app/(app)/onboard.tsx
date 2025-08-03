import LoadingIndicator from "@/components/LoadingIndicator";
import AgeScreen from "@/components/onboarding/AgeScreen";
import BioScreen from "@/components/onboarding/BioScreen";
import GenderScreen from "@/components/onboarding/GenderScreen";
import ImagesScreen from "@/components/onboarding/ImagesScreen";
import InterestsScreen from "@/components/onboarding/InterestsScreen";
import LocationScreen from "@/components/onboarding/LocationScreen";
import NameScreen from "@/components/onboarding/NameScreen";
import PreferencesScreen from "@/components/onboarding/PreferencesScreen";
import UsernameScreen from "@/components/onboarding/UsernameScreen";
import WelcomeScreen from "@/components/onboarding/WelcomeScreen";
import StepsScreen from "@/components/onboarding/StepsScreen";
import {
  borderColor,
  mainBackgroundColor,
  mainPurple,
} from "@/constants/globalStyles";
import { useSession } from "@/stores/auth";
import apiFetch from "@/utils/fetch";
import { uploadFile } from "@/utils/files";
import { BlurView } from "expo-blur";
import { ImagePickerAsset } from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { LocationObject } from "expo-location";
import { useRouter } from "expo-router";
import { ChevronLeft, MoveRight } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dimensions,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export interface OnboardScreenProps<T> {
  onNext: () => void;
  value: T;
  onValueChange: (value: T) => void;
}

export interface InterestItem {
  label: string;
  value: string;
}

export type Gender = "male" | "female" | null;

export interface ProfileImages {
  image1: ImagePickerAsset | null;
  image2: ImagePickerAsset | null;
  image3: ImagePickerAsset | null;
  image4: ImagePickerAsset | null;
}

export interface Preferences {
  gender: Gender;
  ageMin: number;
  ageMax: number;
  distance: number;
}

const ONBOARD_SCREENS = [
  "welcome",
  "steps",
  "age",
  "name",
  "username",
  "gender",
  "images",
  "bio",
  "interests",
  "location",
  "preferences",
  "done",
] as const;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function OnBoardScreen() {
  const router = useRouter();
  const { session } = useSession();

  const [currentScreenIndex, setCurrentScreenIndex] = useState(0);
  const [nextScreenIndex, setNextScreenIndex] = useState(1);
  const progress = useSharedValue(0);
  const slideAnimation = useSharedValue(0);
  const initialProgressAnimation = useSharedValue(0);
  const nextScreenOpacity = useSharedValue(0);

  const [dateOfBirth, setDateOfBirth] = useState<Date>(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 18);
    return date;
  });
  const [name, setName] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [gender, setGender] = useState<Gender>(null);
  const [images, setImages] = useState<ProfileImages>({
    image1: null,
    image2: null,
    image3: null,
    image4: null,
  });
  const [bio, setBio] = useState<string>("");
  const [interests, setInterests] = useState<string[]>([]);
  const [location, setLocation] = useState<LocationObject | null>(null);
  const [preferences, setPreferences] = useState<Preferences>({
    gender: null,
    ageMin: 18,
    ageMax: 22,
    distance: 10,
  });

  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [submittingProfileError, setSubmittingProfileError] =
    useState<string>();
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    initialProgressAnimation.value = withTiming(1, {
      duration: 1000,
      easing: Easing.out(Easing.cubic),
    });
  }, []);

  const updateProgress = (index: number) => {
    progress.value = withTiming(index / (ONBOARD_SCREENS.length - 1), {
      duration: 300,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  };

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
    opacity: initialProgressAnimation.value,
  }));

  const animatedCurrentScreenStyle = useAnimatedStyle(() => ({
    zIndex: slideAnimation.value !== 0 ? 0 : 1,
    opacity: slideAnimation.value !== 0 ? withTiming(0) : withTiming(1),
  }));

  const animatedNextScreenStyle = useAnimatedStyle(() => ({
    zIndex: slideAnimation.value !== 0 ? 1 : 0,
    opacity: nextScreenOpacity.value,
  }));

  const changeScreen = (direction: "next" | "prev") => {
    const newIndex =
      direction === "next" ? currentScreenIndex + 1 : currentScreenIndex - 1;
    if (newIndex < 0 || newIndex >= ONBOARD_SCREENS.length) return;

    setNextScreenIndex(newIndex);
    updateProgress(newIndex);

    const targetValue = direction === "next" ? -SCREEN_WIDTH : SCREEN_WIDTH;

    nextScreenOpacity.value = withTiming(1, { duration: 150 });
    slideAnimation.value = withTiming(
      targetValue,
      { duration: 300, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(setCurrentScreenIndex)(newIndex);
          slideAnimation.value = 0;
          nextScreenOpacity.value = 0;
        }
      },
    );
  };

  const nextScreen = () => changeScreen("next");
  const prevScreen = () => changeScreen("prev");

  const submitProfile = async () => {
    console.log("Submitting profile");
    setSubmittingProfile(true);

    try {
      const imageUrls = await uploadImages();

      if (!imageUrls.image1) {
        setSubmittingProfileError("Please upload at least one image");
        return;
      }

      const response = await apiFetch("/profile", {
        method: "POST",
        body: {
          name,
          username,
          bio,
          gender,
          date_of_birth: dateOfBirth?.toISOString(),
          lat: location?.coords.latitude,
          lon: location?.coords.longitude,
          ...imageUrls,
          interests: interests.join(","),
          preferred_gender: preferences.gender,
          preferred_age_min: preferences.ageMin,
          preferred_age_max: preferences.ageMax,
          preferred_distance_max: preferences.distance,
        },
      });

      console.log("Response");

      if (!response.success) {
        console.log("Error");
        setSubmittingProfileError(response.error);
        return;
      }

      setSubmitted(true);
    } catch (error) {
      console.log(error);
      setSubmittingProfileError("An error occurred. Please try again.");
    } finally {
      setSubmittingProfile(false);
    }
  };

  const retryUpload = async (
    file: ImagePickerAsset,
    maxRetries = 3,
    delay = 1000,
  ) => {
    if (!session) return "";

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await uploadFile(file, session.session_token);
        if (response?.url) return response.url;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    return "";
  };

  const uploadImages = async (): Promise<Record<string, string | null>> => {
    const imageUrls: Record<string, string | null> = {};
    const promises: Promise<void>[] = [];

    let hasAtLeastOneImage = false;

    for (let i = 1; i <= 4; i++) {
      const key = `image${i}` as keyof ProfileImages;
      if (images[key]) {
        hasAtLeastOneImage = true;
        promises.push(
          retryUpload(images[key]!)
            .then((url) => {
              imageUrls[key] = url || null;
            })
            .catch((error) => {
              Alert.alert("Failed to upload image: ", error);
              console.error(`Failed to upload ${key}:`, error);
              imageUrls[key] = null;
            }),
        );
      } else {
        imageUrls[key] = null;
      }
    }

    if (!hasAtLeastOneImage) {
      throw new Error("Please upload at least one image");
    }

    await Promise.all(promises);

    return imageUrls;
  };

  useEffect(() => {
    if (currentScreenIndex === ONBOARD_SCREENS.length - 1 && !submitted) {
      submitProfile();
    }
  }, [currentScreenIndex]);

  const handleRetry = () => {
    setCurrentScreenIndex(0);
    setSubmittingProfileError(undefined);
    setSubmitted(false);
  };

  const handleNextOnDone = () => {
    // TODO: Implement small walk through of app
    router.replace("/(tabs)");
  };

  const renderScreen = (index: number) => {
    const screen = ONBOARD_SCREENS[index];
    switch (screen) {
      case "welcome":
        return <WelcomeScreen onNext={nextScreen} />;
      case "steps":
        return <StepsScreen onNext={nextScreen} />;
      case "age":
        return (
          <AgeScreen
            onNext={nextScreen}
            onValueChange={setDateOfBirth}
            value={dateOfBirth}
          />
        );
      case "name":
        return (
          <NameScreen
            onNext={nextScreen}
            onValueChange={setName}
            value={name}
          />
        );
      case "username":
        return (
          <UsernameScreen
            onNext={nextScreen}
            onValueChange={setUsername}
            value={username}
          />
        );
      case "gender":
        return (
          <GenderScreen
            onNext={nextScreen}
            value={gender}
            onValueChange={setGender}
          />
        );
      case "images":
        return (
          <ImagesScreen
            onNext={nextScreen}
            value={images}
            onValueChange={setImages}
          />
        );
      case "bio":
        return (
          <BioScreen onNext={nextScreen} onValueChange={setBio} value={bio} />
        );
      case "interests":
        return (
          <InterestsScreen
            onNext={nextScreen}
            onValueChange={setInterests}
            value={interests}
          />
        );
      case "location":
        return (
          <LocationScreen
            key={`location-${index}`}
            onNext={nextScreen}
            value={location}
            onValueChange={setLocation}
          />
        );
      case "preferences":
        return (
          <PreferencesScreen
            onNext={nextScreen}
            value={preferences}
            onValueChange={setPreferences}
          />
        );
      case "done":
        return (
          <DoneScreen
            loading={submittingProfile}
            error={submittingProfileError}
            retry={handleRetry}
            next={handleNextOnDone}
          />
        );
      default:
        return <Text>Unknown screen</Text>;
    }
  };

  const renderToolTip = (index: number): string => {
    const screen = ONBOARD_SCREENS[index];
    switch (screen) {
      case "welcome":
        return "Welcome to the app!";
      case "steps":
        return "Steps";
      case "age":
        return "When were you born?";
      case "name":
        return "What's your name?";
      case "username":
        return "Choose a username";
      case "gender":
        return "What's your gender?";
      case "images":
        return "Add some photos";
      case "bio":
        return "Tell us about yourself";
      case "interests":
        return "What are your interests?";
      case "location":
        return "Where are you from?";
      case "preferences":
        return "What are you looking for?";
      case "done":
        return "All done!";
      default:
        return "Unknown screen";
    }
  };

  return (
    <View style={styles.container}>
      <BlurView
        intensity={0}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: SCREEN_HEIGHT,
          zIndex: 0,
        }}
      >
        <LinearGradient
          colors={["#770EFF", "#A364F5"]}
          style={{
            height: SCREEN_HEIGHT,
            width: "100%",
            zIndex: -1,
            opacity: 0.8,
          }}
        />
      </BlurView>
      <SafeAreaView style={styles.safeArea}>
        {currentScreenIndex !== 0 &&
        currentScreenIndex !== 1 &&
        currentScreenIndex !== ONBOARD_SCREENS.length - 1 ? (
          <View style={{ height: 100, marginTop: 20 }}>
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View style={[styles.progressBarContainer]}>
                <Animated.View
                  style={[styles.progressBar, animatedProgressStyle]}
                />
              </View>
            </View>
            <View
              style={{
                padding: 20,
                flexDirection: "row",
                gap: 20,
                alignItems: "center",
              }}
            >
              <Pressable onPress={prevScreen} style={[styles.backButton]}>
                <ChevronLeft size={24} color={mainPurple} />
              </Pressable>
              {currentScreenIndex !== 0 && currentScreenIndex !== 11 ? (
                <View style={{ gap: 5 }}>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "800",
                      color: "white",
                    }}
                  >
                    {ONBOARD_SCREENS[currentScreenIndex]
                      .charAt(0)
                      .toUpperCase() +
                      ONBOARD_SCREENS[currentScreenIndex].slice(1)}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: "white",
                    }}
                  >
                    {renderToolTip(currentScreenIndex)}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        <Animated.View style={[styles.screen, animatedCurrentScreenStyle]}>
          {renderScreen(currentScreenIndex)}
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

function DoneScreen({
  loading,
  error,
  retry,
  next,
}: {
  loading: boolean;
  error?: string;
  retry: () => void;
  next: () => void;
}) {
  if (loading) {
    return (
      <View style={{ alignItems: "center", justifyContent: "center", flex: 1 }}>
        <LoadingIndicator color={"black"} size={48} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screenContainer}>
        <Text style={styles.title}>An error occurred</Text>
        <Text style={styles.description}>{error}</Text>
        <Button title="Retry" onPress={retry} />
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        padding: 20,
        justifyContent: "flex-start",
        alignItems: "center",
      }}
    >
      <Text style={styles.title}>All Done!</Text>
      <Text style={styles.description}>Your profile is complete.</Text>
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          alignItems: "center",
          width: "100%",
        }}
      >
        <TouchableOpacity
          onPress={next}
          style={{
            width: "100%",
            height: 45,
            borderRadius: 25,
            backgroundColor: "black",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MoveRight size={24} color={"white"} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: mainBackgroundColor,
    maxHeight: SCREEN_HEIGHT,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: borderColor,
    width: SCREEN_WIDTH - 40,
    borderRadius: 25,
  },
  progressBar: {
    height: "100%",
    backgroundColor: mainPurple,
    borderRadius: 25,
  },
  safeArea: {
    height: "100%",
    overflow: "hidden",
  },
  screenViewContainer: {
    flex: 1,
    flexDirection: "row",
    width: SCREEN_WIDTH * 2,
  },
  welcomeScreenContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-start",
    padding: 20,
  },
  screenContainer: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "flex-start",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
    color: "white",
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
    color: "white",
    fontWeight: "500",
  },
  backButton: {
    width: 45,
    height: 45,
    borderRadius: 25,
    backgroundColor: "black",
    alignItems: "center",
    justifyContent: "center",
  },
  screen: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
});
