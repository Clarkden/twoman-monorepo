import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  accentGray,
  mainBackgroundColor,
  secondaryBackgroundColor,
} from "@/constants/globalStyles";
import { useLocalSearchParams, useRouter } from "expo-router";
import apiFetch from "@/utils/fetch";
import { Match, Profile } from "@/types/api";
import { useEffect, useState } from "react";
import LoadingIndicator from "@/components/LoadingIndicator";
import ProfileCard from "@/components/ProfileCard";
import { FontAwesome } from "@expo/vector-icons";
import { AlertTriangle } from "lucide-react-native";
import { useSession } from "@/stores/auth";
import useWebSocket from "@/hooks/useWebsocket";

export default function Settings() {
  const { matchId } = useLocalSearchParams();
  const [match, setMatch] = useState<Match | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const router = useRouter();
  const userId = useSession((state) => state.session?.user_id);
  const { sendMessage } = useWebSocket();

  const fetchMatch = async () => {
    try {
      const response = await apiFetch<Match>(`/match/${matchId}`);

      if (!response.success) {
        console.log(response.error);
        return;
      }

      setMatch(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  const handleBlock = () => {
    setSelectedProfile(null);
    router.replace("/matches");
  };

  const handleRemoveFriend = async (profile: Profile) => {
    try {
      const response = await apiFetch(`/friendship/${profile.user_id}/remove`, {
        method: "POST",
      });

      if (!response.success) {
        console.log(response);
        return;
      }

      setSelectedProfile(null);
    } catch (error) {
      console.log(error);
    }
  };

  const handleRemoveMatch = async () => {
    if (!match) return;

    try {
      if (match.is_friend) {
        const friendsProfile =
          match.profile1_id === userId ? match.profile3 : match.profile1;
        await handleRemoveFriend(friendsProfile);
      } else {
        sendMessage({
          type: "match",
          data: {
            match_id: match.ID,
            action: "unmatch",
          },
        });
      }

      router.replace("/chat");
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchMatch();
  }, []);

  if (!match || !userId) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: mainBackgroundColor,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <LoadingIndicator size={48} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Modal
        visible={selectedProfile !== null}
        onRequestClose={() => setSelectedProfile(null)}
        animationType={"slide"}
        presentationStyle={"pageSheet"}
      >
        <View style={{ flex: 1, backgroundColor: mainBackgroundColor }}>
          <ScrollView>
            <View
              style={{
                flex: 1,
                backgroundColor: mainBackgroundColor,
                padding: 20,
                gap: 20,
              }}
            >
              <View
                style={{
                  marginVertical: 20,
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
                      setSelectedProfile(null);
                    }}
                    style={{
                      flex: 1,
                      position: "absolute",
                      left: 0,
                      zIndex: 1,
                    }}
                  >
                    <FontAwesome name="angle-down" size={24} color="white" />
                  </Pressable>
                </View>
              </View>
              {selectedProfile ? (
                <ProfileCard profile={selectedProfile} onBlock={handleBlock} />
              ) : null}
            </View>
          </ScrollView>
        </View>
      </Modal>
      <ScrollView>
        <View style={styles.content}>
          <View
            style={{
              gap: 10,
            }}
          >
            <Text
              style={{
                color: accentGray,
              }}
            >
              Members
            </Text>
            {match.profile1_id !== userId ? (
              <TouchableOpacity
                style={styles.profileButton}
                onPress={() => setSelectedProfile(match.profile1)}
              >
                <Text style={styles.profileButtonText}>
                  {match.profile1.name}
                </Text>
              </TouchableOpacity>
            ) : null}
            {match.profile2 && match.profile2_id !== userId ? (
              <TouchableOpacity
                style={styles.profileButton}
                onPress={() => setSelectedProfile(match.profile2)}
              >
                <Text style={styles.profileButtonText}>
                  {match.profile2.name}
                </Text>
              </TouchableOpacity>
            ) : null}
            {match.profile3_id !== userId ? (
              <TouchableOpacity
                style={styles.profileButton}
                onPress={() => setSelectedProfile(match.profile3)}
              >
                <Text style={styles.profileButtonText}>
                  {match.profile3.name}
                </Text>
              </TouchableOpacity>
            ) : null}
            {match.profile4 && match.profile4_id !== userId ? (
              <TouchableOpacity
                style={styles.profileButton}
                onPress={() => setSelectedProfile(match.profile4)}
              >
                <Text style={styles.profileButtonText}>
                  {match.profile4.name}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <View
            style={{
              marginTop: 20,
            }}
          >
            <Text
              style={{
                color: accentGray,
                marginBottom: 10,
              }}
            >
              Options
            </Text>
            <TouchableOpacity
              style={styles.unMatchButton}
              onPress={handleRemoveMatch}
            >
              <AlertTriangle size={20} color="#ff5555" />
              <Text style={styles.unMatchButtonText}>
                {match.is_friend ? "Unfriend" : "Unmatch"}
              </Text>
            </TouchableOpacity>
          </View>
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
  content: {
    padding: 20,
    gap: 10,
  },
  profileButton: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: secondaryBackgroundColor,
  },
  profileButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  unMatchButton: {
    borderRadius: 10,
    backgroundColor: secondaryBackgroundColor,
    padding: 15,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  unMatchButtonText: {
    color: "#ff5555",
    fontSize: 16,
    fontWeight: "500",
  },
});
