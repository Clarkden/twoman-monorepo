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
  globalStyles,
} from "@/constants/globalStyles";
import LottieView from "lottie-react-native";
import { useSession } from "@/stores/auth";
import apiFetch from "@/utils/fetch";
import { uploadFile } from "@/utils/files";
import { useReviewPrompt } from "@/hooks/useReviewPrompt";
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
  Platform,
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
const isTablet = SCREEN_WIDTH > 768;
const maxContentWidth = isTablet ? 500 : SCREEN_WIDTH;

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

  // Review prompt for onboarding completion
  const onboardingCompleteReview = useReviewPrompt({
    trigger: "onboarding_complete",
  });

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

    const targetValue =
      direction === "next"
        ? -(isTablet ? maxContentWidth : SCREEN_WIDTH)
        : isTablet
          ? maxContentWidth
          : SCREEN_WIDTH;

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

  const handleNextOnDone = async () => {
    // TODO: Implement small walk through of app
    router.replace("/(tabs)");

    // Trigger onboarding complete review prompt after a delay
    setTimeout(async () => {
      await onboardingCompleteReview.checkAndShowPrompt();
    }, 3000);
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
        return "Add at least 1 photo";
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
          bottom: 0,
          height: SCREEN_HEIGHT,
          zIndex: 0,
        }}
      >
        <LinearGradient
          colors={["transparent", "#9141fa"]}
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
        <LoadingIndicator color={"white"} size={48} />
        <Text
          style={{
            color: "white",
            fontSize: 18,
            fontWeight: "500",
            marginTop: 20,
            textAlign: "center",
          }}
        >
          Creating your profile...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, padding: 20, justifyContent: "space-between" }}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={styles.doneTitle}>Oops! Something went wrong</Text>
          <Text style={styles.doneDescription}>{error}</Text>
        </View>
        <View style={globalStyles.onboardingNextButtonContainer}>
          <TouchableOpacity
            onPress={retry}
            style={globalStyles.onboardingNextButton}
            activeOpacity={0.8}
          >
            <Text style={globalStyles.onBoardingNextButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, position: "relative" }}>
      {/* Confetti Animation - Full Screen */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        <LottieView
          source={require("../../assets/animations/confetti.json")}
          autoPlay
          loop={false}
          style={{
            width: "100%",
            height: "100%",
          }}
          resizeMode="cover"
        />
      </View>

      {/* Content */}
      <View style={{ flex: 1, padding: 20, justifyContent: "space-between" }}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View style={styles.celebrationContainer}>
            <Text style={styles.celebrationEmoji}>🎉</Text>
            <Text style={styles.doneTitle}>Welcome to 2 Man!</Text>
            <Text style={styles.doneDescription}>
              Your profile is ready and you're all set to start making amazing
              connections. Let's find your perfect match!
            </Text>
          </View>
        </View>

        <View style={globalStyles.onboardingNextButtonContainer}>
          <TouchableOpacity
            onPress={next}
            style={globalStyles.onboardingNextButton}
            activeOpacity={0.8}
          >
            <Text style={globalStyles.onBoardingNextButtonText}>
              Start Dating
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: mainBackgroundColor,
    maxHeight: SCREEN_HEIGHT,
    paddingTop: Platform.OS === "ios" ? 0 : 40,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: borderColor,
    width: isTablet ? maxContentWidth - 40 : SCREEN_WIDTH - 40,
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
    width: isTablet ? maxContentWidth * 2 : SCREEN_WIDTH * 2,
  },
  welcomeScreenContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: isTablet ? "center" : "flex-start",
    padding: 20,
    maxWidth: isTablet ? maxContentWidth : "100%",
    alignSelf: isTablet ? "center" : "auto",
  },
  screenContainer: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: isTablet ? "center" : "flex-start",
    padding: 20,
    maxWidth: isTablet ? maxContentWidth : "100%",
    alignSelf: isTablet ? "center" : "auto",
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
    width: isTablet ? maxContentWidth : SCREEN_WIDTH,
    flex: 1,
    alignSelf: isTablet ? "center" : "auto",
  },
  celebrationContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  celebrationEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  doneTitle: {
    color: "white",
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  doneDescription: {
    color: "#aaa",
    fontSize: 18,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 10,
  },
});
