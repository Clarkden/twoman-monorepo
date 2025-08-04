import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import { FontAwesome } from "@expo/vector-icons";
import DuoStandoutCard from "../../../components/DuoStandoutCard";
import SoloStandoutCard from "../../../components/SoloStandoutCard";
import SelectFriendMenu from "../../../components/SelectFriendMenu";
import { SoloStarAnimation, DuoStarAnimation } from "../../../components/StarAnimations";
import apiFetch from "../../../utils/fetch";
import {
  mainBackgroundColor,
  secondaryBackgroundColor,
  mainPurple,
} from "../../../constants/globalStyles";
import { Profile, Friendship } from "../../../types/api";
import { useSession } from "../../../stores/auth";
import useWebSocket from "../../../hooks/useWebsocket";

interface DuoStandout {
  id: number;
  profile1_id: number;
  profile2_id: number;
  match_count: number;
  profile1: Profile;
  profile2: Profile;
}

interface SoloStandout {
  id: number;
  profile_id: number;
  popularity_score: number;
  profile: Profile;
}

interface StarsBalance {
  balance: number;
}

export default function StandoutsScreen() {
  const [duoStandouts, setDuoStandouts] = useState<DuoStandout[]>([]);
  const [soloStandouts, setSoloStandouts] = useState<SoloStandout[]>([]);
  const [starsBalance, setStarsBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingLike, setSendingLike] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [showFriendMenu, setShowFriendMenu] = useState(false);
  const [pendingDuoStandout, setPendingDuoStandout] = useState<{ profile1Id: number; profile2Id: number; starsCost: number } | null>(null);
  const [showSoloStarAnimation, setShowSoloStarAnimation] = useState(false);
  const [showDuoStarAnimation, setShowDuoStarAnimation] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const userId = useSession((state) => state.session?.user_id);
  const { sendMessage } = useWebSocket();

  const fetchStandouts = async () => {
    try {
      const [duoResponse, soloResponse, starsResponse, friendsResponse] = await Promise.all([
        apiFetch("/standouts/duo"),
        apiFetch("/standouts/solo"),
        apiFetch("/stars/balance"),
        apiFetch("/friends"),
      ]);

      if (duoResponse.success) {
        setDuoStandouts((duoResponse.data as any)?.duo_standouts || []);
      }

      if (soloResponse.success) {
        setSoloStandouts((soloResponse.data as any)?.solo_standouts || []);
      }

      if (starsResponse.success) {
        setStarsBalance((starsResponse.data as any)?.balance || 0);
      }

      if (friendsResponse.success) {
        setFriends((friendsResponse.data as any)?.friends || []);
      }
    } catch (error) {
      console.error("Error fetching standouts:", error);
      Alert.alert("Error", "Failed to load standouts. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStandouts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStandouts();
  };

  const presentPaywall = async (): Promise<boolean> => {
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
  };

  const handleSendDuoLike = async (
    profile1Id: number,
    profile2Id: number,
    starsCost: number
  ) => {
    // Always show friend selection menu first for duo likes
    setPendingDuoStandout({ profile1Id, profile2Id, starsCost });
    setShowFriendMenu(true);
  };

  const handleFriendSelected = async (friendId: number) => {
    if (!pendingDuoStandout) return;

    const { profile1Id, profile2Id, starsCost } = pendingDuoStandout;
    setShowFriendMenu(false);

    // Check if user has enough stars
    if (starsBalance < starsCost) {
      Alert.alert(
        "Insufficient Stars",
        `You need ${starsCost} star to send this like, but you only have ${starsBalance}. Would you like to purchase more stars?`,
        [
          { text: "Cancel", style: "cancel", onPress: () => setPendingDuoStandout(null) },
          {
            text: "Buy Stars",
            onPress: async () => {
              if (paywallVisible) return;
              setPaywallVisible(true);
              const paywallResult = await presentPaywall();
              setPaywallVisible(false);
              if (paywallResult) {
                // Refresh star balance after purchase
                await fetchStandouts();
                // Retry the operation
                await sendDuoStandoutLike(friendId, profile1Id, profile2Id, starsCost);
              }
              setPendingDuoStandout(null);
            },
          },
        ]
      );
      return;
    }

    await sendDuoStandoutLike(friendId, profile1Id, profile2Id, starsCost);
    setPendingDuoStandout(null);
  };

  const sendDuoStandoutLike = async (friendId: number, profile1Id: number, profile2Id: number, starsCost: number) => {
    const likeKey = `duo-${profile1Id}-${profile2Id}`;
    setSendingLike(likeKey);

    try {
      // Use websocket to send the standout like
      sendMessage({
        type: "profile",
        data: {
          decision: "like",
          target_profile: profile1Id, // For duo, we target profile1 of the duo
          is_duo: true,
          friend_profile: friendId,
          is_standout: true,
          stars_cost: starsCost,
        },
      });

      // Update local state optimistically
      setStarsBalance((prev) => prev - starsCost);
      setShowDuoStarAnimation(true);
      // Remove the duo from the list since they can't send another like
      setDuoStandouts((prev) =>
        prev.filter(
          (duo) =>
            !(
              duo.profile1_id === profile1Id && duo.profile2_id === profile2Id
            )
        )
      );
    } catch (error) {
      console.error("Error sending duo like:", error);
      Alert.alert("Error", "Failed to send duo like. Please try again.");
    } finally {
      setSendingLike(null);
    }
  };

  const handleSendSoloLike = async (profileId: number, starsCost: number) => {
    if (starsBalance < starsCost) {
      Alert.alert(
        "Insufficient Stars",
        `You need ${starsCost} star to send this like, but you only have ${starsBalance}. Would you like to purchase more stars?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Buy Stars",
            onPress: async () => {
              if (paywallVisible) return;
              setPaywallVisible(true);
              const paywallResult = await presentPaywall();
              setPaywallVisible(false);
              if (paywallResult) {
                // Refresh star balance after purchase
                await fetchStandouts();
                // Retry the operation
                await sendSoloStandoutLike(profileId, starsCost);
              }
            },
          },
        ]
      );
      return;
    }

    await sendSoloStandoutLike(profileId, starsCost);
  };

  const sendSoloStandoutLike = async (profileId: number, starsCost: number) => {
    const likeKey = `solo-${profileId}`;
    setSendingLike(likeKey);

    try {
      // Use websocket to send the standout like
      sendMessage({
        type: "profile",
        data: {
          decision: "like",
          target_profile: profileId,
          is_duo: false,
          is_standout: true,
          stars_cost: starsCost,
        },
      });

      // Update local state optimistically
      setStarsBalance((prev) => prev - starsCost);
      setShowSoloStarAnimation(true);
      // Remove the profile from the list since they can't send another like
      setSoloStandouts((prev) =>
        prev.filter((solo) => solo.profile_id !== profileId)
      );
    } catch (error) {
      console.error("Error sending solo standout like:", error);
      Alert.alert("Error", "Failed to send solo standout like. Please try again.");
    } finally {
      setSendingLike(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={mainPurple} />
        <Text style={styles.loadingText}>Loading standouts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.subtitle}>
          Send priority likes to standout profiles and appear at the top of
          their likes!
        </Text>

        {/* Duo Standouts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎭 Duo Standouts</Text>
          <Text style={styles.sectionSubtitle}>
            Friend pairs with the most matches together
          </Text>

          {duoStandouts.length > 0 ? (
            duoStandouts.map((duo) => (
              <DuoStandoutCard
                key={`${duo.profile1_id}-${duo.profile2_id}`}
                profile1={duo.profile1}
                profile2={duo.profile2}
                matchCount={duo.match_count}
                onSendLike={handleSendDuoLike}
                isLoading={
                  sendingLike === `duo-${duo.profile1_id}-${duo.profile2_id}`
                }
                starsBalance={starsBalance}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No duo standouts available right now
              </Text>
            </View>
          )}
        </View>

        {/* Solo Standouts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⭐ Solo Standouts</Text>
          <Text style={styles.sectionSubtitle}>
            Most popular individual profiles
          </Text>

          {soloStandouts.length > 0 ? (
            soloStandouts.map((solo) => (
              <SoloStandoutCard
                key={solo.profile_id}
                profile={solo.profile}
                popularityScore={solo.popularity_score}
                onSendLike={handleSendSoloLike}
                isLoading={sendingLike === `solo-${solo.profile_id}`}
                starsBalance={starsBalance}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No solo standouts available right now
              </Text>
            </View>
          )}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How Standouts Work</Text>
          <Text style={styles.infoText}>
            • All standout likes cost 1 star{"\n"}• Your like appears at the top of their likes{"\n"}• Standouts
            refresh weekly with new nearby profiles
          </Text>
        </View>
      </ScrollView>

      {/* Friend Selection Menu */}
      <SelectFriendMenu
        visible={showFriendMenu}
        friends={friends}
        currentUserId={userId || 0}
        onSelectFriend={handleFriendSelected}
        onClose={() => {
          setShowFriendMenu(false);
          setPendingDuoStandout(null);
        }}
      />

      {/* Star Animations */}
      <SoloStarAnimation
        visible={showSoloStarAnimation}
        onAnimationComplete={() => {
          setShowSoloStarAnimation(false);
          Alert.alert(
            "Success",
            "Solo standout like sent! You'll appear at the top of their likes."
          );
        }}
      />

      <DuoStarAnimation
        visible={showDuoStarAnimation}
        onAnimationComplete={() => {
          setShowDuoStarAnimation(false);
          Alert.alert(
            "Success",
            "Duo standout like sent! You'll appear at the top of their likes."
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: mainBackgroundColor,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "white",
    marginTop: 10,
    fontSize: 16,
  },
  scrollContent: {
    paddingBottom: 20,
    paddingTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "white",
    paddingHorizontal: 20,
    paddingBottom: 20,
    opacity: 0.8,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
    paddingHorizontal: 20,
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "white",
    paddingHorizontal: 20,
    marginBottom: 15,
    opacity: 0.7,
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "white",
    fontSize: 16,
    opacity: 0.6,
    textAlign: "center",
  },
  infoSection: {
    backgroundColor: secondaryBackgroundColor,
    margin: 20,
    padding: 20,
    borderRadius: 12,
    marginBottom: 40,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: "white",
    lineHeight: 20,
    opacity: 0.8,
  },
});
