import LoadingIndicator from "@/components/LoadingIndicator";
import ProfileCard from "@/components/ProfileCard";
import {
  mainBackgroundColor,
  mainPurple,
  secondaryBackgroundColor,
} from "@/constants/globalStyles";
import useWebSocket from "@/hooks/useWebsocket";
import { useSession } from "@/stores/auth";
import { Friendship, Profile } from "@/types/api";
import {
  SocketProfileResponseData
} from "@/types/socket";
import apiFetch from "@/utils/fetch";
import { messageHandler } from "@/utils/websocket";
import {
  FontAwesome,
  FontAwesome6,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Heart, RotateCw, UsersRound, X } from "lucide-react-native";
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

function HeartAnimation({ visible, onAnimationComplete }: { visible: boolean, onAnimationComplete: () => void }) {
  // Separate animated values for background and icon
  const backgroundOpacity = useSharedValue(0);
  const iconOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0.5);
  
  useEffect(() => {
    if (visible) {
      // Background just fades in
      backgroundOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
      
      // Icon fades in and scales
      iconOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
      iconScale.value = withSequence(
        withTiming(1.2, { duration: 400, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
        withTiming(1, { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
      );
      
      setTimeout(() => {
        // Background and icon fade out
        backgroundOpacity.value = withTiming(0, { 
          duration: 400, 
          easing: Easing.out(Easing.ease) 
        });
        
        iconOpacity.value = withTiming(0, { 
          duration: 400, 
          easing: Easing.out(Easing.ease) 
        }, () => {
          runOnJS(onAnimationComplete)();
        });
      }, 1200);
    } else {
      backgroundOpacity.value = 0;
      iconOpacity.value = 0;
      iconScale.value = 0.5;
    }
  }, [visible]);
  
  const backgroundStyle = useAnimatedStyle(() => {
    return {
      opacity: backgroundOpacity.value,
    };
  });
  
  const iconStyle = useAnimatedStyle(() => {
    return {
      opacity: iconOpacity.value,
      transform: [{ scale: iconScale.value }],
    };
  });
  
  if (!visible) return null;
  
  return (
    <View 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
      }}
    >
      <Animated.View 
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#000000',
          },
          backgroundStyle
        ]}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
          },
          iconStyle
        ]}
      >
        <Heart size={150} color="#5df067" />
      </Animated.View>
    </View>
  );
}

function XAnimation({ visible, onAnimationComplete }: { visible: boolean, onAnimationComplete: () => void }) {
  // Separate animated values for background and icon
  const backgroundOpacity = useSharedValue(0);
  const iconOpacity = useSharedValue(0);
  const rotation = useSharedValue(0);
  
  useEffect(() => {
    if (visible) {
      console.log("X animation started");
      
      // Background just fades in
      backgroundOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
      
      // Icon fades in and rotates
      iconOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
      rotation.value = withSequence(
        withTiming(45, { duration: 400, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
        withTiming(0, { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
      );
      
      setTimeout(() => {
        console.log("X animation finishing");
        
        // Background and icon fade out
        backgroundOpacity.value = withTiming(0, { 
          duration: 400, 
          easing: Easing.out(Easing.ease) 
        });
        
        iconOpacity.value = withTiming(0, { 
          duration: 400, 
          easing: Easing.out(Easing.ease) 
        }, () => {
          console.log("X animation complete callback triggered");
          runOnJS(onAnimationComplete)();
        });
      }, 1200);
    } else {
      backgroundOpacity.value = 0;
      iconOpacity.value = 0;
      rotation.value = 0;
    }
  }, [visible]);
  
  const backgroundStyle = useAnimatedStyle(() => {
    return {
      opacity: backgroundOpacity.value,
    };
  });
  
  const iconStyle = useAnimatedStyle(() => {
    return {
      opacity: iconOpacity.value,
      transform: [{ rotateZ: `${rotation.value}deg` }],
    };
  });
  
  if (!visible) return null;
  
  return (
    <View 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
      }}
    >
      <Animated.View 
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#000000',
          },
          backgroundStyle
        ]}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
          },
          iconStyle
        ]}
      >
        <X size={150} color="#f05d5d" />
      </Animated.View>
    </View>
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
                Select a friend
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
              <View style={{ flexDirection: "column", gap: 20 }}>
                <Text style={{ color: "white", fontWeight: "700" }}>
                  You have no friends.
                </Text>
                <TouchableOpacity
                  style={{
                    borderRadius: 10,
                    flexDirection: "row",
                    gap: 10,
                    marginTop: 10,
                  }}
                  onPress={() => {
                    setMenuVisible(false);
                    setShowLikeModalVisible(false);
                    router.push("/friends");
                  }}
                >
                  <FontAwesome6 name="plus" size={18} color="white" />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: "white",
                    }}
                  >
                    Invite a friend
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

function AnimatedProfileCard({ profile, onBlock }: { profile: Profile, onBlock: () => void }) {
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
        easing: Easing.out(Easing.ease) 
      });
      
      translateY.value = withTiming(0, { 
        duration: 200, 
        easing: Easing.out(Easing.ease) 
      });
    }
  }, [profile]);
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }]
    };
  });
  
  return (
    <Animated.View style={animatedStyle}>
      <ProfileCard profile={profile} onBlock={onBlock} />
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
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [showXAnimation, setShowXAnimation] = useState(false);
  const [animationInProgress, setAnimationInProgress] = useState(false);
  const [pendingProfileRequest, setPendingProfileRequest] = useState(false);
  const [hideProfileUI, setHideProfileUI] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'like' | 'dislike';
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
      setPendingAction({ type: 'like', friendId });
      return;
    }
    
    // If modal is closed, proceed normally
    setHideProfileUI(true);
    setShowHeartAnimation(true);
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
      setPendingAction({ type: 'dislike' });
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
        console.log("Profile response successful, animation in progress:", animationInProgressRef.current);
        
        // Start fetching new profile immediately regardless of animation state
        if (!fetchInProgressRef.current) {
          fetchInProgressRef.current = true;
          console.log("Starting profile fetch immediately");
          
          // Begin fetching but don't update UI yet
          fetchNextProfile().then(newProfile => {
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
        
        if (pendingAction.type === 'like') {
          // Process like action
          setHideProfileUI(true);
          setShowHeartAnimation(true);
          setAnimationInProgress(true);
          animationInProgressRef.current = true;
          
          sendMessage({
            type: "profile",
            data: {
              decision: "like",
              target_profile: profile?.user_id as number,
              is_duo: !!pendingAction.friendId,
              ...(pendingAction.friendId && { friend_profile: pendingAction.friendId }),
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
      <HeartAnimation 
        visible={showHeartAnimation} 
        onAnimationComplete={() => {
          console.log("Heart animation complete");
          setShowHeartAnimation(false);
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
                    {profile.name}'s Friends
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.likeModalFriendListContainer}>
              {potentialMatchFriendsFetched ? (
                <>
                  {potentialMatchFriends.length > 0 ? (
                    <>
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
                  <Text style={styles.likeModalButtonText}>Invite a friend</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </SafeAreaView>
      </Modal>
      {(!animationInProgress && profile && !hideProfileUI) && (
        <>
          <ScrollView
            style={{
              position: "relative",
              backgroundColor: backgroundColor,
              padding: 20,
            }}
          >
            <AnimatedProfileCard profile={profile} onBlock={handleBlock} />
          </ScrollView>

          <TouchableOpacity style={styles.declineButton} onPress={handleDecline}>
            <X size={24} color="black" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => handleAccept()}
          >
            <Heart size={24} color="black" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.friendButton}
            onPress={() => setShowLikeModal(true)}
          >
            <UsersRound size={24} color="black" />
          </TouchableOpacity>
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
  friendButton: {
    backgroundColor: mainPurple,
    width: 60,
    height: 60,
    borderRadius: 100,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    bottom: 80,
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
});
