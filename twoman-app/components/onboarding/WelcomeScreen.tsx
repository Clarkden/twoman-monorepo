import { MoveRight } from "lucide-react-native";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { globalStyles, mainPurple } from "../../constants/globalStyles";

export default function WelcomeScreen({ onNext }: { onNext: () => void }) {
  const glossyTextMessageImage = require("../../assets/images/onboarding/chat-phone-glossy-plastic.png");

  return (
    <View
      style={{
        flex: 1,
        padding: 20,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text style={styles.title}>Welcome to 2 Man</Text>
      <Text style={styles.description}>Dating made twice as fun</Text>
      <View style={styles.imageContainer}>
        <Image
          source={glossyTextMessageImage}
          style={styles.image}
          resizeMode="contain"
        />
      </View>

      <View style={styles.featuresCard}>
        <Text style={styles.featuresTitle}>What makes us different:</Text>
        <View style={styles.featuresList}>
          <Text style={styles.featureItem}>✨ Solo & duo dating options</Text>
          <Text style={styles.featureItem}>
            👫 Match with friends and couples
          </Text>
          <Text style={styles.featureItem}>🔒 Safe, verified connections</Text>
          <Text style={styles.featureItem}>🎉 Make dating fun again</Text>
        </View>
      </View>

      <View style={globalStyles.onboardingNextButtonContainer}>
        <TouchableOpacity
          onPress={onNext}
          style={globalStyles.onboardingNextButton}
        >
          <MoveRight size={28} color={mainPurple} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    color: "white",
  },
  description: {
    fontSize: 18,
    fontWeight: "400",
    textAlign: "center",
    marginBottom: 30,
    color: "#ccc",
    lineHeight: 24,
  },
  imageContainer: {
    flex: 1,
    width: "100%",
    alignItems: "center",
  },
  image: {
    width: "90%",
    height: "80%",
  },
  featuresCard: {
    width: "100%",
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  featuresTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
  },
  featuresList: {
    alignItems: "flex-start",
  },
  featureItem: {
    color: "#ddd",
    fontSize: 15,
    fontWeight: "400",
    marginBottom: 8,
    paddingLeft: 10,
  },
});
