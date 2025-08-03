import { MoveRight } from "lucide-react-native";
import {
    Dimensions,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
    globalStyles,
    mainPurple
} from "../../constants/globalStyles";

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
      <Text style={styles.title}>Welcome</Text>
      <Text style={styles.description}>
        Let's get started with your profile!
      </Text>
      <View style={styles.imageContainer}>
        <Image
          source={glossyTextMessageImage}
          style={styles.image}
          resizeMode="contain"
        />
      </View>
      <View
        style={globalStyles.onboardingNextButtonContainer}
      >
        <TouchableOpacity
          onPress={onNext}
          style={globalStyles.onboardingNextButton}
        >
          <MoveRight size={24} color={mainPurple} />
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
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
    color: "white",
  },
  description: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 30,
    color: "white",
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
});
