import { DuoProfileCard } from "@/components/DuoProfileCard";
import ProfileCard from "@/components/ProfileCard";
import { SoloProfileCard } from "@/components/SoloProfileCard";
import {
  accentGray,
  globalStyles,
  mainBackgroundColor,
  secondaryBackgroundColor,
} from "@/constants/globalStyles";
import useWebSocket from "@/hooks/useWebsocket";
import { useSession } from "@/stores/auth";
import { useIsPro, useSubscriptionStore } from "@/stores/subscription";
import { Friendship, Match, Profile } from "@/types/api";
import apiFetch from "@/utils/fetch";
import { messageHandler } from "@/utils/websocket";
import { FontAwesome } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
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
import { BlurView } from "expo-blur";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import Purchases from "react-native-purchases";

const { width } = Dimensions.get("window");

async function presentPaywall(): Promise<boolean> {
  console.log("Starting presentPaywall function for likes");
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

// TODO: Refactor this component to be re-useable since it is also similar to the component in index.tsx
function FriendshipPager({
  friends,
  profile_id,
  matchId,
  handleUpdateTarget,
  onBlock,
}: {
  friends: Friendship[];
  profile_id: number;
  matchId: number;
  handleUpdateTarget: () => void;
  onBlock: () => void;
}) {
  const pagerRef = useRef<PagerView>(null);
  const [selectedFriendIndex, setSelectedFriendIndex] = useState<number>(0);

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
          <SoloProfileCard
            profile={
              friendship.Profile.user_id !== profile_id
                ? friendship.Profile
                : friendship.Friend
            }
            matchId={matchId}
            handleUpdateTarget={handleUpdateTarget}
            onBlock={onBlock}
            key={i}
          />
        ))}
      </PagerView>
    </>
  );
}

function PotentialMatchContent({
  match,
  onBlock,
}: {
  match: Match;
  onBlock: () => void;
}) {
  if (match.is_duo) {
    return (
      <View style={{ height: "100%" }}>
        <DuoProfileCard match={match} onBlock={onBlock} />
      </View>
    );
  }

  return (
    <View
      style={{
        margin: -20,
      }}
    >
      <SoloProfileCard
        profile={match.profile1}
        matchId={match.ID}
        onBlock={onBlock}
      />
    </View>
  );
}

function PendingTargetContent({
  match,
  handleUpdateTarget,
  onBlock,
}: {
  match: Match;

  handleUpdateTarget: () => void;
  onBlock: () => void;
}) {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [friendsLoaded, setFriendsLoaded] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  const fetchPotentialMatchFriends = async () => {
    if (!match.profile3) return;

    if (friends.length > 0) return;

    try {
      const response = await apiFetch<Friendship[]>(
        `/profile/${match.profile3.user_id}/friends`
      );

      if (response.code !== 200) {
        console.log(response.error);
        return;
      }

      setFriends(response.data);
      setFriendsLoaded(true);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchPotentialMatchFriends();
  }, []);

  return (
    <View
      style={{
        flexDirection: "column",
        gap: 20,
        height: "100%",
        width: "100%",
      }}
    >
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => {
          setModalVisible(false);
        }}
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={{ flex: 1, padding: 20, gap: 20 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Pressable
                onPress={() => {
                  setModalVisible(false);
                }}
              >
                <FontAwesome name="angle-down" size={24} color="white" />
              </Pressable>
            </View>
            {selectedProfile && (
              <ScrollView>
                <ProfileCard
                  profile={selectedProfile}
                  onBlock={() => {}}
                  showOptionButton={false}
                />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
      <View
        style={{
          flexDirection: "row",
          gap: 10,
        }}
      >
        <TouchableOpacity
          style={{
            backgroundColor: "#2e2e2e",
            flex: 1,
            padding: 10,
            borderRadius: 10,
            flexDirection: "row",
            gap: 10,
          }}
          onPress={() => {
            setSelectedProfile(match.profile1);
            setModalVisible(true);
          }}
        >
          <Image
            source={{ uri: match.profile1.image1 }}
            style={{
              width: 50,
              height: 50,
              borderRadius: 8,
            }}
          />
          <View style={{ flex: 1, gap: 1 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "white",
              }}
              numberOfLines={1}
            >
              {match.profile1.name}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: "white",
              }}
            >
              Tap to View
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            backgroundColor: "#2e2e2e",
            flex: 1,
            padding: 10,
            borderRadius: 10,
            flexDirection: "row",
            gap: 10,
          }}
          onPress={() => {
            setSelectedProfile(match.profile3);
            setModalVisible(true);
          }}
        >
          <Image
            source={{ uri: match.profile3.image1 }}
            style={{
              width: 50,
              height: 50,
              borderRadius: 8,
            }}
          />
          <View style={{ flex: 1, gap: 1 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "white",
              }}
              numberOfLines={1}
            >
              {match.profile3.name}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: "white",
              }}
            >
              Tap to View
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text
        style={{
          fontSize: 16,
          fontWeight: "bold",
          color: "white",
          marginBottom: 20,
        }}
      >
        {match.profile3.name}'s Friends
      </Text>

      <View style={{ flex: 1, margin: -20 }}>
        {friendsLoaded && (
          <FriendshipPager
            friends={friends}
            profile_id={match.profile3_id}
            matchId={match.ID}
            handleUpdateTarget={handleUpdateTarget}
            onBlock={onBlock}
          />
        )}
      </View>
    </View>
  );
}

function PotentialMatchModal({
  visible,
  setVisible,
  match,
  handleAcceptMatch,
  handleRejectMatch,
  handleUpdateTarget,
  onBlock,
  userId,
}: {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  match: Match;
  handleAcceptMatch: () => void;
  handleRejectMatch: () => void;
  handleUpdateTarget: (target: number) => void;
  onBlock: () => void;
  userId: number;
}) {
  const updateTarget = () => {
    handleUpdateTarget(match.ID);
  };

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={() => {
        setVisible(!visible);
      }}
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ padding: 20, flexDirection: "column", gap: 20 }}>
            <View
              style={{
                flexDirection: "row",
                gap: 10,
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <Pressable
                onPress={() => {
                  setVisible(false);
                }}
                style={{
                  flex: 1,
                }}
              >
                <FontAwesome name="angle-down" size={24} color="white" />
              </Pressable>
              <View
                style={{
                  alignItems: "center",
                }}
              >
                {match &&
                  !(
                    match.profile2_id === userId &&
                    !match.profile4_id &&
                    match.status === "pending"
                  ) && (
                    <TouchableOpacity
                      style={{
                        borderColor: "#a364f5",
                        borderWidth: 1,
                        padding: 5,
                        paddingHorizontal: 10,
                        borderRadius: 5,
                      }}
                      onPress={() => {
                        handleAcceptMatch();
                      }}
                    >
                      <Text style={{ color: "#a364f5", fontSize: 12 }}>
                        Accept
                      </Text>
                    </TouchableOpacity>
                  )}
              </View>
              <TouchableOpacity
                style={{
                  borderColor: "#ff5555",
                  borderWidth: 1,
                  padding: 5,
                  paddingHorizontal: 10,
                  borderRadius: 5,
                }}
                onPress={() => {
                  handleRejectMatch();
                }}
              >
                <Text style={{ color: "#ff5555", fontSize: 12 }}>Reject</Text>
              </TouchableOpacity>
            </View>
            {match && (
              <>
                {match.profile2_id === userId &&
                !match.profile4_id &&
                match.status === "pending" ? (
                  <PendingTargetContent
                    match={match}
                    handleUpdateTarget={updateTarget}
                    onBlock={onBlock}
                  />
                ) : (
                  <PotentialMatchContent match={match} onBlock={onBlock} />
                )}
              </>
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export default function LikeScreen() {
  const [pendingMatches, setPendingMatches] = useState<Match[]>([]);
  const [pendingTargets, setPendingTargets] = useState<Match[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const { sendMessage } = useWebSocket();
  const userId = useSession((state) => state.session?.user_id);

  // Pro status from subscription store
  const isPro = useIsPro();
  const { refreshSubscriptionStatus } = useSubscriptionStore();

  const handleGetMatches = async () => {
    const matches = await GetPendingMatches();
    setPendingMatches(matches);
  };

  const handleGetTargets = async () => {
    const pendingTargets = await GetPendingTargets();
    setPendingTargets(pendingTargets);
  };

  const handleAcceptMatch = async () => {
    if (selectedMatch) {
      MatchDecision(selectedMatch.ID.toString(), true, sendMessage);
      setModalVisible(false);
    }
  };

  const handleRejectMatch = async () => {
    if (selectedMatch) {
      MatchDecision(selectedMatch.ID.toString(), false, sendMessage);
      setModalVisible(false);
    }
  };

  const handleUpdateTarget = (matchId: number) => {
    setModalVisible(false);
    setPendingTargets((prev) => prev.filter((match) => match.ID !== matchId));
  };

  const handleBlock = () => {
    setModalVisible(false);
  };

  const handleBlurredMatchTap = async () => {
    console.log("Blurred match tapped, presenting paywall...");
    const purchased = await presentPaywall();

    if (purchased) {
      console.log("Purchase successful, refreshing subscription status...");
      await refreshSubscriptionStatus();
    }
  };

  useEffect(() => {
    const handleMatchMessage = (data: Match) => {
      const { ID, status, is_duo } = data;

      const updateList = (
        list: Match[],
        setList: React.Dispatch<React.SetStateAction<Match[]>>
      ) => {
        const index = list.findIndex(
          (match) => Number(match.ID) === Number(ID)
        );
        if (index !== -1 && status !== "pending") {
          setList((prev) =>
            prev.filter((match) => Number(match.ID) !== Number(ID))
          );
        }
      };

      updateList(pendingMatches, setPendingMatches);
      updateList(pendingTargets, setPendingTargets);

      if (status === "pending") {
        console.log("Match is pending");
        if (data.profile3_id === userId || data.profile4_id === userId) {
          if (is_duo) {
            console.log("Match is duo");
            if (userId === data.profile3_id && !data.profile3_accepted) {
              console.log("User is profile3 and profile3 has not accepted");
              const index = pendingMatches.findIndex(
                (match) => match.ID === data.ID
              );

              if (index === -1) {
                console.log("Match not found in pending matches, adding it");
                setPendingMatches((prev) => [...prev, data]);
              }
            } else if (userId === data.profile4_id && !data.profile4_accepted) {
              console.log("User is profile4 and profile4 has not accepted");

              const index = pendingMatches.findIndex(
                (match) => match.ID === data.ID
              );

              if (index === -1) {
                console.log("Match not found in pending matches, adding it");
                setPendingMatches((prev) => [...prev, data]);
              }
            } else {
              console.log(
                "User is not profile3 or profile4, removing match if it exists"
              );
              setPendingMatches((prev) =>
                prev.filter((match) => match.ID !== data.ID)
              );
            }
          } else {
            console.log("Match is not duo");

            if (data.profile2_id === userId && !data.profile4_id) {
              console.log(
                "User is profile2 and profile4 is null, meaning user is sole recipient of like, adding it to pending matches"
              );
              setPendingMatches((prev) => [...prev, data]);
            }
          }
        } else if (data.profile2_id === userId && !data.profile4_id) {
          console.log(
            "User is profile2 in duo match and profile4 is null, adding it to pending targets"
          );
          setPendingTargets((prev) => [...prev, data]);
        }
      }
    };

    messageHandler.subscribe("match", handleMatchMessage);

    return () => {
      messageHandler.unsubscribe("match", handleMatchMessage);
    };
  }, [pendingMatches, pendingTargets, messageHandler]);

  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused) return;

    handleGetMatches();
    handleGetTargets();
  }, [isFocused]);

  // Listen for RevenueCat subscription updates
  useEffect(() => {
    const listener = Purchases.addCustomerInfoUpdateListener(() => {
      refreshSubscriptionStatus();
    });

    return () => {
      // Cleanup listener
    };
  }, [refreshSubscriptionStatus]);

  const MatchItem = ({
    item,
    isBlurred = false,
  }: {
    item: Match;
    isBlurred?: boolean;
  }) => (
    <TouchableOpacity
      style={styles.matchContainer}
      onPress={() => {
        if (isBlurred) {
          handleBlurredMatchTap();
        } else {
          setSelectedMatch(item);
          setModalVisible(true);
        }
      }}
    >
      <View
        style={{ position: "relative", borderRadius: 10, overflow: "hidden" }}
      >
        {!item.is_duo ? (
          <View style={styles.profileContainer}>
            <Image
              source={{ uri: item.profile1.image1 }}
              style={[styles.profileImage]}
            />
            {item.is_duo && item.profile2 && (
              <Image
                source={{ uri: item.profile2.image1 }}
                style={[styles.profileImage]}
              />
            )}
          </View>
        ) : (
          <View style={styles.pendingTargetContainer}>
            <Image
              source={{ uri: item.profile1.image1 }}
              style={[styles.pendingTargetImage]}
            />
            <Image
              source={{ uri: item.profile3?.image1 }}
              style={[styles.pendingTargetImage]}
            />
            <Image
              source={{ uri: item.profile2?.image1 }}
              style={[styles.pendingTargetImage]}
            />
            <Image
              source={{ uri: item.profile4?.image1 }}
              style={[styles.pendingTargetImage]}
            />
          </View>
        )}

        {isBlurred && (
          <BlurView
            intensity={90}
            style={[
              {
                position: "absolute",
                top: 10,
                left: 0,
                right: 0,
                height: !item.is_duo ? width - 10 : (width / 2 - 25) * 2 + 10,
                justifyContent: "center",
                alignItems: "center",
                borderRadius: 10,
                overflow: "hidden",
              },
            ]}
          >
            <View style={styles.blurOverlay}>
              <FontAwesome name="lock" size={40} color="white" />
              <Text style={styles.blurText}>Upgrade to 2 Man Pro</Text>
              <Text style={styles.blurSubtext}>to see all your likes</Text>
            </View>
          </BlurView>
        )}
      </View>

      <View style={styles.matchInfo}>
        <Text style={styles.matchText}>
          {item.is_duo
            ? `${item.profile1.name} & ${item.profile2?.name}`
            : item.profile1.name}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const PendingTargetItem = ({ item }: { item: Match }) => (
    <TouchableOpacity
      style={styles.matchContainer}
      onPress={() => {
        setSelectedMatch(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.pendingTargetContainer}>
        <Image
          source={{ uri: item.profile1.image1 }}
          style={[styles.pendingTargetImage]}
        />
        <Image
          source={{ uri: item.profile3?.image1 }}
          style={[styles.pendingTargetImage]}
        />
        <Image
          source={{ uri: item.profile2?.image1 }}
          style={[styles.pendingTargetImage]}
        />
        <View
          style={[
            styles.pendingTargetImage,
            {
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              justifyContent: "center",
              alignItems: "center",
            },
          ]}
        >
          <FontAwesome name="question" size={24} color="white" />
        </View>
      </View>
      <View style={styles.matchInfo}>
        <Text style={styles.matchText}>
          {item.is_duo
            ? `${item.profile1.name} & ${item.profile3?.name}`
            : item.profile1.name}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: mainBackgroundColor }}>
      <StatusBar style="light" />

      <ScrollView style={{ flex: 1 }}>
        <View style={globalStyles.regularView}>
          <View
            style={{
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                color: accentGray,
                marginBottom: 10,
                fontWeight: "500",
              }}
            >
              2 Man Invites ({pendingTargets.length})
            </Text>
            {pendingTargets.length > 0 &&
              pendingTargets.map((match) => (
                <PendingTargetItem key={match.ID} item={match} />
              ))}
          </View>
          <View
            style={{
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                color: accentGray,
                marginBottom: 10,
                fontWeight: "500",
              }}
            >
              Likes ({pendingMatches.length})
            </Text>
            {pendingMatches.length > 0 &&
              pendingMatches.map((match, index) => {
                // If user has Pro, show all likes normally
                if (isPro) {
                  return (
                    <MatchItem key={match.ID} item={match} isBlurred={false} />
                  );
                }

                // If user doesn't have Pro, show first like clearly, blur the rest
                const isBlurred = index > 0;
                return (
                  <MatchItem
                    key={match.ID}
                    item={match}
                    isBlurred={isBlurred}
                  />
                );
              })}
          </View>
          <PotentialMatchModal
            visible={modalVisible}
            setVisible={setModalVisible}
            match={selectedMatch!}
            handleAcceptMatch={handleAcceptMatch}
            handleRejectMatch={handleRejectMatch}
            handleUpdateTarget={handleUpdateTarget}
            onBlock={handleBlock}
            userId={userId!}
          />
        </View>
      </ScrollView>
    </View>
  );
}

async function GetPendingMatches(): Promise<Match[]> {
  try {
    const response = await apiFetch<Match[]>("/match/pending");

    if (!response.success) {
      console.log(response.error);
      return [];
    }

    return response.data;
  } catch (error) {
    console.log(error);
  }
  return [];
}

async function GetPendingTargets(): Promise<Match[]> {
  try {
    const response = await apiFetch<Match[]>("/match/pending/target");

    if (!response.success) {
      console.log(response.error);
      return [];
    }

    return response.data;
  } catch (error) {
    console.log(error);
  }

  return [];
}

function MatchDecision(
  id: string,
  accept: boolean,
  sendMessage: <T = unknown>(message: T) => void
): void {
  sendMessage({
    type: "match",
    data: {
      match_id: Number(id),
      action: accept ? "accept" : "reject",
    },
  });
}

const styles = StyleSheet.create({
  matchContainer: {
    marginBottom: 20,
    // overflow: "hidden",
  },
  profileContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10,
  },
  pendingTargetContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10,
    flexWrap: "wrap",
  },
  profileImage: {
    height: width - 10,
    width: width - 40,
    borderRadius: 10,
  },
  matchInfo: {
    alignItems: "flex-start",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: mainBackgroundColor,
  },
  modalText: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: "blue",
    padding: 10,
    borderRadius: 5,
    marginTop: 20,
  },
  closeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalProfileContainer: {
    alignItems: "center",
    marginBottom: 20,
    width: "100%",
  },
  modalProfileImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  modalProfileName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#a364f5",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
  },
  acceptButton: {
    backgroundColor: "#a364f5",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  rejectButton: {
    backgroundColor: "#ff5555",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  noMatches: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  noMatchesText: {
    fontSize: 16,
    color: "white",
  },
  matchText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  pendingTargetImage: {
    height: width / 2 - 25,
    width: width / 2 - 25,
    borderRadius: 10,
    marginBottom: 10,
  },
  info: {
    backgroundColor: secondaryBackgroundColor,
    padding: 15,
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    borderRadius: 10,
    gap: 15,
  },
  pagerView: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    width: "100%",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bio: {
    fontSize: 16,
    textAlign: "center",
    color: "white",
  },
  blurOverlay: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 15,
    marginHorizontal: 20,
  },
  blurText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 10,
  },
  blurSubtext: {
    color: "white",
    fontSize: 14,
    textAlign: "center",
    marginTop: 5,
    opacity: 0.8,
  },
});
