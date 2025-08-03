import { useRef, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Match, Profile } from "@/types/api";
import { FontAwesome } from "@expo/vector-icons";
import { SoloProfileCard } from "./SoloProfileCard";
import PagerView from "react-native-pager-view";
import { useSession } from "@/stores/auth";

export function DuoProfileCard({
  match,
  onBlock,
}: {
  match: Match;
  onBlock: () => void;
}) {
  const pagerRef = useRef<PagerView>(null);
  const [profileIndex, setProfileIndex] = useState(0);
  const userId = useSession((state) => state.session?.user_id);

  function getProfileName(profile: Profile) {
    if (profile.user_id === userId) {
      return "You";
    }

    return profile.name;
  }

  return (
    <View style={{ height: "100%" }}>
      <View
        style={{
          flexDirection: "row",
          gap: 10,
          marginBottom: 40,
        }}
      >
        <View
          style={{
            backgroundColor: "#2e2e2e",
            flex: 1,
            padding: 10,
            borderRadius: 10,
            flexDirection: "row",
            gap: 10,
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
              {getProfileName(match.profile3)}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: match.profile3_accepted ? "#87ff5e" : "lightgray",
              }}
            >
              {match.profile3_accepted ? "Accepted" : "Hasn't Accepted"}
            </Text>
          </View>
        </View>
        <View
          style={{
            backgroundColor: "#2e2e2e",
            flex: 1,
            padding: 10,
            borderRadius: 10,
            flexDirection: "row",
            gap: 10,
          }}
        >
          <Image
            source={{ uri: match.profile4?.image1 }}
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
              {match.profile4 && getProfileName(match.profile4)}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: match.profile4_accepted ? "#87ff5e" : "lightgray",
              }}
            >
              {match.profile4_accepted ? "Accepted" : "Hasn't Accepted"}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flex: 1, margin: -20 }}>
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
          <TouchableOpacity
            onPress={() => {
              pagerRef.current?.setPage(0);
            }}
          >
            {profileIndex === 0 ? (
              <FontAwesome name="circle" size={10} color="white" />
            ) : (
              <FontAwesome name="circle-o" size={10} color="white" />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              pagerRef.current?.setPage(1);
            }}
          >
            {profileIndex === 1 ? (
              <FontAwesome name="circle" size={10} color="white" />
            ) : (
              <FontAwesome name="circle-o" size={10} color="white" />
            )}
          </TouchableOpacity>
        </View>

        <PagerView
          ref={pagerRef}
          style={styles.pagerView}
          initialPage={0}
          onPageScroll={(e) => {
            setProfileIndex(e.nativeEvent.position);
          }}
          orientation={"horizontal"}
        >
          <SoloProfileCard
            profile={match.profile1}
            matchId={match.ID}
            onBlock={onBlock}
            key={1}
          />
          {match.profile2 && (
            <SoloProfileCard
              profile={match.profile2}
              matchId={match.ID}
              onBlock={onBlock}
              key={2}
            />
          )}
        </PagerView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pagerView: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    width: "100%",
  },
});
