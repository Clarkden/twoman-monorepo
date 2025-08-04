import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { mainPurple, goldYellow } from '../constants/globalStyles';

const { width, height } = Dimensions.get('window');

interface StarAnimationProps {
  visible: boolean;
  onAnimationComplete: () => void;
}

export function SoloStarAnimation({ visible, onAnimationComplete }: StarAnimationProps) {
  const backgroundOpacity = useSharedValue(0);
  const starScale = useSharedValue(0);
  const starOpacity = useSharedValue(0);
  const starRotation = useSharedValue(0);
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

  useEffect(() => {
    if (visible) {
      // Reset all values
      backgroundOpacity.value = 0;
      starScale.value = 0;
      starOpacity.value = 0;
      starRotation.value = 0;
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

      // PHASE 1: Flash effect
      flashOpacity.value = withSequence(
        withTiming(1, { duration: 50, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 150, easing: Easing.out(Easing.quad) })
      );

      backgroundOpacity.value = withTiming(0.6, {
        duration: 100,
        easing: Easing.out(Easing.quad),
      });

      // PHASE 2: Star appears and grows
      starOpacity.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.back(1.7)),
      });
      
      starScale.value = withSequence(
        withTiming(1.5, { duration: 300, easing: Easing.out(Easing.back(1.7)) }),
        withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) })
      );

      starRotation.value = withTiming(360, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      });

      // PHASE 3: Particle explosion
      setTimeout(() => {
        // Particle 1 - top right
        particle1Opacity.value = withSequence(
          withTiming(1, { duration: 100 }),
          withDelay(400, withTiming(0, { duration: 300 }))
        );
        particle1Scale.value = withSequence(
          withTiming(1, { duration: 200, easing: Easing.out(Easing.back(1.5)) }),
          withTiming(0.5, { duration: 300, easing: Easing.out(Easing.quad) })
        );
        particle1X.value = withTiming(80, { duration: 500, easing: Easing.out(Easing.quad) });
        particle1Y.value = withTiming(-60, { duration: 500, easing: Easing.out(Easing.quad) });

        // Particle 2 - left
        particle2Opacity.value = withSequence(
          withTiming(1, { duration: 100 }),
          withDelay(350, withTiming(0, { duration: 300 }))
        );
        particle2Scale.value = withSequence(
          withTiming(1, { duration: 180, easing: Easing.out(Easing.back(1.5)) }),
          withTiming(0.5, { duration: 320, easing: Easing.out(Easing.quad) })
        );
        particle2X.value = withTiming(-70, { duration: 500, easing: Easing.out(Easing.quad) });
        particle2Y.value = withTiming(20, { duration: 500, easing: Easing.out(Easing.quad) });

        // Particle 3 - bottom
        particle3Opacity.value = withSequence(
          withTiming(1, { duration: 100 }),
          withDelay(400, withTiming(0, { duration: 300 }))
        );
        particle3Scale.value = withSequence(
          withTiming(1, { duration: 220, easing: Easing.out(Easing.back(1.5)) }),
          withTiming(0.5, { duration: 280, easing: Easing.out(Easing.quad) })
        );
        particle3X.value = withTiming(20, { duration: 500, easing: Easing.out(Easing.quad) });
        particle3Y.value = withTiming(80, { duration: 500, easing: Easing.out(Easing.quad) });
      }, 200);

      // PHASE 4: Fade out and complete
      setTimeout(() => {
        backgroundOpacity.value = withTiming(0, {
          duration: 300,
          easing: Easing.out(Easing.quad),
        });
        starOpacity.value = withTiming(0, {
          duration: 300,
          easing: Easing.out(Easing.quad),
        });
        
        setTimeout(() => {
          runOnJS(onAnimationComplete)();
        }, 300);
      }, 1200);
    }
  }, [visible]);

  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  const starStyle = useAnimatedStyle(() => ({
    opacity: starOpacity.value,
    transform: [
      { scale: starScale.value },
      { rotate: `${starRotation.value}deg` },
    ],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
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

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Background overlay */}
      <Animated.View style={[styles.background, backgroundStyle]} />
      
      {/* Flash effect */}
      <Animated.View style={[styles.flash, flashStyle]} />
      
      {/* Main star */}
      <Animated.View style={[styles.centerContainer, starStyle]}>
        <FontAwesome name="star" size={80} color={goldYellow} />
      </Animated.View>
      
      {/* Particles */}
      <Animated.View style={[styles.centerContainer, particle1Style]}>
        <FontAwesome name="star" size={20} color={mainPurple} />
      </Animated.View>
      
      <Animated.View style={[styles.centerContainer, particle2Style]}>
        <FontAwesome name="star" size={16} color={goldYellow} />
      </Animated.View>
      
      <Animated.View style={[styles.centerContainer, particle3Style]}>
        <FontAwesome name="star" size={18} color={mainPurple} />
      </Animated.View>
    </View>
  );
}

export function DuoStarAnimation({ visible, onAnimationComplete }: StarAnimationProps) {
  const backgroundOpacity = useSharedValue(0);
  const star1Scale = useSharedValue(0);
  const star1Opacity = useSharedValue(0);
  const star1X = useSharedValue(-40);
  const star1Rotation = useSharedValue(0);
  const star2Scale = useSharedValue(0);
  const star2Opacity = useSharedValue(0);
  const star2X = useSharedValue(40);
  const star2Rotation = useSharedValue(0);
  const connectionOpacity = useSharedValue(0);
  const connectionScale = useSharedValue(0);
  const flashOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Reset all values
      backgroundOpacity.value = 0;
      star1Scale.value = 0;
      star1Opacity.value = 0;
      star1X.value = -40;
      star1Rotation.value = 0;
      star2Scale.value = 0;
      star2Opacity.value = 0;
      star2X.value = 40;
      star2Rotation.value = 0;
      connectionOpacity.value = 0;
      connectionScale.value = 0;
      flashOpacity.value = 0;

      // PHASE 1: Flash effect
      flashOpacity.value = withSequence(
        withTiming(1, { duration: 50, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 150, easing: Easing.out(Easing.quad) })
      );

      backgroundOpacity.value = withTiming(0.6, {
        duration: 100,
        easing: Easing.out(Easing.quad),
      });

      // PHASE 2: Stars appear from sides
      star1Opacity.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.back(1.7)),
      });
      star2Opacity.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.back(1.7)),
      });

      star1Scale.value = withSequence(
        withTiming(1.2, { duration: 300, easing: Easing.out(Easing.back(1.7)) }),
        withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) })
      );
      star2Scale.value = withSequence(
        withTiming(1.2, { duration: 300, easing: Easing.out(Easing.back(1.7)) }),
        withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) })
      );

      // PHASE 3: Stars move towards center
      setTimeout(() => {
        star1X.value = withTiming(-15, {
          duration: 400,
          easing: Easing.out(Easing.back(1.5)),
        });
        star2X.value = withTiming(15, {
          duration: 400,
          easing: Easing.out(Easing.back(1.5)),
        });

        star1Rotation.value = withTiming(360, {
          duration: 600,
          easing: Easing.out(Easing.cubic),
        });
        star2Rotation.value = withTiming(-360, {
          duration: 600,
          easing: Easing.out(Easing.cubic),
        });
      }, 300);

      // PHASE 4: Connection effect
      setTimeout(() => {
        connectionOpacity.value = withSequence(
          withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) }),
          withDelay(300, withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) }))
        );
        connectionScale.value = withSequence(
          withTiming(1, { duration: 300, easing: Easing.out(Easing.back(1.5)) }),
          withTiming(1.2, { duration: 200, easing: Easing.out(Easing.quad) })
        );
      }, 500);

      // PHASE 5: Fade out and complete
      setTimeout(() => {
        backgroundOpacity.value = withTiming(0, {
          duration: 300,
          easing: Easing.out(Easing.quad),
        });
        star1Opacity.value = withTiming(0, {
          duration: 300,
          easing: Easing.out(Easing.quad),
        });
        star2Opacity.value = withTiming(0, {
          duration: 300,
          easing: Easing.out(Easing.quad),
        });
        
        setTimeout(() => {
          runOnJS(onAnimationComplete)();
        }, 300);
      }, 1200);
    }
  }, [visible]);

  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  const star1Style = useAnimatedStyle(() => ({
    opacity: star1Opacity.value,
    transform: [
      { scale: star1Scale.value },
      { translateX: star1X.value },
      { rotate: `${star1Rotation.value}deg` },
    ],
  }));

  const star2Style = useAnimatedStyle(() => ({
    opacity: star2Opacity.value,
    transform: [
      { scale: star2Scale.value },
      { translateX: star2X.value },
      { rotate: `${star2Rotation.value}deg` },
    ],
  }));

  const connectionStyle = useAnimatedStyle(() => ({
    opacity: connectionOpacity.value,
    transform: [{ scale: connectionScale.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Background overlay */}
      <Animated.View style={[styles.background, backgroundStyle]} />
      
      {/* Flash effect */}
      <Animated.View style={[styles.flash, flashStyle]} />
      
      {/* Connection line/sparkle */}
      <Animated.View style={[styles.centerContainer, connectionStyle]}>
        <View style={styles.connectionLine} />
      </Animated.View>
      
      {/* Stars */}
      <Animated.View style={[styles.centerContainer, star1Style]}>
        <FontAwesome name="star" size={60} color={goldYellow} />
      </Animated.View>
      
      <Animated.View style={[styles.centerContainer, star2Style]}>
        <FontAwesome name="star" size={60} color={mainPurple} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: goldYellow,
  },
  centerContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectionLine: {
    width: 100,
    height: 4,
    backgroundColor: goldYellow,
    borderRadius: 2,
    shadowColor: goldYellow,
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
});