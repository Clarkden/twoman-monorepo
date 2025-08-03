import { mainPurple } from "../constants/globalStyles";
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { FontAwesome5 } from "@expo/vector-icons";
import { useEffect } from "react";

export default function LoadingIndicator({ size = 64, color = mainPurple }) {
  const duration = 2000;
  const easing = Easing.bezier(0.25, -0.5, 0.25, 1);

  const rotationOffset = useSharedValue(0);

  useEffect(() => {
    rotationOffset.value = withRepeat(withTiming(1, { duration, easing }), -1);
  }, []);

  const animatedRotation = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotationOffset.value * 360}deg` }],
  }));

  return (
    <Animated.View style={animatedRotation}>
      <FontAwesome5 name="hourglass-half" size={size} color={color} />
    </Animated.View>
  );
}
