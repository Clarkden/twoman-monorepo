import { useRouter } from "expo-router";
import {
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AlertTriangle,
  Bell,
  ContactRound,
  GlobeLock,
  LogOut,
  ReceiptText,
  Settings2,
  Star,
  Trash2,
  UserRoundMinus,
} from "lucide-react-native";
import {
  accentGray,
  goldYellow,
  mainBackgroundColor,
  mainPurple,
  secondaryBackgroundColor,
} from "@/constants/globalStyles";
import { StatusBar } from "expo-status-bar";
import apiFetch from "@/utils/fetch";
import { useEffect, useState } from "react";
import ReportProblem from "@/components/ReportProblem";
import Purchases from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import { LinearGradient } from "expo-linear-gradient";
import { useSession } from "@/stores/auth";
import {
  useSubscriptionStore,
  useIsPro,
  useIsActive,
  useExpiresAt,
  useSource,
} from "@/stores/subscription";
import {
  getSubscriptionStatus,
  type SubscriptionInfo,
} from "@/utils/subscription";

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

export default function SettingsScreen() {
  const router = useRouter();
  const { setSession } = useSession();
  const [reportBugModal, setReportBugModal] = useState(false);

  // Use subscription store
  const { fetchSubscriptionStatus, refreshSubscriptionStatus } =
    useSubscriptionStore();
  const isPro = useIsPro();
  const isActive = useIsActive();
  const expiresAt = useExpiresAt();
  const source = useSource();

  const handleDeleteUser = async () => {
    try {
      const response = await apiFetch("/user", {
        method: "DELETE",
      });

      if (!response.success) {
        console.log(response.error);
        return;
      }

      setSession(null);
    } catch (error) {
      console.log(error);
    }
  };

  const presentPurchaseModal = async () => {
    const purchased = await presentPaywall();
    if (purchased) {
      // Refresh subscription status after purchase
      await refreshSubscriptionStatus();
    }
  };

  const handleSignOut = async () => {
    await setSession(null);
  };

  const formatTimeRemaining = (expirationDate: Date): string => {
    const now = new Date();
    const timeRemaining = expirationDate.getTime() - now.getTime();

    if (timeRemaining <= 0) {
      return "Expired";
    }

    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    if (days > 0) {
      return `${days} day${days !== 1 ? "s" : ""} remaining`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? "s" : ""} remaining`;
    } else {
      const minutes = Math.floor(
        (timeRemaining % (1000 * 60 * 60)) / (1000 * 60)
      );
      return `${minutes} minute${minutes !== 1 ? "s" : ""} remaining`;
    }
  };

  useEffect(() => {
    // Fetch subscription status on mount
    fetchSubscriptionStatus();

    // Listen for RevenueCat updates and refresh our store
    const listener = Purchases.addCustomerInfoUpdateListener(() => {
      refreshSubscriptionStatus();
    });

    return () => {
      // Cleanup listener if needed
    };
  }, [fetchSubscriptionStatus, refreshSubscriptionStatus]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: mainBackgroundColor,
      }}
    >
      <StatusBar style="light" />
      <Modal
        visible={reportBugModal}
        animationType="slide"
        onRequestClose={() => setReportBugModal(false)}
        presentationStyle={"pageSheet"}
      >
        <ReportProblem onClose={() => setReportBugModal(false)} />
      </Modal>

      <ScrollView>
        <View style={styles.container}>
          {isPro ? (
            <View
              style={{
                height: 100,
                borderRadius: 10,
                padding: 20,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <LinearGradient
                colors={[goldYellow, "#e6c355"]}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  height: 99,
                  borderRadius: 12,
                }}
              />
              <View>
                <Text
                  style={[
                    styles.settingsItemText,
                    {
                      fontSize: 20,
                      fontWeight: "bold",
                      marginBottom: 5,
                      color: "#1a1a1a", // Much darker text
                    },
                  ]}
                >
                  2 Man Pro Active
                </Text>
                <Text
                  style={[
                    styles.settingsItemText,
                    {
                      fontSize: 16,
                      fontWeight: "500",
                      color: "#4a4a4a", // Darker subtitle text
                    },
                  ]}
                >
                  {expiresAt ? formatTimeRemaining(expiresAt) : "Active"}
                  {source === "friend_reward" && " • Referral Reward"}
                  {source === "referral_reward" && " • Referral Reward"}
                </Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={{
                height: 100,
                borderRadius: 10,
                padding: 20,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
              onPress={presentPurchaseModal}
            >
              <LinearGradient
                colors={[mainPurple, "#7a14ff"]}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  height: 99,
                  borderRadius: 12,
                }}
              />
              <View>
                <Text
                  style={[
                    styles.settingsItemText,
                    {
                      fontSize: 20,
                      fontWeight: "bold",
                      marginBottom: 5,
                      color: "white",
                    },
                  ]}
                >
                  2 Man Pro
                </Text>
                <Text
                  style={[
                    styles.settingsItemText,
                    {
                      fontSize: 16,
                      fontWeight: "500",
                      color: "lightgray",
                    },
                  ]}
                >
                  Get Unlimited Likes with Pro
                </Text>
              </View>
              <Image
                source={require("../../../assets/images/logo-white.png")}
                style={{ width: 64, height: 64 }}
              />
            </TouchableOpacity>
          )}
          <View style={styles.settingsItemContainer}>
            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => {
                router.push("/profile");
              }}
            >
              <Star size={18} color="white" />
              <Text style={styles.settingsItemText}>Profile</Text>
            </TouchableOpacity>
            <View style={styles.separator} />
            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => {
                router.push("/preferences");
              }}
            >
              <Settings2 size={18} color="white" />
              <Text style={styles.settingsItemText}>Preferences</Text>
            </TouchableOpacity>
            <View style={styles.separator} />
            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => {
                router.push("/friends");
              }}
            >
              <ContactRound size={18} color="white" />
              <Text style={styles.settingsItemText}>Friends</Text>
            </TouchableOpacity>
            <View style={styles.separator} />

            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => {
                router.push("/blocks");
              }}
            >
              <UserRoundMinus size={18} color="white" />
              <Text style={styles.settingsItemText}>Blocked</Text>
            </TouchableOpacity>
            <View style={styles.separator} />

            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => {
                router.push("/notifications");
              }}
            >
              <Bell size={18} color="white" />
              <Text style={styles.settingsItemText}>Notifications</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.settingsItemContainer}>
            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => {
                Linking.openURL("https://twoman.dating/privacy");
              }}
            >
              <GlobeLock size={18} color="white" />
              <Text style={styles.settingsItemText}>Privacy Policy</Text>
            </TouchableOpacity>
            <View style={styles.separator} />

            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => {
                Linking.openURL("https://twoman.dating/terms");
              }}
            >
              <ReceiptText size={18} color="white" />
              <Text style={styles.settingsItemText}>Terms & Conditions</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.settingsItemContainer}>
            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => setReportBugModal(true)}
            >
              <AlertTriangle size={18} color="white" />
              <Text style={styles.settingsItemText}>Report a Problem</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.settingsItemContainer}>
            <TouchableOpacity
              style={styles.settingsItem}
              onPress={handleSignOut}
            >
              <LogOut size={18} color="white" />
              <Text style={styles.settingsItemText}>Logout</Text>
            </TouchableOpacity>
          </View>
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: mainPurple,
                fontSize: 24,
                fontWeight: "bold",
              }}
            >
              2 Man
            </Text>
            <Text
              style={{
                color: accentGray,
                fontSize: 20,
                fontWeight: "500",
                marginTop: 5,
              }}
            >
              Version {process.env.EXPO_PUBLIC_CLIENT_VERSION}
            </Text>
          </View>
          <View>
            <View style={styles.settingsItemContainer}>
              <TouchableOpacity
                style={styles.settingsItem}
                onPress={() => {
                  Alert.alert(
                    "Delete Account",
                    "Are you sure you want to delete your account?",
                    [
                      {
                        text: "Cancel",
                        style: "cancel",
                      },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: handleDeleteUser,
                      },
                    ]
                  );
                }}
              >
                <Trash2 size={18} color="white" />
                <Text style={styles.settingsItemText}>Delete Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 15,
    paddingVertical: 30,
    flexDirection: "column",
    gap: 30,
  },
  separator: {
    height: 1,
    backgroundColor: "#303030",
  },
  settingsItemContainer: {
    borderRadius: 10,
    backgroundColor: secondaryBackgroundColor,
    paddingHorizontal: 15,
    flexDirection: "column",
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 15,
  },
  settingsItemText: {
    color: "white",
  },
});
