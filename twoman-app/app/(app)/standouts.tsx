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
import { FontAwesome } from "@expo/vector-icons";
import DuoStandoutCard from "../../components/DuoStandoutCard";
import SoloStandoutCard from "../../components/SoloStandoutCard";
import apiFetch from "../../utils/fetch";
import Purchases from "react-native-purchases";
import {
  mainBackgroundColor,
  secondaryBackgroundColor,
  mainPurple,
} from "../../constants/globalStyles";
import { Profile } from "../../types/api";

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

  const fetchStandouts = async () => {
    try {
      const [duoResponse, soloResponse] = await Promise.all([
        apiFetch("/standouts/duo"),
        apiFetch("/standouts/solo"),
      ]);

      if (duoResponse.success) {
        setDuoStandouts((duoResponse.data as any)?.duo_standouts || []);
      }

      if (soloResponse.success) {
        setSoloStandouts((soloResponse.data as any)?.solo_standouts || []);
      }

      // Get stars from RevenueCat instead of API
      try {
        const virtualCurrencies = await Purchases.getVirtualCurrencies();
        const starsBalance = virtualCurrencies.all.STR?.balance || 0;
        setStarsBalance(starsBalance);
      } catch (error) {
        console.error("Error fetching stars from RevenueCat:", error);
        setStarsBalance(0);
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

  const handleSendDuoLike = async (
    profile1Id: number,
    profile2Id: number,
    starsCost: number,
  ) => {
    if (starsBalance < starsCost) {
      Alert.alert(
        "Insufficient Stars",
        "You don't have enough stars to send this like.",
      );
      return;
    }

    const likeKey = `duo-${profile1Id}-${profile2Id}`;
    setSendingLike(likeKey);

    try {
      const response = await apiFetch("/standouts/duo/like", {
        method: "POST",
        body: {
          target_profile1_id: profile1Id,
          target_profile2_id: profile2Id,
          stars_cost: starsCost,
        },
      });

      if (response.success) {
        setStarsBalance((prev) => prev - starsCost);
        Alert.alert(
          "Success",
          "Duo standout like sent! You'll appear at the top of their likes.",
        );
        // Remove the duo from the list since they can't send another like
        setDuoStandouts((prev) =>
          prev.filter(
            (duo) =>
              !(
                duo.profile1_id === profile1Id && duo.profile2_id === profile2Id
              ),
          ),
        );
      } else {
        Alert.alert("Error", response.error || "Failed to send duo like.");
      }
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
        "You don't have enough stars to send this like.",
      );
      return;
    }

    const likeKey = `solo-${profileId}`;
    setSendingLike(likeKey);

    try {
      const response = await apiFetch("/standouts/solo/like", {
        method: "POST",
        body: {
          target_profile_id: profileId,
          stars_cost: starsCost,
        },
      });

      if (response.success) {
        setStarsBalance((prev) => prev - starsCost);
        Alert.alert(
          "Success",
          "Solo standout like sent! You'll appear at the top of their likes.",
        );
        // Remove the profile from the list since they can't send another like
        setSoloStandouts((prev) =>
          prev.filter((solo) => solo.profile_id !== profileId),
        );
      } else {
        Alert.alert("Error", response.error || "Failed to send solo like.");
      }
    } catch (error) {
      console.error("Error sending solo like:", error);
      Alert.alert("Error", "Failed to send solo like. Please try again.");
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
      >
        {/* Header with star balance */}
        <View style={styles.header}>
          <Text style={styles.title}>Standouts</Text>
          <View style={styles.starsContainer}>
            <FontAwesome name="star" size={20} color={mainPurple} />
            <Text style={styles.starsText}>{starsBalance}</Text>
          </View>
        </View>

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
            • Duo standouts cost 3-5 stars{"\n"}• Solo standouts cost 1-3 stars
            {"\n"}• Your like appears at the top of their likes{"\n"}• Standouts
            refresh daily with new profiles
          </Text>
        </View>
      </ScrollView>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
  },
  starsContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: secondaryBackgroundColor,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  starsText: {
    color: mainPurple,
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 5,
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
