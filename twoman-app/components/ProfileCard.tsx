import {
  Alert,
  Dimensions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Profile } from "@/types/api";
import {
  globalStyles,
  mainBackgroundColor,
  secondaryBackgroundColor,
} from "../constants/globalStyles";
import {
  AlertTriangle,
  Book,
  BriefcaseBusiness,
  Cake,
  MapPin,
  MessageSquareHeart,
  MoreHorizontal,
  NotepadText,
  UserRoundMinus,
} from "lucide-react-native";
import { useState } from "react";
import { FontAwesome } from "@expo/vector-icons";
import apiFetch from "@/utils/fetch";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

export default function ProfileCard({
  profile,
  onBlock,
  showOptionButton = true,
}: {
  profile: Profile;
  onBlock: () => void;
  showOptionButton?: boolean;
}) {
  const [profileOptionsVisible, setProfileOptionsVisible] = useState(false);

  const ZoomableImage = ({ imageUri }: { imageUri: string }) => {
    const scale = useSharedValue(1);
    const focalX = useSharedValue(0);
    const focalY = useSharedValue(0);

    const pinchGesture = Gesture.Pinch()
      .onUpdate((e) => {
        scale.value = Math.max(1, e.scale);
        focalX.value = e.focalX;
        focalY.value = e.focalY;
      })
      .onEnd(() => {
        scale.value = withTiming(1, { duration: 200 });
      });

    const animatedImageStyle = useAnimatedStyle(() => {
      return {
        transform: [
          { translateX: (1 - scale.value) * (focalX.value - width / 2) },
          { translateY: (1 - scale.value) * (focalY.value - (width - 20) / 2) },
          { scale: scale.value },
        ],
      };
    });

    const animatedContainerStyle = useAnimatedStyle(() => {
      return {
        zIndex: scale.value > 1 ? 1000 : 1,
        elevation: scale.value > 1 ? 1000 : 0, // For Android
      };
    });

    return (
      <GestureDetector gesture={pinchGesture}>
        <Animated.View
          style={[
            {
              width: "100%",
              height: width - 20,
              marginBottom: 20,
            },
            animatedContainerStyle,
          ]}
        >
          <Animated.Image
            source={{ uri: imageUri }}
            style={[
              styles.profileImage,
              animatedImageStyle,
              { marginBottom: 0 },
            ]}
          />
        </Animated.View>
      </GestureDetector>
    );
  };

  const handleBlockProfile = async () => {
    try {
      const response = await apiFetch("/profile/block", {
        method: "POST",
        body: {
          profile_id: profile.user_id,
        },
      });

      if (!response.success) {
        console.log(response.error);
        return;
      }

      Alert.alert(
        "Profile Blocked",
        "You will no longer see this profile in your matches.",
      );

      onBlock();
    } catch (error) {
      console.log(error);
    }
  };

  const handleReportProfile = async (reason?: string) => {
    if (!reason) return;

    try {
      const response = await apiFetch("/profile/report", {
        method: "POST",
        body: JSON.stringify({
          reported_id: profile.user_id,
          reason,
        }),
      });

      if (!response.success) {
        console.log(response.error);
        return;
      }

      Alert.alert(
        "Profile Reported",
        "We will review this profile and take appropriate action. Thank you for your report.",
      );
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <>
      <Modal
        visible={profileOptionsVisible && showOptionButton}
        presentationStyle={"pageSheet"}
        animationType={"slide"}
        onRequestClose={() => setProfileOptionsVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: mainBackgroundColor,
          }}
        >
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
                  setProfileOptionsVisible(false);
                }}
                style={{
                  flex: 1,
                  zIndex: 1,
                }}
              >
                <FontAwesome name="angle-down" size={24} color="white" />
              </Pressable>
            </View>
          </View>
          <View style={styles.profileOptionsContent}>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => {
                Alert.prompt(
                  "Report Profile",
                  "Please provide a reason for reporting this profile.",
                  [
                    {
                      text: "Cancel",
                      style: "cancel",
                    },
                    {
                      text: "Report",
                      onPress: (reason) => handleReportProfile(reason),
                    },
                  ],
                );
              }}
            >
              <AlertTriangle size={18} color="white" />
              <Text style={styles.optionButtonText}>Report Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => {
                Alert.alert(
                  "Are you sure you want to block this profile?",
                  "You can unblock them later.",
                  [
                    {
                      text: "Cancel",
                      style: "cancel",
                    },
                    {
                      text: "Block",
                      onPress: handleBlockProfile,
                    },
                  ],
                );
              }}
            >
              <UserRoundMinus size={18} color="white" />
              <Text style={styles.optionButtonText}>Block Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <View style={styles.container}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <Text style={styles.name}>{profile.name}</Text>
          {showOptionButton && (
            <TouchableOpacity onPress={() => setProfileOptionsVisible(true)}>
              <MoreHorizontal color={"white"} size={20} />
            </TouchableOpacity>
          )}
        </View>
        <ZoomableImage imageUri={profile.image1} />
        <View style={styles.info}>
          <View style={styles.infoItem}>
            <NotepadText size={18} color="white" />
            <Text style={styles.bio}>{profile.bio}</Text>
          </View>
        </View>
        <View style={styles.info}>
          <View style={styles.infoItem}>
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
          <View style={styles.infoItem}>
            <MapPin size={18} color="white" />
            <Text style={globalStyles.regularText}>{profile.city}</Text>
          </View>
          {profile.education && (
            <View style={styles.infoItem}>
              <Book size={18} color="white" />
              <Text style={globalStyles.regularText}>{profile.education}</Text>
            </View>
          )}
          {profile.occupation && (
            <View style={styles.infoItem}>
              <BriefcaseBusiness size={18} color="white" />
              <Text style={globalStyles.regularText}>{profile.occupation}</Text>
            </View>
          )}
          {profile.interests && (
            <View style={styles.infoItem}>
              <MessageSquareHeart size={18} color="white" />
              <Text style={globalStyles.regularText}>{profile.interests}</Text>
            </View>
          )}
        </View>
        {profile.image2 && <ZoomableImage imageUri={profile.image2} />}
        {profile.image3 && <ZoomableImage imageUri={profile.image3} />}
        {profile.image4 && <ZoomableImage imageUri={profile.image4} />}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  profileImage: {
    width: "100%",
    height: width - 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "white",
  },
  bio: {
    fontSize: 16,
    color: "white",
  },
  acceptButton: {
    backgroundColor: "#5df067",
    width: 60,
    height: 60,
    borderRadius: 100,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    bottom: 10,
    right: 15,
    zIndex: 1,
  },
  declineButton: {
    backgroundColor: "#f05d5d",
    width: 60,
    height: 60,
    borderRadius: 100,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    bottom: 10,
    left: 15,
    zIndex: 1,
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
    alignItems: "flex-start",
    gap: 10,
    paddingRight: 10,
  },
  noProfiles: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    backgroundColor: mainBackgroundColor,
  },
  noProfilesText: {
    fontSize: 16,
    color: "white",
    fontWeight: "bold",
  },
  likeModalContainer: {
    backgroundColor: mainBackgroundColor,
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
    borderWidth: 2,
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
  profileOptionsContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  optionButton: {
    backgroundColor: secondaryBackgroundColor,
    padding: 15,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  optionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "400",
  },
});
