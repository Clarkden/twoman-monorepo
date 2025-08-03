import { Match, Message, Profile } from "@/types/api";
import { GetMatches } from "@/utils/match";
import { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { formatDistanceStrict } from "date-fns";
import { Link, useGlobalSearchParams, useSegments } from "expo-router";
import { messageHandler } from "@/utils/websocket";
import {
  accentGray,
  borderColor,
  mainBackgroundColor,
  mainPurple,
} from "@/constants/globalStyles";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { useIsFocused } from "@react-navigation/native";
import { useSession } from "@/stores/auth";
import { useLastSeenStore } from "@/stores/lastSeen";

interface LastSeenRecord {
  [matchId: number]: string;
}

function getScreenTitle(
  profile1_name: string,
  profile1_user_id: number,
  profile2_name: string,
  profile2_user_id: number,
  profile3_name: string,
  profile3_user_id: number,
  profile4_name: string,
  profile4_user_id: number,
  is_duo: number,
  userId: number
): string {
  if (is_duo === 1) {
    const profiles = [
      { id: profile1_user_id, name: profile1_name },
      { id: profile2_user_id, name: profile2_name },
      { id: profile3_user_id, name: profile3_name },
      { id: profile4_user_id, name: profile4_name },
    ];

    return profiles
      .filter((profile) => profile.id !== userId && profile.id !== 0)
      .map((profile) => profile.name)
      .filter(Boolean)
      .join(", ");
  } else {
    if (profile1_user_id === userId) {
      return profile3_name;
    } else if (profile3_user_id === userId) {
      return profile1_name;
    } else {
      return "Unknown";
    }
  }
}

export default function Chat() {
  const { lastSeenRecords, setLastSeen } = useLastSeenStore();

  const userId = useSession((state) => state.session?.user_id);
  const [matches, setMatches] = useState<Match[]>([]);
  const segments = useSegments();
  const globalSearchParams = useGlobalSearchParams();

  const handleGetMatches = async () => {
    const matchRecords = await GetMatches();

    const updatedMatches = matchRecords.map((m) => ({
      ...m,
      hasUnreadMessages:
        !lastSeenRecords[m.ID] ||
        new Date(m.last_message_at) > new Date(lastSeenRecords[m.ID]),
    }));

    setMatches(updatedMatches);
  };

  const handleOpenChat = async (matchId: number) => {
    setLastSeen(matchId, new Date().toISOString());

    setMatches((prevMatches) =>
      prevMatches.map((match) =>
        match.ID === matchId ? { ...match, hasUnreadMessages: false } : match
      )
    );
  };

  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused) return;

    handleGetMatches();
  }, [isFocused]);

  useEffect(() => {
    const handleMatchMessage = (data: Match) => {
      setMatches((prevMatches) => {
        const matchIndex = prevMatches.findIndex(
          (match) => match.ID === data.ID
        );

        if (matchIndex !== -1) {
          if (data.status === "pending") {
            return prevMatches;
          }

          if (data.status === "rejected") {
            return prevMatches.filter((match) => match.ID !== data.ID);
          }

          const updatedMatch = { ...prevMatches[matchIndex] };
          updatedMatch.last_message = data.last_message;
          updatedMatch.last_message_at = data.last_message_at;
          const newMatches = [...prevMatches];
          newMatches[matchIndex] = updatedMatch;

          newMatches.sort(
            (a, b) =>
              new Date(b.UpdatedAt).getTime() - new Date(a.UpdatedAt).getTime()
          );

          return newMatches;
        } else {
          if (data.status === "pending" || data.status === "rejected") {
            return prevMatches;
          }

          const newMatches = [...prevMatches, data];

          newMatches.sort(
            (a, b) =>
              new Date(b.UpdatedAt).getTime() - new Date(a.UpdatedAt).getTime()
          );

          return newMatches;
        }
      });
    };

    const handleChatMessage = (data: Message) => {
      setMatches((prevMatches) => {
        const matchIndex = prevMatches.findIndex(
          (match) => match.ID === data.match_id
        );

        if (matchIndex !== -1) {
          const updatedMatch = { ...prevMatches[matchIndex] };
          updatedMatch.last_message = data.message;
          updatedMatch.last_message_at = data.CreatedAt;
          updatedMatch.UpdatedAt = data.CreatedAt;
          const newMatches = [...prevMatches];
          newMatches[matchIndex] = updatedMatch;

          newMatches.sort(
            (a, b) =>
              new Date(b.UpdatedAt).getTime() - new Date(a.UpdatedAt).getTime()
          );

          return newMatches;
        }

        return prevMatches;
      });

      if (segments.includes("[matchId]")) {
        if (globalSearchParams.matchId) {
          const matchId = parseInt(globalSearchParams.matchId as string);

          setLastSeen(matchId, new Date().toISOString());
        }
      }
    };

    const handleMatchRemovedMessage = (data: Match) => {
      setMatches((prevMatches) =>
        prevMatches.filter((match) => match.ID !== data.ID)
      );
    };

    messageHandler.subscribe("match", handleMatchMessage);
    messageHandler.subscribe("chat", handleChatMessage);
    messageHandler.subscribe("match_removed", handleMatchRemovedMessage);

    return () => {
      messageHandler.unsubscribe("match", handleMatchMessage);
      messageHandler.unsubscribe("chat", handleChatMessage);
      messageHandler.unsubscribe("match_removed", handleMatchRemovedMessage);
    };
  }, [messageHandler, globalSearchParams]);

  const renderChatGroup = ({ item }: { item: Match }) => {
    return (
      <ChatGroup
        match={item}
        userId={userId!}
        onOpenChat={handleOpenChat}
        lastSeen={lastSeenRecords[item.ID]}
      />
    );
  };

  return (
    <>
      <StatusBar style="light" />
      <FlatList
        data={matches}
        renderItem={renderChatGroup}
        keyExtractor={(item) => item.ID.toString()}
        style={{ backgroundColor: mainBackgroundColor }}
        ListEmptyComponent={() => (
          <View
            style={{
              flex: 1,
              padding: 20,
            }}
          >
            <Text
              style={{ color: accentGray, fontSize: 16, fontWeight: "500" }}
            >
              No chats
            </Text>
          </View>
        )}
      />
    </>
  );
}

const getMatchProfiles = (match: Match, userId: number): Profile[] => {
  const profiles = [
    match.profile1,
    match.profile2,
    match.profile3,
    match.profile4,
  ];
  return profiles.filter(
    (profile) => profile && profile.user_id !== userId
  ) as Profile[];
};

const UnreadIndicator = ({
  hasUnreadMessages,
}: {
  hasUnreadMessages: boolean;
}) => (
  <View style={styles.unreadIndicatorContainer}>
    <View
      style={[
        styles.unreadIndicator,
        { backgroundColor: hasUnreadMessages ? mainPurple : "transparent" },
      ]}
    />
  </View>
);

function ChatGroup({
  match,
  userId,
  onOpenChat,
  lastSeen,
}: {
  match: Match;
  userId: number;
  onOpenChat: (matchId: number) => void;
  lastSeen?: string;
}) {
  const handlePress = () => {
    onOpenChat(match.ID);
  };

  const hasUnreadMessages =
    !lastSeen || new Date(match.last_message_at) > new Date(lastSeen);

  if (match.is_duo) {
    let matchProfiles: Profile[];
    matchProfiles = getMatchProfiles(match, userId);

    return (
      <Link
        href={{
          pathname: `/${match.ID}/`,
          params: {
            profile1_name: match.profile1.name,
            profile1_user_id: String(match.profile1.user_id),
            profile1_avatar: match.profile1.image1,
            profile2_name: match.profile2?.name || "",
            profile2_user_id: String(match.profile2?.user_id || ""),
            profile2_avatar: match.profile2?.image1 || "",
            profile3_name: match.profile3.name,
            profile3_user_id: String(match.profile3.user_id),
            profile3_avatar: match.profile3.image1,
            profile4_name: match.profile4?.name || "",
            profile4_user_id: String(match.profile4?.user_id || ""),
            profile4_avatar: match.profile4?.image1 || "",
            is_duo: String(1),
          },
        }}
        asChild
      >
        <TouchableOpacity onPress={handlePress} style={styles.chatGroupView}>
          <View
            style={{
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              marginRight: 10,
            }}
          >
            <UnreadIndicator hasUnreadMessages={hasUnreadMessages} />
          </View>
          <View
            style={{
              flexDirection: "column",
              gap: 10,
              flex: 1,
            }}
          >
            <Text
              style={{
                color: "white",
                fontWeight: "600",
                fontSize: 16,
              }}
              numberOfLines={1}
            >
              {getScreenTitle(
                match.profile1.name,
                match.profile1.user_id,
                match.profile2?.name || "",
                match.profile2?.user_id || 0,
                match.profile3.name,
                match.profile3.user_id,
                match.profile4?.name || "",
                match.profile4?.user_id || 0,
                1,
                userId
              )}
            </Text>
            <View style={styles.chatGroupProfilePictureDuo}>
              {matchProfiles.map((profile, index) => (
                <Image
                  key={index}
                  source={{ uri: profile.image1 }}
                  style={styles.chatGroupProfilePicture}
                />
              ))}
            </View>
            <View style={styles.chatGroupInfo}>
              <Text
                style={[
                  styles.chatGroupLastMessage,
                  {
                    color: "gray",
                  },
                ]}
                numberOfLines={1}
              >
                {match.last_message ||
                  (match.is_friend ? "Start the chat" : "New Match")}
              </Text>
              <Text style={styles.chatGroupTimestamp}>
                {formatDistanceStrict(new Date(match.UpdatedAt), new Date(), {
                  addSuffix: true,
                })}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Link>
    );
  } else {
    let matchProfile: Profile;

    if (match.profile1.user_id === userId) {
      matchProfile = match.profile3;
    } else {
      matchProfile = match.profile1;
    }

    return (
      <Link
        href={{
          pathname: `/${match.ID}/`,
          params: {
            profile1_name: match.profile1.name,
            profile1_user_id: String(match.profile1.user_id),
            profile1_avatar: match.profile1.image1,
            profile3_name: match.profile3.name,
            profile3_user_id: String(match.profile3.user_id),
            profile3_avatar: match.profile3.image1,
            is_duo: String(0),
          },
        }}
        asChild
      >
        <TouchableOpacity onPress={handlePress} style={styles.chatGroupView}>
          <View
            style={{
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              marginRight: 10,
            }}
          >
            <UnreadIndicator hasUnreadMessages={hasUnreadMessages} />
          </View>
          <View
            style={{
              flexDirection: "column",
              gap: 8,
              flex: 1,
            }}
          >
            <Text
              style={{
                color: "white",
                fontWeight: "600",
                fontSize: 16,
              }}
              numberOfLines={1}
            >
              {matchProfile.name}
            </Text>
            <Image
              source={{ uri: matchProfile.image1 }}
              style={styles.chatGroupProfilePicture}
            />
            <View style={{ flexDirection: "column", flex: 1 }}>
              <View style={styles.chatGroupInfo}>
                <Text
                  style={[
                    styles.chatGroupLastMessage,
                    {
                      color: "gray",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {match.last_message ||
                    (match.is_friend ? "Start the chat" : "New Match")}
                </Text>
                <Text style={styles.chatGroupTimestamp}>
                  {formatDistanceStrict(new Date(match.UpdatedAt), new Date(), {
                    addSuffix: true,
                  })}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Link>
    );
  }
}

const styles = StyleSheet.create({
  separator: {
    height: 2,
    backgroundColor: borderColor,
  },
  chatGroupView: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor,
  },
  chatGroupProfilePictureDuo: {
    flexDirection: "row",
  },
  chatGroupProfilePictureSolo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "gray",
  },
  chatGroupProfilePicture: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "gray",
    marginRight: 8,
  },
  chatGroupInfo: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  chatGroupTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  chatGroupLastMessage: {
    fontSize: 14,
    color: "gray",
    width: "60%",
    textAlign: "left",
  },
  chatGroupTimestamp: {
    fontSize: 12,
    color: "gray",
    width: "40%",
    textAlign: "right",
  },
  unreadIndicatorContainer: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  unreadIndicator: {
    width: 10,
    height: 10,
    borderRadius: 25,
  },
});
