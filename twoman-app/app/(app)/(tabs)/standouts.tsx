import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import Purchases from "react-native-purchases";
import { FontAwesome } from "@expo/vector-icons";
import DuoStandoutCard from "../../../components/DuoStandoutCard";
import SoloStandoutCard from "../../../components/SoloStandoutCard";
import SelectFriendMenu from "../../../components/SelectFriendMenu";
import {
  SoloStarAnimation,
  DuoStarAnimation,
} from "../../../components/StarAnimations";
import apiFetch from "../../../utils/fetch";
import {
  mainBackgroundColor,
  secondaryBackgroundColor,
  mainPurple,
} from "../../../constants/globalStyles";
import { Profile, Friendship } from "../../../types/api";
import { useSession } from "../../../stores/auth";
import useWebSocket from "../../../hooks/useWebsocket";
import {
  useStarBalance,
  useStarBalanceLoading,
  useFetchStarBalance,
  useRefreshStarBalance,
  useDeductStars,
} from "../../../stores/subscription";
import { AppState } from "react-native";

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
  // Use centralized star balance from store
  const starsBalance = useStarBalance();
  const starBalanceLoading = useStarBalanceLoading();
  const fetchStarBalance = useFetchStarBalance();
  const refreshStarBalance = useRefreshStarBalance();
  const deductStars = useDeductStars();
  const [loading, setLoading] = useState(true);

  const [sendingLike, setSendingLike] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [showFriendMenu, setShowFriendMenu] = useState(false);
  const [pendingDuoStandout, setPendingDuoStandout] = useState<{
    profile1Id: number;
    profile2Id: number;
    starsCost: number;
  } | null>(null);
  const [showSoloStarAnimation, setShowSoloStarAnimation] = useState(false);
  const [showDuoStarAnimation, setShowDuoStarAnimation] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const userId = useSession((state) => state.session?.user_id);
  const { sendMessage } = useWebSocket();
  // lastRefreshTime removed - refresh logic now handled globally in (app)/_layout.tsx

  const fetchStandouts = async () => {
    try {
      const [duoResponse, soloResponse, friendsResponse] = await Promise.all([
        apiFetch("/standouts/duo"),
        apiFetch("/standouts/solo"),
        apiFetch("/friends"),
      ]);

      if (duoResponse.success) {
        setDuoStandouts((duoResponse.data as any)?.duo_standouts || []);
      }

      if (soloResponse.success) {
        setSoloStandouts((soloResponse.data as any)?.solo_standouts || []);
      }

      if (friendsResponse.success) {
        setFriends((friendsResponse.data as any)?.friends || []);
      }

      // Fetch star balance from store
      await fetchStarBalance();
    } catch (error) {
      console.error("Error fetching standouts:", error);
      Alert.alert("Error", "Failed to load standouts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStandouts();
  }, []);

  // Star balance refresh is now handled globally in (app)/_layout.tsx

  const presentPaywall = async (): Promise<boolean> => {
    console.log("Starting presentPaywall function for standouts");
    try {
      // Get offerings to present "2 Man Pro" offering specifically
      const offerings = await Purchases.getOfferings();
      const proOffering = offerings.all["2 Man Pro"] || offerings.current;

      console.log(
        "Presenting Pro paywall with offering:",
        proOffering?.identifier || "current",
      );
      const paywallResult: PAYWALL_RESULT = proOffering
        ? await RevenueCatUI.presentPaywall({ offering: proOffering })
        : await RevenueCatUI.presentPaywall();
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

  const presentStarPaywall = async (): Promise<boolean> => {
    // Present the star packages paywall (either "Stars" or "5 Stars" offering)
    try {
      console.log("Getting offerings for star paywall...");
      const offerings = await Purchases.getOfferings();

      // Try to find the "Stars" offering first, fallback to "5 Stars"
      const starOffering = offerings.all["Stars"] || offerings.all["5 Stars"];

      console.log("All available offerings:", Object.keys(offerings.all));
      console.log("Current offering:", offerings.current?.identifier);

      if (starOffering) {
        console.log("✅ Found star offering:", starOffering.identifier);
        console.log(
          "📦 Available packages:",
          starOffering.availablePackages.map(
            (pkg) => `${pkg.identifier} (${pkg.product.identifier})`,
          ),
        );
        console.log(
          "💰 Package prices:",
          starOffering.availablePackages.map(
            (pkg) => `${pkg.identifier}: ${pkg.product.priceString}`,
          ),
        );

        // TEMPORARY: Use direct purchase to bypass sandbox auth issues
        const useDirectPurchase = false; // Set to false to use paywall UI instead

        // TODO: Set back to false once sandbox account is fixed

        if (useDirectPurchase) {
          console.log(
            "Using direct purchase method to avoid paywall configuration issues...",
          );
          try {
            // Find the first available star package
            const starPackage = starOffering.availablePackages[0];

            if (starPackage) {
              console.log(
                "Attempting direct purchase of:",
                starPackage.product.identifier,
              );
              const purchaseResult =
                await Purchases.purchasePackage(starPackage);

              if (purchaseResult.customerInfo.entitlements.active) {
                await refreshStarBalance();
                return true;
              }
            }
            // If no star package found or purchase failed, fallback to regular paywall
            return await presentPaywall();
          } catch (directPurchaseError) {
            console.error("Direct purchase failed:", directPurchaseError);
            return await presentPaywall();
          }
        } else {
          // Use normal paywall (once configuration is fixed)
          try {
            const paywallResult: PAYWALL_RESULT =
              await RevenueCatUI.presentPaywall({
                offering: starOffering,
              });

            switch (paywallResult) {
              case PAYWALL_RESULT.PURCHASED:
              case PAYWALL_RESULT.RESTORED:
                // Refresh star balance immediately after purchase
                await refreshStarBalance();
                return true;
              default:
                return false;
            }
          } catch (paywallError) {
            console.error("Star paywall presentation failed:", paywallError);
            console.log(
              "Error details:",
              JSON.stringify(paywallError, null, 2),
            );
            console.log(
              "Paywall error type:",
              paywallError instanceof Error
                ? paywallError.message
                : String(paywallError),
            );

            // If it's a localization error, try to present without localization validation
            const errorMessage =
              paywallError instanceof Error
                ? paywallError.message
                : String(paywallError);
            if (
              errorMessage.includes("localization") ||
              errorMessage.includes("NtbQt2381G")
            ) {
              console.log(
                "Detected localization error, trying alternative approach...",
              );
              try {
                // Try presenting with displayCloseButton: false to avoid problematic components
                const altPaywallResult: PAYWALL_RESULT =
                  await RevenueCatUI.presentPaywall({
                    offering: starOffering,
                    displayCloseButton: false,
                  });

                switch (altPaywallResult) {
                  case PAYWALL_RESULT.PURCHASED:
                  case PAYWALL_RESULT.RESTORED:
                    await refreshStarBalance();
                    return true;
                  default:
                    break;
                }
              } catch (altError) {
                console.error("Alternative paywall also failed:", altError);
              }
            }

            console.log("Falling back to direct product purchase...");

            // Try direct product purchase as fallback
            try {
              // Find the first star product to purchase
              const starPackage =
                starOffering.availablePackages.find((pkg) =>
                  pkg.product.identifier.includes("star"),
                ) || starOffering.availablePackages[0];

              if (starPackage) {
                console.log(
                  "Attempting direct purchase of:",
                  starPackage.product.identifier,
                );
                const purchaseResult =
                  await Purchases.purchasePackage(starPackage);

                if (purchaseResult.customerInfo.entitlements.active) {
                  await refreshStarBalance();
                  return true;
                }
              }
            } catch (directPurchaseError) {
              console.error(
                "Direct purchase also failed:",
                directPurchaseError,
              );
            }

            console.log(
              "All star purchase methods failed, presenting regular paywall...",
            );
            return await presentPaywall();
          }
        }
      } else {
        console.log("❌ No star offering found!");
        console.log("Available offerings:", Object.keys(offerings.all));
        console.log("Looking for: 'Stars' or '5 Stars'");
        console.log("Falling back to default paywall...");
        return await presentPaywall();
      }
    } catch (error) {
      console.error("Error getting offerings for star paywall:", error);
      return await presentPaywall();
    }
  };

  const handleSendDuoLike = async (
    profile1Id: number,
    profile2Id: number,
    starsCost: number,
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
      console.log(
        `⚠️ Insufficient stars: need ${starsCost}, have ${starsBalance}`,
      );
      Alert.alert(
        "Insufficient Stars",
        `You need ${starsCost} star to send this like, but you only have ${starsBalance}. Would you like to purchase more stars?`,
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => {
              console.log("❌ User cancelled star purchase");
              setPendingDuoStandout(null);
            },
          },
          {
            text: "Buy Stars",
            onPress: async () => {
              console.log("💳 User tapped Buy Stars button");
              if (paywallVisible) {
                console.log("⚠️ Paywall already visible, skipping");
                return;
              }
              setPaywallVisible(true);
              console.log("🚀 Presenting star paywall...");
              const paywallResult = await presentStarPaywall();
              setPaywallVisible(false);
              if (paywallResult) {
                // Refresh star balance after purchase
                await fetchStandouts();
                // Retry the operation
                await sendDuoStandoutLike(
                  friendId,
                  profile1Id,
                  profile2Id,
                  starsCost,
                );
              }
              setPendingDuoStandout(null);
            },
          },
        ],
      );
      return;
    }

    await sendDuoStandoutLike(friendId, profile1Id, profile2Id, starsCost);
    setPendingDuoStandout(null);
  };

  const sendDuoStandoutLike = async (
    friendId: number,
    profile1Id: number,
    profile2Id: number,
    starsCost: number,
  ) => {
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
      deductStars(starsCost);
      setShowDuoStarAnimation(true);
      // Remove the duo from the list since they can't send another like
      setDuoStandouts((prev) =>
        prev.filter(
          (duo) =>
            !(duo.profile1_id === profile1Id && duo.profile2_id === profile2Id),
        ),
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
      console.log(
        `⚠️ Solo - Insufficient stars: need ${starsCost}, have ${starsBalance}`,
      );
      Alert.alert(
        "Insufficient Stars",
        `You need ${starsCost} star to send this like, but you only have ${starsBalance}. Would you like to purchase more stars?`,
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => console.log("❌ User cancelled solo star purchase"),
          },
          {
            text: "Buy Stars",
            onPress: async () => {
              console.log("💳 User tapped Buy Stars (solo)");
              if (paywallVisible) {
                console.log("⚠️ Paywall already visible, skipping");
                return;
              }
              setPaywallVisible(true);
              console.log("🚀 Presenting star paywall (solo)...");
              const paywallResult = await presentStarPaywall();
              setPaywallVisible(false);
              if (paywallResult) {
                // Refresh star balance after purchase
                await fetchStandouts();
                // Retry the operation
                await sendSoloStandoutLike(profileId, starsCost);
              }
            },
          },
        ],
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
      deductStars(starsCost);
      setShowSoloStarAnimation(true);
      // Remove the profile from the list since they can't send another like
      setSoloStandouts((prev) =>
        prev.filter((solo) => solo.profile_id !== profileId),
      );
    } catch (error) {
      console.error("Error sending solo standout like:", error);
      Alert.alert(
        "Error",
        "Failed to send solo standout like. Please try again.",
      );
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
            • All standout likes cost 1 star{"\n"}• Your like appears at the top
            of their likes{"\n"}• Standouts refresh weekly with new nearby
            profiles
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
            "Solo standout like sent! You'll appear at the top of their likes.",
          );
        }}
      />

      <DuoStarAnimation
        visible={showDuoStarAnimation}
        onAnimationComplete={() => {
          setShowDuoStarAnimation(false);
          Alert.alert(
            "Success",
            "Duo standout like sent! You'll appear at the top of their likes.",
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
