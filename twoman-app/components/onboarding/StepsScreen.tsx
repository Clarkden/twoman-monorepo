import {
  globalStyles
} from "@/constants/globalStyles";
import { MoveRight } from "lucide-react-native";
import { useState } from "react";
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const SCREEN_WIDTH = Dimensions.get("screen").width;

export default function Steps({ onNext }: { onNext: () => void }) {
  const onboarding1 = require("../../assets/images/onboarding/profile-icon-plastic.png");
  const onboarding2 = require("../../assets/images/onboarding/friends-glossy-plastic.png");
  const onboarding3 = require("../../assets/images/onboarding/envelope-plastic-glossy.png");

  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step === 2) {
      onNext();
      return;
    }

    setStep((prev) => prev + 1);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.stepsContainer}>
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBar,
                { backgroundColor: step === 0 ? "white" : "#302D33" },
              ]}
            />
            <View
              style={[
                styles.progressBar,
                { backgroundColor: step === 1 ? "white" : "#302D33" },
              ]}
            />
            <View
              style={[
                styles.progressBar,
                { backgroundColor: step === 2 ? "white" : "#302D33" },
              ]}
            />
          </View>

          <View style={styles.titleContainer}>
            <Text style={styles.titleText}>
              {step === 0
                ? "Create a profile for yourself"
                : step === 1
                ? "Add your friends"
                : "Start making matches"}
            </Text>
          </View>

          <View style={styles.imageContainer}>
            <Image
              source={
                step === 0
                  ? onboarding1
                  : step === 1
                  ? onboarding2
                  : onboarding3
              }
              style={styles.image}
            />
          </View>
        </View>
      </ScrollView>

      <View style={globalStyles.onboardingNextButtonContainer}>
        <TouchableOpacity
          onPress={handleNext}
          style={globalStyles.onboardingNextButton}
        >
          {step < 2 ? (
            <Text style={globalStyles.onBoardingNextButtonText}>Next</Text>
          ) : (
            <MoveRight size={20} color={"white"} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  scrollContent: {
    flexGrow: 1,
  },
  stepsContainer: {
    paddingHorizontal: 20,
    paddingTop: 40,
    flex: 1,
    minHeight: "100%",
  },
  progressContainer: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginBottom: 20,
  },
  progressBar: {
    width: 50,
    height: 5,
    borderRadius: 30,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginBottom: 40,
  },
  titleText: {
    color: "white",
    fontWeight: "500",
  },
  imageContainer: {
    width: SCREEN_WIDTH - 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: "50%",
    left: 20,
    transform: [{ translateY: -(SCREEN_WIDTH - 240) / 2 }], // Half of image height
  },
  image: {
    height: SCREEN_WIDTH - 200,
    width: SCREEN_WIDTH - 200,
    objectFit: "cover",
    borderRadius: 20,
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
  description: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
    color: "white",
  },
});
