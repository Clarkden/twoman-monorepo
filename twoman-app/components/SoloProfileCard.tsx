import { Profile } from "@/types/api";
import { SocketMatchData, SocketMessage } from "@/types/socket";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { mainPurple } from "../constants/globalStyles";
import ProfileCard from "./ProfileCard";
import useWebSocket from "@/hooks/useWebsocket";

export function SoloProfileCard({
  profile,
  matchId,
  handleUpdateTarget,
  onBlock,
}: {
  profile: Profile;
  matchId: number;
  handleUpdateTarget?: () => void;
  onBlock: () => void;
}) {
  const { sendMessage } = useWebSocket();

  const updateTarget = (profileId: number) => {
    if (!handleUpdateTarget) return;

    sendMessage({
      type: "match",
      data: {
        match_id: matchId,
        action: "update_target",
        target_profile: profileId,
      },
    });

    handleUpdateTarget();
  };

  return (
    <ScrollView>
      <View
        style={{
          borderRadius: 20,
          flex: 0,
          margin: 20,
          marginBottom: 100,
          gap: 20,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          {handleUpdateTarget && (
            <TouchableOpacity
              style={{
                borderWidth: 1,
                borderColor: mainPurple,
                padding: 5,
                paddingHorizontal: 10,
                borderRadius: 5,
                flexDirection: "row",
                gap: 10,
              }}
              onPress={() => updateTarget(profile.user_id)}
            >
              <Text
                style={{
                  color: mainPurple,
                  fontSize: 12,
                }}
              >
                Invite
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <ProfileCard profile={profile} onBlock={onBlock} />
      </View>
    </ScrollView>
  );
}
