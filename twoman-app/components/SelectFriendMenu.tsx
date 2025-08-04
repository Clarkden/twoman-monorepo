import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Pressable,
  Modal,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { FontAwesome, FontAwesome6 } from '@expo/vector-icons';
import { X, UsersRound } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Friendship } from '../types/api';
import { 
  mainBackgroundColor, 
  secondaryBackgroundColor,
  mainPurple,
  goldYellow 
} from '../constants/globalStyles';

interface SelectFriendMenuProps {
  visible: boolean;
  friends: Friendship[];
  currentUserId: number;
  onSelectFriend: (friendId: number) => void;
  onClose: () => void;
}

const SelectFriendMenu: React.FC<SelectFriendMenuProps> = ({
  visible,
  friends,
  currentUserId,
  onSelectFriend,
  onClose,
}) => {
  const router = useRouter();
  const selectFriendModalViewOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
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
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: selectFriendModalViewOpacity.value,
    };
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: mainBackgroundColor }}>
        <Animated.View style={[{ flex: 1 }, animatedStyle]}>
          <View style={{
            flex: 1,
            backgroundColor: mainBackgroundColor,
            paddingHorizontal: 20,
            paddingTop: 10,
          }}>
            {/* Header with close button */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 30,
                paddingTop: 10,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: "white",
                    fontWeight: "800",
                    fontSize: 24,
                    marginBottom: 8,
                  }}
                >
                  Choose Your Duo Partner
                </Text>
                <Text
                  style={{
                    color: "#888",
                    fontSize: 16,
                    lineHeight: 22,
                  }}
                >
                  Pick which friend to send this standout star with
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                style={{
                  padding: 8,
                  backgroundColor: secondaryBackgroundColor,
                  borderRadius: 20,
                  marginLeft: 16,
                }}
              >
                <X size={20} color="white" />
              </Pressable>
            </View>

            {/* Friends list or no friends state */}
            <ScrollView 
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ flexGrow: 1 }}
            >
              {friends.length > 0 ? (
              <>
                {friends.map((friendship, i) => {
                  const friend = friendship.ProfileID !== currentUserId 
                    ? friendship.Profile 
                    : friendship.Friend;

                  return (
                    <View key={i}>
                      <TouchableOpacity
                        onPress={() => {
                          onSelectFriend(friend.user_id);
                          onClose();
                        }}
                        style={{
                          backgroundColor: secondaryBackgroundColor,
                          borderRadius: 16,
                          flexDirection: "row",
                          alignItems: "center",
                          padding: 16,
                          marginVertical: 8,
                        }}
                      >
                        <Image
                          source={{ uri: friend.image1 }}
                          style={{
                            width: 60,
                            height: 60,
                            borderRadius: 30,
                            borderWidth: 3,
                            borderColor: mainPurple,
                            marginRight: 16,
                          }}
                        />

                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              color: "white",
                              fontWeight: "700",
                              fontSize: 18,
                              marginBottom: 4,
                            }}
                          >
                            {friend.name}
                          </Text>
                          <Text
                            style={{
                              color: "#888",
                              fontSize: 14,
                            }}
                          >
                            Tap to select as duo partner
                          </Text>
                        </View>

                        <View style={{
                          backgroundColor: mainPurple,
                          borderRadius: 20,
                          padding: 8,
                        }}>
                          <FontAwesome name="chevron-right" size={16} color="white" />
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                })}
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
                  Invite friends to unlock duo standouts{"\n"}and earn amazing rewards!
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
                    onClose();
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
                  More friends = More standouts = More fun! 🎉
                </Text>
              </View>
            )}
            </ScrollView>
          </View>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
};

export default SelectFriendMenu;