import LoadingIndicator from "@/components/LoadingIndicator";
import ProfileCard from "@/components/ProfileCard";
import {
  globalStyles,
  mainBackgroundColor,
  mainPurple,
  secondaryBackgroundColor,
} from "@/constants/globalStyles";
import useWebSocket from "@/hooks/useWebsocket";
import { useSession } from "@/stores/auth";
import { Friendship, Profile } from "@/types/api";
import { SocketProfileResponseData } from "@/types/socket";
import apiFetch from "@/utils/fetch";
import { messageHandler } from "@/utils/websocket";
import {
  FontAwesome,
  FontAwesome6,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { goldYellow } from "@/constants/globalStyles";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Heart,
  RotateCw,
  UsersRound,
  X,
  MoreHorizontal,
  NotepadText,
  Cake,
  MapPin,
  Book,
  BriefcaseBusiness,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import PagerView from "react-native-pager-view";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

const backgroundColor = mainBackgroundColor;

async function presentPaywall(): Promise<boolean> {
  console.log("Starting presentPaywall function");
  try {
    const paywallResult: PAYWALL_RESULT = await RevenueCatUI.presentPaywall();
    console.log("Paywall result received:", paywallResult);

    switch (paywallResult) {
      case PAYWALL_RESULT.NOT_PRESENTED:
        console.log("Paywall was not presented");
        return false;
      case PAYWALL_RESULT.ERROR:
        console.log("Error occurred while presenting paywall");
        return false;
      case PAYWALL_RESULT.CANCELLED:
        console.log("Paywall was cancelled by user");
        return false;
      case PAYWALL_RESULT.PURCHASED:
        console.log("Purchase was successful");
        return true;
      case PAYWALL_RESULT.RESTORED:
        console.log("Purchase was restored");
        return true;
      default:
        console.log("Unknown paywall result:", paywallResult);
        return false;
    }
  } catch (error) {
    console.error("Exception caught in presentPaywall:", error);
    return false;
  }
}

function SoloLikeAnimation({
  visible,
  onAnimationComplete,
}: {
  visible: boolean;
  onAnimationComplete: () => void;
}) {
  // Epic anime-style animation values
  const backgroundOpacity = useSharedValue(0);
  const shockwaveScale = useSharedValue(0);
  const shockwaveOpacity = useSharedValue(0);
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  const heartRotation = useSharedValue(0);
  const flashOpacity = useSharedValue(0);

  // Particle effects
  const particle1Scale = useSharedValue(0);
  const particle1X = useSharedValue(0);
  const particle1Y = useSharedValue(0);
  const particle1Opacity = useSharedValue(0);

  const particle2Scale = useSharedValue(0);
  const particle2X = useSharedValue(0);
  const particle2Y = useSharedValue(0);
  const particle2Opacity = useSharedValue(0);

  const particle3Scale = useSharedValue(0);
  const particle3X = useSharedValue(0);
  const particle3Y = useSharedValue(0);
  const particle3Opacity = useSharedValue(0);

  // Action lines for romantic energy
  const soloActionLine1Y = useSharedValue(-350);
  const soloActionLine2Y = useSharedValue(-330);
  const soloActionLine3Y = useSharedValue(-310);
  const soloActionLine4Y = useSharedValue(350);
  const soloActionLine5Y = useSharedValue(330);
  const soloActionLine6Y = useSharedValue(310);
  const soloActionLinesOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // PHASE 1: Instant flash + shockwave burst (anime impact effect)
      flashOpacity.value = withSequence(
        withTiming(1, { duration: 50, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 150, easing: Easing.out(Easing.quad) })
      );

      backgroundOpacity.value = withTiming(0.8, {
        duration: 100,
        easing: Easing.out(Easing.quad),
      });

      // Explosive shockwave
      shockwaveOpacity.value = withSequence(
        withTiming(0.8, { duration: 100, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) })
      );
      shockwaveScale.value = withTiming(8, {
        duration: 700,
        easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
      });

      // Romantic action lines - softer, flowing movement
      soloActionLinesOpacity.value = withTiming(0.8, {
        duration: 150,
        easing: Easing.out(Easing.quad),
      });

      // Gentle converging lines (more romantic than aggressive)
      soloActionLine1Y.value = withSequence(
        withTiming(-15, { duration: 400, easing: Easing.in(Easing.sin) }),
        withDelay(
          300,
          withTiming(-700, { duration: 500, easing: Easing.out(Easing.sin) })
        )
      );
      soloActionLine2Y.value = withSequence(
        withTiming(-10, { duration: 420, easing: Easing.in(Easing.sin) }),
        withDelay(
          280,
          withTiming(-680, { duration: 520, easing: Easing.out(Easing.sin) })
        )
      );
      soloActionLine3Y.value = withSequence(
        withTiming(-5, { duration: 440, easing: Easing.in(Easing.sin) }),
        withDelay(
          260,
          withTiming(-660, { duration: 540, easing: Easing.out(Easing.sin) })
        )
      );

      soloActionLine4Y.value = withSequence(
        withTiming(15, { duration: 400, easing: Easing.in(Easing.sin) }),
        withDelay(
          300,
          withTiming(700, { duration: 500, easing: Easing.out(Easing.sin) })
        )
      );
      soloActionLine5Y.value = withSequence(
        withTiming(10, { duration: 420, easing: Easing.in(Easing.sin) }),
        withDelay(
          280,
          withTiming(680, { duration: 520, easing: Easing.out(Easing.sin) })
        )
      );
      soloActionLine6Y.value = withSequence(
        withTiming(5, { duration: 440, easing: Easing.in(Easing.sin) }),
        withDelay(
          260,
          withTiming(660, { duration: 540, easing: Easing.out(Easing.sin) })
        )
      );

      // PHASE 2: Heart dramatic entrance (anime-style impact)
      setTimeout(() => {
        heartOpacity.value = withTiming(1, {
          duration: 100,
          easing: Easing.out(Easing.quad),
        });

        // Explosive scale-in with overshoot
        heartScale.value = withSequence(
          withTiming(2.5, {
            duration: 200,
            easing: Easing.bezier(0.175, 0.885, 0.32, 1.275), // Back ease out
          }),
          withTiming(1.5, {
            duration: 400,
            easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          })
        );

        // Dramatic rotation spin
        heartRotation.value = withSequence(
          withTiming(360, {
            duration: 400,
            easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          }),
          withTiming(720, {
            duration: 400,
            easing: Easing.out(Easing.cubic),
          })
        );
      }, 200);

      // PHASE 3: Particle explosion effects
      setTimeout(() => {
        // Particle 1 - Top right
        particle1Opacity.value = withSequence(
          withTiming(1, { duration: 100 }),
          withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) })
        );
        particle1Scale.value = withSequence(
          withTiming(1.5, { duration: 300, easing: Easing.out(Easing.quad) }),
          withTiming(0.5, { duration: 300, easing: Easing.out(Easing.cubic) })
        );
        particle1X.value = withTiming(120, {
          duration: 600,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        });
        particle1Y.value = withTiming(-100, {
          duration: 600,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        });

        // Particle 2 - Bottom left
        particle2Opacity.value = withSequence(
          withTiming(1, { duration: 100 }),
          withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) })
        );
        particle2Scale.value = withSequence(
          withTiming(1.2, { duration: 300, easing: Easing.out(Easing.quad) }),
          withTiming(0.3, { duration: 300, easing: Easing.out(Easing.cubic) })
        );
        particle2X.value = withTiming(-100, {
          duration: 600,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        });
        particle2Y.value = withTiming(80, {
          duration: 600,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        });

        // Particle 3 - Top left
        particle3Opacity.value = withSequence(
          withTiming(1, { duration: 100 }),
          withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) })
        );
        particle3Scale.value = withSequence(
          withTiming(1.8, { duration: 300, easing: Easing.out(Easing.quad) }),
          withTiming(0.2, { duration: 300, easing: Easing.out(Easing.cubic) })
        );
        particle3X.value = withTiming(-80, {
          duration: 600,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        });
        particle3Y.value = withTiming(-120, {
          duration: 600,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        });
      }, 400);

      // PHASE 4: Epic exit
      setTimeout(() => {
        backgroundOpacity.value = withTiming(0, {
          duration: 600,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        });

        heartOpacity.value = withTiming(
          0,
          {
            duration: 600,
            easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          },
          () => {
            runOnJS(onAnimationComplete)();
          }
        );

        // Final dramatic scale down
        heartScale.value = withTiming(0.2, {
          duration: 600,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        });
      }, 1400);
    } else {
      // Reset all values
      backgroundOpacity.value = 0;
      shockwaveScale.value = 0;
      shockwaveOpacity.value = 0;
      heartScale.value = 0;
      heartOpacity.value = 0;
      heartRotation.value = 0;
      flashOpacity.value = 0;
      particle1Scale.value = 0;
      particle1X.value = 0;
      particle1Y.value = 0;
      particle1Opacity.value = 0;
      particle2Scale.value = 0;
      particle2X.value = 0;
      particle2Y.value = 0;
      particle2Opacity.value = 0;
      particle3Scale.value = 0;
      particle3X.value = 0;
      particle3Y.value = 0;
      particle3Opacity.value = 0;
      soloActionLine1Y.value = -350;
      soloActionLine2Y.value = -330;
      soloActionLine3Y.value = -310;
      soloActionLine4Y.value = 350;
      soloActionLine5Y.value = 330;
      soloActionLine6Y.value = 310;
      soloActionLinesOpacity.value = 0;
    }
  }, [visible]);

  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const shockwaveStyle = useAnimatedStyle(() => ({
    opacity: shockwaveOpacity.value,
    transform: [{ scale: shockwaveScale.value }],
  }));

  const heartStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [
      { scale: heartScale.value },
      { rotateZ: `${heartRotation.value}deg` },
    ],
  }));

  const particle1Style = useAnimatedStyle(() => ({
    opacity: particle1Opacity.value,
    transform: [
      { scale: particle1Scale.value },
      { translateX: particle1X.value },
      { translateY: particle1Y.value },
    ],
  }));

  const particle2Style = useAnimatedStyle(() => ({
    opacity: particle2Opacity.value,
    transform: [
      { scale: particle2Scale.value },
      { translateX: particle2X.value },
      { translateY: particle2Y.value },
    ],
  }));

  const particle3Style = useAnimatedStyle(() => ({
    opacity: particle3Opacity.value,
    transform: [
      { scale: particle3Scale.value },
      { translateX: particle3X.value },
      { translateY: particle3Y.value },
    ],
  }));

  // Solo action line styles
  const soloActionLine1Style = useAnimatedStyle(() => ({
    opacity: soloActionLinesOpacity.value,
    transform: [{ translateY: soloActionLine1Y.value }],
  }));

  const soloActionLine2Style = useAnimatedStyle(() => ({
    opacity: soloActionLinesOpacity.value,
    transform: [{ translateY: soloActionLine2Y.value }],
  }));

  const soloActionLine3Style = useAnimatedStyle(() => ({
    opacity: soloActionLinesOpacity.value,
    transform: [{ translateY: soloActionLine3Y.value }],
  }));

  const soloActionLine4Style = useAnimatedStyle(() => ({
    opacity: soloActionLinesOpacity.value,
    transform: [{ translateY: soloActionLine4Y.value }],
  }));

  const soloActionLine5Style = useAnimatedStyle(() => ({
    opacity: soloActionLinesOpacity.value,
    transform: [{ translateY: soloActionLine5Y.value }],
  }));

  const soloActionLine6Style = useAnimatedStyle(() => ({
    opacity: soloActionLinesOpacity.value,
    transform: [{ translateY: soloActionLine6Y.value }],
  }));

  if (!visible) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
      }}
    >
      {/* Background overlay */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: mainBackgroundColor,
          },
          backgroundStyle,
        ]}
      />

      {/* Flash effect */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#4CAF50", // Green theme
          },
          flashStyle,
        ]}
      />

      {/* Solo Action Lines (Romantic Speed Lines) */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: "50%",
            left: "15%",
            width: 3,
            height: 90,
            backgroundColor: "#81C784", // Light green for romantic feel
            transform: [{ rotateZ: "12deg" }],
          },
          soloActionLine1Style,
        ]}
      />
      <Animated.View
        style={[
          {
            position: "absolute",
            top: "50%",
            left: "35%",
            width: 2,
            height: 70,
            backgroundColor: "#A5D6A7", // Very light green
            transform: [{ rotateZ: "8deg" }],
          },
          soloActionLine2Style,
        ]}
      />
      <Animated.View
        style={[
          {
            position: "absolute",
            top: "50%",
            left: "65%",
            width: 4,
            height: 100,
            backgroundColor: "#66BB6A", // Medium green
            transform: [{ rotateZ: "-10deg" }],
          },
          soloActionLine3Style,
        ]}
      />

      {/* Bottom action lines */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: "50%",
            right: "15%",
            width: 3,
            height: 90,
            backgroundColor: "#81C784",
            transform: [{ rotateZ: "-12deg" }],
          },
          soloActionLine4Style,
        ]}
      />
      <Animated.View
        style={[
          {
            position: "absolute",
            top: "50%",
            right: "35%",
            width: 2,
            height: 70,
            backgroundColor: "#A5D6A7",
            transform: [{ rotateZ: "-8deg" }],
          },
          soloActionLine5Style,
        ]}
      />
      <Animated.View
        style={[
          {
            position: "absolute",
            top: "50%",
            right: "65%",
            width: 4,
            height: 100,
            backgroundColor: "#66BB6A",
            transform: [{ rotateZ: "10deg" }],
          },
          soloActionLine6Style,
        ]}
      />

      {/* Shockwave ring */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 200,
            height: 200,
            marginLeft: -100,
            marginTop: -100,
            borderRadius: 100,
            borderWidth: 8,
            borderColor: "#4CAF50", // Green theme
          },
          shockwaveStyle,
        ]}
      />

      {/* Main heart icon */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: "center",
            alignItems: "center",
          },
          heartStyle,
        ]}
      >
        <Heart size={180} color="#4CAF50" />
        {/* SOLO LIKE Label */}
        <View
          style={{
            position: "absolute",
            top: 240,
            backgroundColor: "#4CAF50", // Green theme
            borderWidth: 3,
            borderColor: "#ffffff",
            borderRadius: 20,
            paddingHorizontal: 20,
            paddingVertical: 12,
            elevation: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
          }}
        >
          <Text
            style={{
              color: "#ffffff",
              fontSize: 24,
              fontWeight: "900",
              letterSpacing: 2,
              textAlign: "center",
              textShadowColor: "#000000",
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 2,
            }}
          >
            SOLO LIKE
          </Text>
        </View>
      </Animated.View>

      {/* Particle effects */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: "50%",
            left: "50%",
            marginLeft: -15,
            marginTop: -15,
          },
          particle1Style,
        ]}
      >
        <Heart size={30} color="#66BB6A" />
      </Animated.View>

      <Animated.View
        style={[
          {
            position: "absolute",
            top: "50%",
            left: "50%",
            marginLeft: -10,
            marginTop: -10,
          },
          particle2Style,
        ]}
      >
        <Heart size={20} color="#81C784" />
      </Animated.View>

      <Animated.View
        style={[
          {
            position: "absolute",
            top: "50%",
            left: "50%",
            marginLeft: -20,
            marginTop: -20,
          },
          particle3Style,
        ]}
      >
        <Heart size={40} color="#4CAF50" />
      </Animated.View>
    </View>
  );
}

function DuoLikeAnimation({
  visible,
  onAnimationComplete,
}: {
  visible: boolean;
  onAnimationComplete: () => void;
}) {
  // Epic anime-style duo animation values - friendship/teamwork energy
  const backgroundOpacity = useSharedValue(0);
  const heart1Scale = useSharedValue(0);
  const heart1Opacity = useSharedValue(0);
  const heart1X = useSharedValue(-40);
  const heart1Y = useSharedValue(0);
  const heart1Rotation = useSharedValue(0);

  const heart2Scale = useSharedValue(0);
  const heart2Opacity = useSharedValue(0);
  const heart2X = useSharedValue(40);
  const heart2Y = useSharedValue(0);
  const heart2Rotation = useSharedValue(0);

  const sparkleOpacity = useSharedValue(0);
  const sparkleScale = useSharedValue(0);
  const connectionOpacity = useSharedValue(0);
  const connectionScale = useSharedValue(0);
  const flashOpacity = useSharedValue(0);

  // Celebration particles
  const celebrationOpacity = useSharedValue(0);
  const celebrationScale = useSharedValue(0);

  // Power-up ring effect
  const powerRingScale = useSharedValue(0);
  const powerRingOpacity = useSharedValue(0);

  // Duo action lines - synchronized team energy
  const duoActionLine1Y = useSharedValue(-380);
  const duoActionLine2Y = useSharedValue(-360);
  const duoActionLine3Y = useSharedValue(-340);
  const duoActionLine4Y = useSharedValue(380);
  const duoActionLine5Y = useSharedValue(360);
  const duoActionLine6Y = useSharedValue(340);
  const duoActionLinesOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // PHASE 1: Synchronized entrance (friendship bond)
      backgroundOpacity.value = withTiming(0.8, {
        duration: 100,
        easing: Easing.out(Easing.quad),
      });

      // Power-up flash
      flashOpacity.value = withSequence(
        withTiming(1, { duration: 80, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 120, easing: Easing.out(Easing.quad) })
      );

      // Power ring expansion
      powerRingOpacity.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) })
      );
      powerRingScale.value = withTiming(3, {
        duration: 650,
        easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
      });

      // Synchronized duo action lines - teamwork energy
      duoActionLinesOpacity.value = withTiming(1, {
        duration: 120,
        easing: Easing.out(Easing.quad),
      });

      // Synchronized converging lines (teamwork coordination)
      duoActionLine1Y.value = withSequence(
        withTiming(-20, { duration: 350, easing: Easing.in(Easing.cubic) }),
        withDelay(
          250,
          withTiming(-750, { duration: 450, easing: Easing.out(Easing.cubic) })
        )
      );
      duoActionLine2Y.value = withSequence(
        withTiming(-15, { duration: 370, easing: Easing.in(Easing.cubic) }),
        withDelay(
          230,
          withTiming(-730, { duration: 470, easing: Easing.out(Easing.cubic) })
        )
      );
      duoActionLine3Y.value = withSequence(
        withTiming(-10, { duration: 390, easing: Easing.in(Easing.cubic) }),
        withDelay(
          210,
          withTiming(-710, { duration: 490, easing: Easing.out(Easing.cubic) })
        )
      );

      duoActionLine4Y.value = withSequence(
        withTiming(20, { duration: 350, easing: Easing.in(Easing.cubic) }),
        withDelay(
          250,
          withTiming(750, { duration: 450, easing: Easing.out(Easing.cubic) })
        )
      );
      duoActionLine5Y.value = withSequence(
        withTiming(15, { duration: 370, easing: Easing.in(Easing.cubic) }),
        withDelay(
          230,
          withTiming(730, { duration: 470, easing: Easing.out(Easing.cubic) })
        )
      );
      duoActionLine6Y.value = withSequence(
        withTiming(10, { duration: 390, easing: Easing.in(Easing.cubic) }),
        withDelay(
          210,
          withTiming(710, { duration: 490, easing: Easing.out(Easing.cubic) })
        )
      );

      // PHASE 2: Hearts emerge from opposite sides (duo entrance)
      setTimeout(() => {
        // Heart 1 (left) - dramatic entrance
        heart1Opacity.value = withTiming(1, {
          duration: 150,
          easing: Easing.out(Easing.quad),
        });
        heart1Scale.value = withSequence(
          withTiming(1.8, {
            duration: 300,
            easing: Easing.bezier(0.175, 0.885, 0.32, 1.275), // Back ease out
          }),
          withTiming(1.2, {
            duration: 200,
            easing: Easing.out(Easing.cubic),
          })
        );
        heart1X.value = withTiming(-60, {
          duration: 400,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        });
        heart1Rotation.value = withTiming(180, {
          duration: 600,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        });

        // Heart 2 (right) - synchronized entrance
        heart2Opacity.value = withTiming(1, {
          duration: 150,
          easing: Easing.out(Easing.quad),
        });
        heart2Scale.value = withSequence(
          withTiming(1.8, {
            duration: 300,
            easing: Easing.bezier(0.175, 0.885, 0.32, 1.275), // Back ease out
          }),
          withTiming(1.2, {
            duration: 200,
            easing: Easing.out(Easing.cubic),
          })
        );
        heart2X.value = withTiming(60, {
          duration: 400,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        });
        heart2Rotation.value = withTiming(-180, {
          duration: 600,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        });
      }, 200);

      // PHASE 3: Hearts move together (friendship connection)
      setTimeout(() => {
        // Hearts move toward center
        heart1X.value = withTiming(-20, {
          duration: 400,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        });
        heart2X.value = withTiming(20, {
          duration: 400,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        });

        // Connection effect appears
        connectionOpacity.value = withSequence(
          withTiming(1, { duration: 200 }),
          withTiming(0.8, { duration: 400 })
        );
        connectionScale.value = withSequence(
          withTiming(1.5, { duration: 300, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) })
        );
      }, 700);

      // PHASE 4: Celebration explosion (duo success!)
      setTimeout(() => {
        // Sparkle explosion
        sparkleOpacity.value = withSequence(
          withTiming(1, { duration: 150 }),
          withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) })
        );
        sparkleScale.value = withTiming(2.5, {
          duration: 750,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        });

        // Celebration particles
        celebrationOpacity.value = withSequence(
          withTiming(1, { duration: 200 }),
          withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) })
        );
        celebrationScale.value = withTiming(3, {
          duration: 700,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        });

        // Hearts do final celebration spin
        heart1Rotation.value = withTiming(360, {
          duration: 500,
          easing: Easing.out(Easing.cubic),
        });
        heart2Rotation.value = withTiming(-360, {
          duration: 500,
          easing: Easing.out(Easing.cubic),
        });
      }, 1100);

      // PHASE 5: Epic exit
      setTimeout(() => {
        backgroundOpacity.value = withTiming(0, {
          duration: 600,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        });

        heart1Opacity.value = withTiming(0, {
          duration: 600,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        });

        heart2Opacity.value = withTiming(
          0,
          {
            duration: 600,
            easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          },
          () => {
            runOnJS(onAnimationComplete)();
          }
        );

        connectionOpacity.value = withTiming(0, {
          duration: 600,
          easing: Easing.out(Easing.cubic),
        });

        // Final scale down
        heart1Scale.value = withTiming(0.2, {
          duration: 600,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        });
        heart2Scale.value = withTiming(0.2, {
          duration: 600,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        });
      }, 1600);
    } else {
      // Reset all values
      backgroundOpacity.value = 0;
      heart1Scale.value = 0;
      heart1Opacity.value = 0;
      heart1X.value = -40;
      heart1Y.value = 0;
      heart1Rotation.value = 0;
      heart2Scale.value = 0;
      heart2Opacity.value = 0;
      heart2X.value = 40;
      heart2Y.value = 0;
      heart2Rotation.value = 0;
      sparkleOpacity.value = 0;
      sparkleScale.value = 0;
      connectionOpacity.value = 0;
      connectionScale.value = 0;
      flashOpacity.value = 0;
      celebrationOpacity.value = 0;
      celebrationScale.value = 0;
      powerRingScale.value = 0;
      powerRingOpacity.value = 0;
    }
  }, [visible]);

  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const powerRingStyle = useAnimatedStyle(() => ({
    opacity: powerRingOpacity.value,
    transform: [{ scale: powerRingScale.value }],
  }));

  const heart1Style = useAnimatedStyle(() => ({
    opacity: heart1Opacity.value,
    transform: [
      { scale: heart1Scale.value },
      { translateX: heart1X.value },
      { translateY: heart1Y.value },
      { rotateZ: `${heart1Rotation.value}deg` },
    ],
  }));

  const heart2Style = useAnimatedStyle(() => ({
    opacity: heart2Opacity.value,
    transform: [
      { scale: heart2Scale.value },
      { translateX: heart2X.value },
      { translateY: heart2Y.value },
      { rotateZ: `${heart2Rotation.value}deg` },
    ],
  }));

  const connectionStyle = useAnimatedStyle(() => ({
    opacity: connectionOpacity.value,
    transform: [{ scale: connectionScale.value }],
  }));

  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: sparkleOpacity.value,
    transform: [{ scale: sparkleScale.value }],
  }));

  const celebrationStyle = useAnimatedStyle(() => ({
    opacity: celebrationOpacity.value,
    transform: [{ scale: celebrationScale.value }],
  }));

  if (!visible) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
      }}
    >
      {/* Background overlay */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: mainBackgroundColor,
          },
          backgroundStyle,
        ]}
      />

      {/* Flash effect */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#a364f5", // Purple theme for duo
          },
          flashStyle,
        ]}
      />

      {/* Power ring */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 200,
            height: 200,
            marginLeft: -100,
            marginTop: -100,
            borderRadius: 100,
            borderWidth: 8,
            borderColor: "#a364f5",
          },
          powerRingStyle,
        ]}
      />

      {/* Connection beam between hearts */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 120,
            height: 6,
            marginLeft: -60,
            marginTop: -3,
            backgroundColor: "#f5d364", // Gold connection
            borderRadius: 3,
          },
          connectionStyle,
        ]}
      />

      {/* DUO LIKE Label */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: "50%",
            left: "50%",
            marginLeft: -75,
            marginTop: 150,
          },
          connectionStyle, // Use same animation timing as connection
        ]}
      >
        <View
          style={{
            backgroundColor: "#a364f5",
            borderWidth: 3,
            borderColor: "#f5d364",
            borderRadius: 20,
            paddingHorizontal: 22,
            paddingVertical: 12,
            elevation: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
          }}
        >
          <Text
            style={{
              color: "#ffffff",
              fontSize: 24,
              fontWeight: "900",
              letterSpacing: 2,
              textAlign: "center",
              textShadowColor: "#000000",
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 2,
            }}
          >
            DUO LIKE
          </Text>
        </View>
      </Animated.View>

      {/* Heart 1 (Left) */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: "50%",
            left: "50%",
            marginLeft: -90, // Base position for left heart
            marginTop: -90,
          },
          heart1Style,
        ]}
      >
        <Heart size={180} color="#ff4757" />
      </Animated.View>

      {/* Heart 2 (Right) */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: "50%",
            left: "50%",
            marginLeft: -90, // Base position for right heart
            marginTop: -90,
          },
          heart2Style,
        ]}
      >
        <Heart size={180} color="#ff6b7a" />
      </Animated.View>

      {/* Sparkle explosion effect */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 100,
            height: 100,
            marginLeft: -50,
            marginTop: -50,
            borderRadius: 50,
            backgroundColor: "#f5d364",
          },
          sparkleStyle,
        ]}
      />

      {/* Celebration particles */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: "30%",
            left: "30%",
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: "#ff8a9b",
          },
          celebrationStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            position: "absolute",
            top: "70%",
            right: "30%",
            width: 15,
            height: 15,
            borderRadius: 7.5,
            backgroundColor: "#a364f5",
          },
          celebrationStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            position: "absolute",
            top: "20%",
            right: "20%",
            width: 25,
            height: 25,
            borderRadius: 12.5,
            backgroundColor: "#f5d364",
          },
          celebrationStyle,
        ]}
      />
    </View>
  );
}

function XAnimation({
  visible,
  onAnimationComplete,
}: {
  visible: boolean;
  onAnimationComplete: () => void;
}) {
  // Epic anime-style rejection animation values
  const backgroundOpacity = useSharedValue(0);
  const slashOpacity = useSharedValue(0);
  const slashScale = useSharedValue(0);
  const slashRotation = useSharedValue(-45);
  const xOpacity = useSharedValue(0);
  const xScale = useSharedValue(0);
  const xRotation = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const crackOpacity = useSharedValue(0);
  const crackScale = useSharedValue(0);

  // Screen shake effect
  const shakeX = useSharedValue(0);
  const shakeY = useSharedValue(0);

  // Lightning bolt effects
  const lightningOpacity = useSharedValue(0);
  const lightningScale = useSharedValue(0);

  // Action lines (speed lines) - from top and bottom converging to center
  const actionLine1Y = useSharedValue(-400); // Top lines - start further off-screen
  const actionLine2Y = useSharedValue(-380);
  const actionLine3Y = useSharedValue(-360);
  const actionLine4Y = useSharedValue(400); // Bottom lines - start further off-screen
  const actionLine5Y = useSharedValue(380);
  const actionLine6Y = useSharedValue(360);
  const actionLinesOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {


      // PHASE 1: Dramatic build-up with screen shake
      backgroundOpacity.value = withTiming(0.7, {
        duration: 150,
        easing: Easing.out(Easing.quad),
      });

      // Screen shake effect
      shakeX.value = withSequence(
        withTiming(5, { duration: 50 }),
        withTiming(-5, { duration: 50 }),
        withTiming(3, { duration: 50 }),
        withTiming(-3, { duration: 50 }),
        withTiming(0, { duration: 100 })
      );
      shakeY.value = withSequence(
        withTiming(-3, { duration: 50 }),
        withTiming(3, { duration: 50 }),
        withTiming(-2, { duration: 50 }),
        withTiming(2, { duration: 50 }),
        withTiming(0, { duration: 100 })
      );

      // Action lines converging animation - EASE IN → PAUSE → EASE OUT
      actionLinesOpacity.value = withTiming(1, {
        duration: 100,
        easing: Easing.out(Easing.quad),
      });

      // Top lines move to center (ease in)
      actionLine1Y.value = withSequence(
        withTiming(-20, { duration: 300, easing: Easing.in(Easing.quad) }),
        withDelay(
          200,
          withTiming(-800, { duration: 400, easing: Easing.out(Easing.quad) })
        )
      );
      actionLine2Y.value = withSequence(
        withTiming(-10, { duration: 320, easing: Easing.in(Easing.quad) }),
        withDelay(
          180,
          withTiming(-780, { duration: 420, easing: Easing.out(Easing.quad) })
        )
      );
      actionLine3Y.value = withSequence(
        withTiming(0, { duration: 340, easing: Easing.in(Easing.quad) }),
        withDelay(
          160,
          withTiming(-760, { duration: 440, easing: Easing.out(Easing.quad) })
        )
      );

      // Bottom lines move to center (ease in)
      actionLine4Y.value = withSequence(
        withTiming(20, { duration: 300, easing: Easing.in(Easing.quad) }),
        withDelay(
          200,
          withTiming(800, { duration: 400, easing: Easing.out(Easing.quad) })
        )
      );
      actionLine5Y.value = withSequence(
        withTiming(10, { duration: 320, easing: Easing.in(Easing.quad) }),
        withDelay(
          180,
          withTiming(780, { duration: 420, easing: Easing.out(Easing.quad) })
        )
      );
      actionLine6Y.value = withSequence(
        withTiming(0, { duration: 340, easing: Easing.in(Easing.quad) }),
        withDelay(
          160,
          withTiming(760, { duration: 440, easing: Easing.out(Easing.quad) })
        )
      );

      // PHASE 2: Lightning flash + slash effect
      setTimeout(() => {
        flashOpacity.value = withSequence(
          withTiming(1, { duration: 80, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 120, easing: Easing.out(Easing.quad) })
        );

        // Lightning bolts
        lightningOpacity.value = withSequence(
          withTiming(1, { duration: 100 }),
          withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) })
        );
        lightningScale.value = withTiming(1.5, {
          duration: 400,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        });

        // Dramatic diagonal slash
        slashOpacity.value = withTiming(1, {
          duration: 150,
          easing: Easing.out(Easing.quad),
        });
        slashScale.value = withSequence(
          withTiming(1.8, {
            duration: 300,
            easing: Easing.bezier(0.175, 0.885, 0.32, 1.275), // Back ease out
          }),
          withTiming(1.2, {
            duration: 200,
            easing: Easing.out(Easing.cubic),
          })
        );
        slashRotation.value = withTiming(45, {
          duration: 400,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        });
      }, 200);

      // PHASE 3: X impact with crack effect
      setTimeout(() => {
        xOpacity.value = withTiming(1, {
          duration: 100,
          easing: Easing.out(Easing.quad),
        });

        // Explosive X entrance with multiple rotations
        xScale.value = withSequence(
          withTiming(2.2, {
            duration: 250,
            easing: Easing.bezier(0.175, 0.885, 0.32, 1.275), // Back ease out
          }),
          withTiming(1.5, {
            duration: 300,
            easing: Easing.out(Easing.cubic),
          })
        );

        xRotation.value = withSequence(
          withTiming(180, {
            duration: 300,
            easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          }),
          withTiming(360, {
            duration: 300,
            easing: Easing.out(Easing.cubic),
          })
        );

        // Screen crack effect
        crackOpacity.value = withSequence(
          withTiming(0.8, { duration: 150 }),
          withTiming(0.3, { duration: 400, easing: Easing.out(Easing.cubic) })
        );
        crackScale.value = withTiming(6, {
          duration: 550,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        });
      }, 500);

      // PHASE 4: Epic dramatic exit
      setTimeout(() => {


        // Everything fades out dramatically
        backgroundOpacity.value = withTiming(0, {
          duration: 500,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        });

        slashOpacity.value = withTiming(0, {
          duration: 400,
          easing: Easing.out(Easing.cubic),
        });

        crackOpacity.value = withTiming(0, {
          duration: 400,
          easing: Easing.out(Easing.cubic),
        });

        xOpacity.value = withTiming(
          0,
          {
            duration: 500,
            easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          },
          () => {

            runOnJS(onAnimationComplete)();
          }
        );

        // Final scale down
        xScale.value = withTiming(0.1, {
          duration: 500,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        });
      }, 1300);
    } else {
      // Reset all values
      backgroundOpacity.value = 0;
      slashOpacity.value = 0;
      slashScale.value = 0;
      slashRotation.value = -45;
      xOpacity.value = 0;
      xScale.value = 0;
      xRotation.value = 0;
      flashOpacity.value = 0;
      crackOpacity.value = 0;
      crackScale.value = 0;
      shakeX.value = 0;
      shakeY.value = 0;
      lightningOpacity.value = 0;
      lightningScale.value = 0;
      actionLine1Y.value = -400;
      actionLine2Y.value = -380;
      actionLine3Y.value = -360;
      actionLine4Y.value = 400;
      actionLine5Y.value = 380;
      actionLine6Y.value = 360;
      actionLinesOpacity.value = 0;
    }
  }, [visible]);

  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }, { translateY: shakeY.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const slashStyle = useAnimatedStyle(() => ({
    opacity: slashOpacity.value,
    transform: [
      { scale: slashScale.value },
      { rotateZ: `${slashRotation.value}deg` },
    ],
  }));

  const xStyle = useAnimatedStyle(() => ({
    opacity: xOpacity.value,
    transform: [{ scale: xScale.value }, { rotateZ: `${xRotation.value}deg` }],
  }));

  const crackStyle = useAnimatedStyle(() => ({
    opacity: crackOpacity.value,
    transform: [{ scale: crackScale.value }],
  }));

  const lightningStyle = useAnimatedStyle(() => ({
    opacity: lightningOpacity.value,
    transform: [{ scale: lightningScale.value }],
  }));

  // Action line styles
  const actionLine1Style = useAnimatedStyle(() => ({
    opacity: actionLinesOpacity.value,
    transform: [{ translateY: actionLine1Y.value }],
  }));

  const actionLine2Style = useAnimatedStyle(() => ({
    opacity: actionLinesOpacity.value,
    transform: [{ translateY: actionLine2Y.value }],
  }));

  const actionLine3Style = useAnimatedStyle(() => ({
    opacity: actionLinesOpacity.value,
    transform: [{ translateY: actionLine3Y.value }],
  }));

  const actionLine4Style = useAnimatedStyle(() => ({
    opacity: actionLinesOpacity.value,
    transform: [{ translateY: actionLine4Y.value }],
  }));

  const actionLine5Style = useAnimatedStyle(() => ({
    opacity: actionLinesOpacity.value,
    transform: [{ translateY: actionLine5Y.value }],
  }));

  const actionLine6Style = useAnimatedStyle(() => ({
    opacity: actionLinesOpacity.value,
    transform: [{ translateY: actionLine6Y.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
        },
        containerStyle,
      ]}
    >
      {/* Background overlay */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: mainBackgroundColor,
          },
          backgroundStyle,
        ]}
      />

      {/* Flash effect */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#f05d5d",
          },
          flashStyle,
        ]}
      />

      {/* Action Lines (Speed Lines) - Top Lines */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: "50%",
            left: "10%",
            width: 4,
            height: 100,
            backgroundColor: "#ffffff",
            transform: [{ rotateZ: "15deg" }],
          },
          actionLine1Style,
        ]}
      />
      <Animated.View
        style={[
          {
            position: "absolute",
            top: "50%",
            left: "30%",
            width: 3,
            height: 80,
            backgroundColor: "#ffffff",
            transform: [{ rotateZ: "10deg" }],
          },
          actionLine2Style,
        ]}
      />
      <Animated.View
        style={[
          {
            position: "absolute",
            top: "50%",
            left: "70%",
            width: 5,
            height: 120,
            backgroundColor: "#ffffff",
            transform: [{ rotateZ: "-12deg" }],
          },
          actionLine3Style,
        ]}
      />

      {/* Action Lines (Speed Lines) - Bottom Lines */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: "50%",
            right: "10%",
            width: 4,
            height: 100,
            backgroundColor: "#ffffff",
            transform: [{ rotateZ: "-15deg" }],
          },
          actionLine4Style,
        ]}
      />
      <Animated.View
        style={[
          {
            position: "absolute",
            top: "50%",
            right: "30%",
            width: 3,
            height: 80,
            backgroundColor: "#ffffff",
            transform: [{ rotateZ: "-10deg" }],
          },
          actionLine5Style,
        ]}
      />
      <Animated.View
        style={[
          {
            position: "absolute",
            top: "50%",
            right: "70%",
            width: 5,
            height: 120,
            backgroundColor: "#ffffff",
            transform: [{ rotateZ: "12deg" }],
          },
          actionLine6Style,
        ]}
      />

      {/* Lightning bolt effects */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: "20%",
            left: "20%",
            width: 4,
            height: 200,
            backgroundColor: "#ffeb3b",
            transform: [{ rotateZ: "15deg" }],
          },
          lightningStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            position: "absolute",
            top: "30%",
            right: "15%",
            width: 3,
            height: 150,
            backgroundColor: "#ffeb3b",
            transform: [{ rotateZ: "-25deg" }],
          },
          lightningStyle,
        ]}
      />

      {/* Diagonal slash effect */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 400,
            height: 8,
            marginLeft: -200,
            marginTop: -4,
            backgroundColor: "#f05d5d",
          },
          slashStyle,
        ]}
      />

      {/* Screen crack effect */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 200,
            height: 200,
            marginLeft: -100,
            marginTop: -100,
            borderRadius: 100,
            borderWidth: 6,
            borderColor: "#f05d5d",
          },
          crackStyle,
        ]}
      />

      {/* Main X icon */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: "center",
            alignItems: "center",
          },
          xStyle,
        ]}
      >
        <X size={180} color="#f05d5d" />
        {/* PASS Label */}
        <View
          style={{
            position: "absolute",
            top: 240,
            backgroundColor: "#f05d5d",
            borderWidth: 3,
            borderColor: "#ffffff",
            borderRadius: 20,
            paddingHorizontal: 24,
            paddingVertical: 12,
            elevation: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
          }}
        >
          <Text
            style={{
              color: "#ffffff",
              fontSize: 28,
              fontWeight: "900",
              letterSpacing: 2,
              textAlign: "center",
              textShadowColor: "#000000",
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 2,
            }}
          >
            PASS
          </Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function FriendshipPager({
  friends,
  setFriends,
  profile_id,
}: {
  friends: Friendship[];
  setFriends: (friends: Friendship[]) => void;
  profile_id: number;
}) {
  const pagerRef = useRef<PagerView>(null);
  const [selectedFriendIndex, setSelectedFriendIndex] = useState<number>(0);

  const handleBlock = (userId: number) => {
    setFriends(
      friends.filter(
        (friendship) =>
          friendship.ProfileID !== userId && friendship.FriendID !== userId
      )
    );
  };

  return (
    <>
      <View style={{ flex: 0 }}>
        {friends.length > 1 && (
          <View
            style={{
              flexDirection: "row",

              justifyContent: "center",
              alignItems: "center",
              gap: 10,
              marginVertical: 5,
              marginBottom: 10,
            }}
          >
            {friends.map((_, i) => (
              <TouchableOpacity
                onPress={() => {
                  pagerRef.current?.setPage(i);
                }}
                key={i}
              >
                {i === selectedFriendIndex ? (
                  <FontAwesome name="circle" size={10} color="white" />
                ) : (
                  <FontAwesome name="circle-o" size={10} color="white" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <PagerView
        ref={pagerRef}
        style={styles.pagerView}
        initialPage={0}
        onPageScroll={(e) => {
          setSelectedFriendIndex(e.nativeEvent.position);
        }}
        orientation={"horizontal"}
      >
        {friends.map((friendship, i) => (
          <FriendshipCard
            profile={
              friendship.ProfileID !== profile_id
                ? friendship.Profile
                : friendship.Friend
            }
            onBlock={handleBlock}
            key={i}
          />
        ))}
      </PagerView>
    </>
  );
}

function FriendshipCard({
  profile,
  onBlock,
}: {
  profile: Profile;
  onBlock: (userId: number) => void;
}) {
  return (
    <ScrollView>
      <View style={styles.pagerViewItem}>
        <ProfileCard
          profile={profile}
          onBlock={() => onBlock(profile.user_id)}
        />
      </View>
    </ScrollView>
  );
}

function SelectFriendMenu({
  setMenuVisible,
  setShowLikeModalVisible,
  friends,
  handleAccept,
  menuVisible,
}: {
  setMenuVisible: (visible: boolean) => void;
  setShowLikeModalVisible: (visible: boolean) => void;
  friends: Friendship[];
  handleAccept: (friendId?: number) => void;
  menuVisible: boolean;
}) {
  const userId = useSession((state) => state.session?.user_id);
  const router = useRouter();

  const selectFriendModalViewOpacity = useSharedValue(0);

  useEffect(() => {
    if (menuVisible) {
      selectFriendModalViewOpacity.value = withTiming(1, {
        duration: 200,
        easing: Easing.linear,
      });
    } else {
      selectFriendModalViewOpacity.value = withTiming(0, {
        duration: 200,
        easing: Easing.linear,
      });
    }
  }, [menuVisible]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: selectFriendModalViewOpacity.value,
    };
  });

  if (!menuVisible) return null;

  return (
    <Animated.View
      style={[
        {
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          flex: 1,
          position: "absolute",
          zIndex: 2,
          height: "100%",
          width: "100%",
        },
        animatedStyle,
      ]}
      pointerEvents={menuVisible ? "auto" : "none"}
    >
      <View
        // intensity={40}
        style={{
          flex: 1,
          flexDirection: "column",
          backgroundColor: mainBackgroundColor,
          padding: 10,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            flexDirection: "column",
            flex: 1,
            width: "100%",
            padding: 10,
            gap: 20,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              gap: 10,
              justifyContent: "space-between",
              alignItems: "center",
              position: "relative",
              marginBottom: 20,
            }}
          >
            <View
              style={{
                flex: 1,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontWeight: "800",
                  fontSize: 16,
                }}
              >
                Choose Your Duo Partner
              </Text>
              <Text
                style={{
                  color: "#888",
                  fontSize: 12,
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                Pick which friend to bring on the double date
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setMenuVisible(false);
              }}
              style={{
                flex: 1,
                position: "absolute",
                zIndex: 1,
              }}
            >
              <X size={24} color="white" />
            </Pressable>
          </View>
          <View
            style={{
              flex: 1,
              flexDirection: "column",
            }}
          >
            {friends.length > 0 ? (
              <>
                {friends.map((friendship, i) => (
                  <View key={i}>
                    <TouchableOpacity
                      onPress={() => {
                        handleAccept(
                          userId === friendship.Friend.user_id
                            ? friendship.Profile.user_id
                            : friendship.Friend.user_id
                        );
                        setMenuVisible(false);
                      }}
                      style={{
                        borderRadius: 10,
                        flexDirection: "row",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <Image
                        source={{
                          uri:
                            userId === friendship.Friend.user_id
                              ? friendship.Profile.image1
                              : friendship.Friend.image1,
                        }}
                        style={{
                          width: 50,
                          height: 50,
                          borderRadius: 100,
                          borderWidth: 2,
                          borderColor: "white",
                        }}
                      />

                      <Text
                        style={{
                          color: "white",
                          fontWeight: "800",
                          fontSize: 14,
                        }}
                      >
                        {userId === friendship.Friend.user_id
                          ? friendship.Profile.name
                          : friendship.Friend.name}
                      </Text>
                    </TouchableOpacity>
                    {i !== friends.length - 1 && (
                      <View
                        style={{
                          borderBottomWidth: 1,
                          borderBottomColor: "white",
                          width: "100%",
                          opacity: 0.2,
                          marginVertical: 10,
                        }}
                      />
                    )}
                  </View>
                ))}
              </>
            ) : (
              <View
                style={{
                  flexDirection: "column",
                  padding: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  flex: 1,
                }}
              >
                {/* Hero Icon */}
                <View
                  style={{
                    backgroundColor: mainPurple,
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                >
                  <UsersRound size={40} color="white" />
                </View>

                {/* Main Message */}
                <Text
                  style={{
                    color: "white",
                    fontWeight: "800",
                    fontSize: 20,
                    textAlign: "center",
                    marginBottom: 8,
                  }}
                >
                  No Friends Yet?
                </Text>

                <Text
                  style={{
                    color: "#888",
                    fontSize: 16,
                    textAlign: "center",
                    lineHeight: 22,
                    marginBottom: 30,
                  }}
                >
                  Invite friends to unlock duo matches{"\n"}and earn amazing
                  rewards!
                </Text>

                {/* Benefits Cards */}
                <View style={{ width: "100%", gap: 15, marginBottom: 30 }}>
                  {/* Friend Benefit */}
                  <View
                    style={{
                      backgroundColor: "rgba(245, 211, 100, 0.1)",
                      borderRadius: 12,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: "rgba(245, 211, 100, 0.2)",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <FontAwesome name="gift" size={18} color={goldYellow} />
                      <Text
                        style={{
                          color: goldYellow,
                          fontWeight: "700",
                          fontSize: 16,
                          marginLeft: 10,
                        }}
                      >
                        Friend Gets 1 Week Pro Free
                      </Text>
                    </View>
                    <Text style={{ color: "#bbb", fontSize: 14 }}>
                      Your friends get instant Pro access when they join
                    </Text>
                  </View>

                  {/* Your Benefit */}
                  <View
                    style={{
                      backgroundColor: "rgba(163, 100, 245, 0.1)",
                      borderRadius: 12,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: "rgba(163, 100, 245, 0.2)",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <FontAwesome name="star" size={18} color={mainPurple} />
                      <Text
                        style={{
                          color: mainPurple,
                          fontWeight: "700",
                          fontSize: 16,
                          marginLeft: 10,
                        }}
                      >
                        You Get 1 Month Pro Free
                      </Text>
                    </View>
                    <Text style={{ color: "#bbb", fontSize: 14 }}>
                      Invite 3 friends and unlock a full month of Pro
                    </Text>
                  </View>
                </View>

                {/* CTA Button */}
                <TouchableOpacity
                  style={{
                    backgroundColor: mainPurple,
                    paddingVertical: 16,
                    paddingHorizontal: 32,
                    borderRadius: 25,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    elevation: 4,
                    shadowColor: mainPurple,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                  }}
                  onPress={() => {
                    setMenuVisible(false);
                    setShowLikeModalVisible(false);
                    router.push("/friends");
                  }}
                >
                  <FontAwesome6 name="user-plus" size={20} color="white" />
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "800",
                      color: "white",
                    }}
                  >
                    Invite Friends Now
                  </Text>
                </TouchableOpacity>

                {/* Small Motivational Text */}
                <Text
                  style={{
                    color: "#666",
                    fontSize: 12,
                    textAlign: "center",
                    marginTop: 16,
                    fontStyle: "italic",
                  }}
                >
                  More friends = More matches = More fun! 🎉
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

function EnhancedProfileCard({
  profile,
  friends,
  friendsFetched,
  onBlock,
  onViewAllFriends,
}: {
  profile: Profile;
  friends: Friendship[];
  friendsFetched: boolean;
  onBlock: () => void;
  onViewAllFriends: () => void;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    // Trigger animation when profile changes
    if (profile) {
      // Start from invisible and slightly lower position
      opacity.value = 0;
      translateY.value = 20;

      // Animate to visible and normal position
      opacity.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.ease),
      });

      translateY.value = withTiming(0, {
        duration: 200,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [profile]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  const getFriendProfile = (friendship: Friendship): Profile => {
    return friendship.ProfileID !== profile.user_id
      ? friendship.Profile
      : friendship.Friend;
  };

  return (
    <Animated.View style={animatedStyle}>
      {/* Profile Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <Text style={styles.profileName}>{profile.name}</Text>
        <TouchableOpacity
          onPress={() => {
            /* Options functionality if needed */
          }}
        >
          <MoreHorizontal color={"white"} size={20} />
        </TouchableOpacity>
      </View>

      {/* Profile Image */}
      <Image source={{ uri: profile.image1 }} style={styles.mainProfileImage} />

      {/* Friends Section - Right after image */}
      <View
        style={{
          backgroundColor: secondaryBackgroundColor,
          borderRadius: 12,
          padding: 16,
          marginTop: 16,
          marginBottom: 16,
        }}
      >
        {!friendsFetched ? (
          <View style={{ alignItems: "center", paddingVertical: 12 }}>
            <Text style={{ color: "#888", fontSize: 14 }}>
              Loading friends...
            </Text>
          </View>
        ) : friends.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 12 }}>
            <Text
              style={{
                color: "#888",
                fontSize: 16,
                fontWeight: "600",
                marginBottom: 4,
              }}
            >
              No Friends for Duo Dating
            </Text>
            <Text style={{ color: "#666", fontSize: 14, textAlign: "center" }}>
              {profile.name} hasn't added any friends yet
            </Text>
          </View>
        ) : (
          <>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>
                {profile.name}'s Friends ({friends.length})
              </Text>
              {friends.length > 3 && (
                <TouchableOpacity
                  onPress={onViewAllFriends}
                  style={{
                    backgroundColor: mainPurple,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 15,
                  }}
                >
                  <Text
                    style={{ color: "white", fontSize: 12, fontWeight: "600" }}
                  >
                    View All
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              {friends.slice(0, 3).map((friendship, index) => {
                const friendProfile = getFriendProfile(friendship);
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={onViewAllFriends}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      borderRadius: 10,
                      padding: 12,
                    }}
                  >
                    <Image
                      source={{ uri: friendProfile.image1 }}
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 30,
                        marginBottom: 8,
                      }}
                    />
                    <Text
                      style={{
                        color: "white",
                        fontSize: 12,
                        fontWeight: "600",
                        textAlign: "center",
                      }}
                      numberOfLines={1}
                    >
                      {friendProfile.name}
                    </Text>
                    <Text
                      style={{
                        color: "#888",
                        fontSize: 10,
                        textAlign: "center",
                        marginTop: 2,
                      }}
                      numberOfLines={1}
                    >
                      {friendProfile.age}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {friends.length > 0 && (
              <TouchableOpacity
                onPress={onViewAllFriends}
                style={{
                  backgroundColor: "rgba(163, 100, 245, 0.1)",
                  borderWidth: 1,
                  borderColor: "rgba(163, 100, 245, 0.3)",
                  borderRadius: 8,
                  paddingVertical: 12,
                  marginTop: 12,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ color: mainPurple, fontSize: 14, fontWeight: "600" }}
                >
                  🎭 Start Duo Match with {profile.name}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Rest of Profile Information */}
      <View style={styles.profileInfo}>
        <View style={styles.profileInfoItem}>
          <NotepadText size={18} color="white" />
          <Text style={styles.profileBio}>{profile.bio}</Text>
        </View>
      </View>
      <View style={styles.profileInfo}>
        <View style={styles.profileInfoItem}>
          <Cake size={18} color="white" />
          <Text style={globalStyles.regularText}>
            {(() => {
              const today = new Date();
              const birthDate = new Date(profile.date_of_birth);
              let age = today.getFullYear() - birthDate.getFullYear();
              const monthDiff = today.getMonth() - birthDate.getMonth();
              if (
                monthDiff < 0 ||
                (monthDiff === 0 && today.getDate() < birthDate.getDate())
              ) {
                age--;
              }
              return `${age} years old`;
            })()}
          </Text>
        </View>
        <View style={styles.profileInfoItem}>
          <MapPin size={18} color="white" />
          <Text style={globalStyles.regularText}>{profile.city}</Text>
        </View>
        {profile.education && (
          <View style={styles.profileInfoItem}>
            <Book size={18} color="white" />
            <Text style={globalStyles.regularText}>{profile.education}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

export default function TabOneScreen() {
  const userId = useSession((state) => state.session?.user_id);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [potentialMatchFriends, setPotentialMatchFriends] = useState<
    Friendship[]
  >([]);
  const [potentialMatchFriendsFetched, setPotentialMatchFriendsFetched] =
    useState<boolean>(false);
  const [showLikeModal, setShowLikeModal] = useState(false);
  const [currentUserFriends, setCurrentUserFriends] = useState<Friendship[]>(
    []
  );
  const [selectFriendMenuVisible, setSelectFriendMenuVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [showSoloLikeAnimation, setShowSoloLikeAnimation] = useState(false);
  const [showDuoLikeAnimation, setShowDuoLikeAnimation] = useState(false);
  const [showXAnimation, setShowXAnimation] = useState(false);
  const [animationInProgress, setAnimationInProgress] = useState(false);
  const [pendingProfileRequest, setPendingProfileRequest] = useState(false);
  const [hideProfileUI, setHideProfileUI] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: "like" | "dislike";
    friendId?: number;
  } | null>(null);

  const { sendMessage } = useWebSocket();

  // Add a ref to track animation state to avoid closure issues with useEffect
  const animationInProgressRef = useRef(false);

  // Add another ref to reliably track pending profile requests
  const pendingProfileRequestRef = useRef(false);

  // Add a ref to store the next profile while animation is running
  const nextProfileRef = useRef<Profile | null>(null);
  const fetchInProgressRef = useRef(false);

  const handleAnimationComplete = () => {
    console.log("Animation complete handler called");
    setAnimationInProgress(false);
    animationInProgressRef.current = false;

    // Clear hideProfileUI flag when animation completes
    setHideProfileUI(false);

    // Rest of the existing logic
    if (nextProfileRef.current) {
      console.log("Using pre-fetched profile");
      setProfile(nextProfileRef.current);
      nextProfileRef.current = null;
      setLoading(false);
    } else if (pendingProfileRequest || pendingProfileRequestRef.current) {
      console.log("No pre-fetched profile yet, starting fetch now");
      pendingProfileRequestRef.current = false;
      setProfile(null);
      handleGetProfile();
      setPendingProfileRequest(false);
    }
  };

  const handleAccept = (friendId?: number) => {
    console.log("Accept button pressed");

    if (showLikeModal) {
      // If modal is open, close it first and store the pending action
      console.log("Like modal is open, closing before animation");
      setShowLikeModal(false);
      setPendingAction({ type: "like", friendId });
      return;
    }

    // If modal is closed, proceed normally
    setHideProfileUI(true);
    // Choose animation based on like type
    if (friendId) {
      console.log("Triggering duo like animation");
      setShowDuoLikeAnimation(true);
    } else {
      console.log("Triggering solo like animation");
      setShowSoloLikeAnimation(true);
    }
    setAnimationInProgress(true);
    animationInProgressRef.current = true;

    sendMessage({
      type: "profile",
      data: {
        decision: "like",
        target_profile: profile?.user_id as number,
        is_duo: !!friendId,
        ...(friendId && { friend_profile: friendId }),
      },
    });
  };

  const handleDecline = () => {
    console.log("Decline button pressed");

    if (showLikeModal) {
      // If modal is open, close it first and store the pending action
      console.log("Like modal is open, closing before animation");
      setShowLikeModal(false);
      setPendingAction({ type: "dislike" });
      return;
    }

    // If modal is closed, proceed normally
    setHideProfileUI(true);
    setShowXAnimation(true);
    setAnimationInProgress(true);
    animationInProgressRef.current = true;

    sendMessage({
      type: "profile",
      data: {
        decision: "dislike",
        target_profile: profile?.user_id as number,
      },
    });
  };

  const handleGetProfile = async () => {
    setLoading(true);

    const fetchProfile = async () => {
      console.log("Fetching discovery profile");
      try {
        const response = await apiFetch<Profile>("/profile/discover");

        if (!response.success) {
          console.log(response);
          return;
        }

        const profileData = response.data;

        setProfile(profileData);
        setPotentialMatchFriends([]);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    setTimeout(() => {
      fetchProfile();
    }, 1000);
  };

  const fetchPotentialMatchFriends = async () => {
    if (!profile) return;

    if (potentialMatchFriends.length > 0) return;

    try {
      const response = await apiFetch<Friendship[]>(
        `/profile/${profile.user_id}/friends`
      );

      if (response.code !== 200) {
        console.log(response.error);
        return;
      }

      setPotentialMatchFriends(response.data);
      setPotentialMatchFriendsFetched(true);
    } catch (error) {
      console.log(error);
    }
  };

  // Auto-fetch friends when profile changes
  useEffect(() => {
    if (profile) {
      setPotentialMatchFriends([]);
      setPotentialMatchFriendsFetched(false);
      fetchPotentialMatchFriends();
    }
  }, [profile]);

  const fetchCurrentUserFriends = async () => {
    try {
      const response = await apiFetch<Friendship[]>(
        `/profile/${userId}/friends`
      );

      if (response.code !== 200) {
        console.log(response.error);
        return;
      }

      setCurrentUserFriends(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  const handleLikeModalToggled = async () => {
    if (showLikeModal) {
      await fetchPotentialMatchFriends();
    }
  };

  const handleBlock = () => {
    handleGetProfile();
  };

  useEffect(() => {
    fetchCurrentUserFriends();
  }, [selectFriendMenuVisible]);

  useEffect(() => {
    handleLikeModalToggled();
  }, [showLikeModal]);

  useEffect(() => {
    handleGetProfile();
  }, []);

  useEffect(() => {
    const handleProfileResponse = async (data: SocketProfileResponseData) => {
      console.log("Profile response received:", data);
      setPotentialMatchFriends([]);
      setPotentialMatchFriendsFetched(false);
      setShowLikeModal(false);

      if (data.success) {
        console.log(
          "Profile response successful, animation in progress:",
          animationInProgressRef.current
        );

        // Start fetching new profile immediately regardless of animation state
        if (!fetchInProgressRef.current) {
          fetchInProgressRef.current = true;
          console.log("Starting profile fetch immediately");

          // Begin fetching but don't update UI yet
          fetchNextProfile().then((newProfile) => {
            fetchInProgressRef.current = false;
            if (animationInProgressRef.current) {
              // Store for later if animation is still running
              console.log("Animation still running, storing profile for later");
              nextProfileRef.current = newProfile;
            } else {
              // Update UI immediately if animation already finished
              console.log("Animation already finished, updating profile now");
              setProfile(newProfile);
              setLoading(false);
            }
          });

          // Only set profile to null if animation is not running
          if (!animationInProgressRef.current) {
            setProfile(null);
          }

          // Still set the pending flag in case fetch takes longer than animation
          if (animationInProgressRef.current) {
            setPendingProfileRequest(true);
            pendingProfileRequestRef.current = true;
          }
        }
      } else {
        setErrorMessage(data.message);

        if (data.message === "Daily like limit reached") {
          if (paywallVisible) return;

          setTimeout(async () => {
            setPaywallVisible(true);
            console.log("Displaying paywall");
            const paywallResult = await presentPaywall();
            console.log("Paywall result: ", paywallResult);
          }, 500);

          setPaywallVisible(false);
        }
      }
    };

    messageHandler.subscribe("profile_response", handleProfileResponse);

    return () => {
      messageHandler.unsubscribe("profile_response", handleProfileResponse);
    };
  }, [messageHandler]);

  // Add a function to fetch profile without updating UI
  const fetchNextProfile = async (): Promise<Profile | null> => {
    console.log("Fetching next profile in background");
    try {
      const response = await apiFetch<Profile>("/profile/discover");

      if (!response.success) {
        console.log("Error fetching profile:", response);
        return null;
      }

      console.log("Successfully fetched next profile");
      return response.data;
    } catch (error) {
      console.log("Error in fetchNextProfile:", error);
      return null;
    }
  };

  // Add an effect to handle pending actions after modal closes
  useEffect(() => {
    if (!showLikeModal && pendingAction) {
      // Add a small delay to ensure modal closing animation completes
      const timer = setTimeout(() => {
        console.log("Processing pending action:", pendingAction.type);

        if (pendingAction.type === "like") {
          // Process like action
          setHideProfileUI(true);
          // Choose animation based on like type
          if (pendingAction.friendId) {
            console.log("Triggering duo like animation (pending)");
            setShowDuoLikeAnimation(true);
          } else {
            console.log("Triggering solo like animation (pending)");
            setShowSoloLikeAnimation(true);
          }
          setAnimationInProgress(true);
          animationInProgressRef.current = true;

          sendMessage({
            type: "profile",
            data: {
              decision: "like",
              target_profile: profile?.user_id as number,
              is_duo: !!pendingAction.friendId,
              ...(pendingAction.friendId && {
                friend_profile: pendingAction.friendId,
              }),
            },
          });
        } else {
          // Process dislike action
          setHideProfileUI(true);
          setShowXAnimation(true);
          setAnimationInProgress(true);
          animationInProgressRef.current = true;

          sendMessage({
            type: "profile",
            data: {
              decision: "dislike",
              target_profile: profile?.user_id as number,
            },
          });
        }

        // Clear pending action
        setPendingAction(null);
      }, 300); // Delay to allow modal animation to complete

      return () => clearTimeout(timer);
    }
  }, [showLikeModal, pendingAction, profile]);

  if (loading && !animationInProgress) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: mainBackgroundColor,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <LoadingIndicator size={48} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.noProfiles}>
        <StatusBar style="light" />

        <MaterialCommunityIcons
          name="emoticon-sad-outline"
          size={64}
          color="#a364f5"
          style={{ marginBottom: 20 }}
        />
        <Text style={styles.noProfilesText}>
          We ran out of profiles to show you.
        </Text>
        <TouchableOpacity
          onPress={handleGetProfile}
          style={{
            backgroundColor: secondaryBackgroundColor,
            padding: 10,
            borderRadius: 25,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 20,
            width: 150,
          }}
        >
          <RotateCw size={24} color="white" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <SoloLikeAnimation
        visible={showSoloLikeAnimation}
        onAnimationComplete={() => {
          console.log("Solo like animation complete");
          setShowSoloLikeAnimation(false);
          handleAnimationComplete();
        }}
      />
      <DuoLikeAnimation
        visible={showDuoLikeAnimation}
        onAnimationComplete={() => {
          console.log("Duo like animation complete");
          setShowDuoLikeAnimation(false);
          handleAnimationComplete();
        }}
      />
      <XAnimation
        visible={showXAnimation}
        onAnimationComplete={() => {
          console.log("X animation complete");
          setShowXAnimation(false);
          handleAnimationComplete();
        }}
      />
      <Modal
        visible={showLikeModal}
        presentationStyle="pageSheet"
        animationType="slide"
        style={{
          backgroundColor: backgroundColor,
        }}
        pointerEvents={!selectFriendMenuVisible ? "auto" : "none"}
        onRequestClose={() => setShowLikeModal(false)}
      >
        <SafeAreaView style={styles.likeModalContainer}>
          <SelectFriendMenu
            setMenuVisible={setSelectFriendMenuVisible}
            setShowLikeModalVisible={setShowLikeModal}
            friends={currentUserFriends}
            handleAccept={handleAccept}
            menuVisible={selectFriendMenuVisible}
          />
          <View style={styles.likeModalView}>
            <View
              style={{
                padding: 20,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  justifyContent: "space-between",
                  alignItems: "center",
                  position: "relative",
                }}
              >
                <Pressable
                  onPress={() => {
                    setShowLikeModal(false);
                  }}
                  style={{
                    flex: 1,
                    position: "absolute",
                    left: 0,
                    zIndex: 1,
                  }}
                >
                  {/* <X name="x" size={24} color="white" /> */}
                  <X color={"white"} />
                </Pressable>

                <View
                  style={{
                    flex: 1,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontWeight: "800",
                      fontSize: 16,
                    }}
                  >
                    Duo Match
                  </Text>
                  <Text
                    style={{
                      color: "#888",
                      fontSize: 12,
                      textAlign: "center",
                      marginTop: 2,
                    }}
                  >
                    Pick your friend to match with {profile.name}'s friend
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.likeModalFriendListContainer}>
              {potentialMatchFriendsFetched ? (
                <>
                  {potentialMatchFriends.length > 0 ? (
                    <>
                      {/* Compact Duo Match Tip */}
                      <View
                        style={{
                          backgroundColor: "rgba(163, 100, 245, 0.08)",
                          marginHorizontal: 20,
                          marginBottom: 8,
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          borderRadius: 8,
                          borderLeftWidth: 3,
                          borderLeftColor: mainPurple,
                        }}
                      >
                        <Text
                          style={{
                            color: "#bbb",
                            fontSize: 12,
                            lineHeight: 16,
                          }}
                        >
                          💡 Browse {profile.name}'s friends - pick one you like
                          for a double date!
                        </Text>
                      </View>

                      <FriendshipPager
                        friends={potentialMatchFriends}
                        setFriends={setPotentialMatchFriends}
                        profile_id={profile.user_id}
                      />
                    </>
                  ) : (
                    <View
                      style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "white" }}>
                        {profile.name} has no friends.
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <View
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: mainBackgroundColor,
                  }}
                >
                  <LoadingIndicator size={48} />
                </View>
              )}
            </View>
            <View style={styles.likeModalButtonsContainer}>
              {potentialMatchFriends.length > 0 && (
                <TouchableOpacity
                  style={styles.likeModalDuoButton}
                  onPress={() => setSelectFriendMenuVisible(true)}
                >
                  <Text style={styles.likeModalButtonText}>
                    Select your friend for duo match
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </SafeAreaView>
      </Modal>
      {!animationInProgress && profile && !hideProfileUI && (
        <>
          <ScrollView
            style={{
              position: "relative",
              backgroundColor: backgroundColor,
              padding: 20,
            }}
            contentContainerStyle={{
              paddingBottom: 120, // Space for action buttons + breathing room
            }}
            showsVerticalScrollIndicator={false}
          >
            <EnhancedProfileCard
              profile={profile}
              friends={potentialMatchFriends}
              friendsFetched={potentialMatchFriendsFetched}
              onBlock={handleBlock}
              onViewAllFriends={() => setShowLikeModal(true)}
            />
          </ScrollView>

          {/* New Action Button Bar */}
          <View style={styles.actionButtonContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.passButton]}
              onPress={handleDecline}
              activeOpacity={0.8}
            >
              <X size={20} color="white" />
              <Text style={[styles.actionButtonText, { color: "white" }]}>
                Pass
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.likeButton]}
              onPress={() => handleAccept()}
              activeOpacity={0.8}
            >
              <Heart size={20} color="white" />
              <Text style={[styles.actionButtonText, { color: "white" }]}>
                Like
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.duoButton]}
              onPress={() => setShowLikeModal(true)}
              activeOpacity={0.8}
            >
              <UsersRound size={20} color="white" />
              <Text style={[styles.actionButtonText, { color: "white" }]}>
                Duo Match
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  profileImage: {
    width: "100%",
    height: width - 20,
    borderRadius: 20,
    marginBottom: 20,
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "white",
  },
  bio: {
    fontSize: 16,
    textAlign: "center",
    color: "white",
  },
  actionButtonContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 4,
  },
  actionButton: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 6,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  passButton: {
    backgroundColor: "#f05d5d",
  },
  likeButton: {
    backgroundColor: "#4CAF50",
  },
  duoButton: {
    backgroundColor: mainPurple,
  },
  info: {
    backgroundColor: secondaryBackgroundColor,
    padding: 15,
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    marginBottom: 20,
    borderRadius: 10,
    gap: 15,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  noProfiles: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    backgroundColor: backgroundColor,
  },
  noProfilesText: {
    fontSize: 16,
    color: "white",
    fontWeight: "bold",
  },
  likeModalContainer: {
    backgroundColor: backgroundColor,
    flex: 1,
    flexDirection: "column",
    position: "relative",
  },
  likeModalView: {
    flex: 1,
    flexDirection: "column",
  },

  likeModalFriendListContainer: {
    flex: 1,
  },

  likeModalButtonsContainer: {
    flexDirection: "row",
    gap: 10,
    padding: 20,
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
  },
  likeModalSoloButton: {
    backgroundColor: "#57cf5c",
    padding: 20,
    borderWidth: 2,
    borderColor: "black",
    borderRadius: 10,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  likeModalDuoButton: {
    backgroundColor: "#895df0",
    padding: 20,
    borderColor: "black",
    borderRadius: 10,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  likeModalReturnButtonContainer: {
    padding: 20,
    position: "absolute",
    top: 0,
    left: 0,
  },
  likeModalReturnButton: {
    backgroundColor: "#f05d5d",
    borderWidth: 2,
    borderColor: "black",
    borderRadius: 10,
    flex: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: 130,
    height: 40,
  },
  likeModalButtonText: {
    color: "black",
    fontWeight: "800",
    fontSize: 14,
  },
  page: {
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  pagerView: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    width: "100%",
  },
  pagerViewItem: {
    borderRadius: 20,
    flex: 0,
    margin: 20,
    marginBottom: 100,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "800",
    color: "white",
  },
  mainProfileImage: {
    width: "100%",
    height: width - 40,
    borderRadius: 12,
  },
  profileInfo: {
    backgroundColor: secondaryBackgroundColor,
    padding: 15,
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    marginBottom: 20,
    borderRadius: 10,
    gap: 15,
  },
  profileInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  profileBio: {
    fontSize: 16,
    textAlign: "left",
    color: "white",
    flex: 1,
  },
});
