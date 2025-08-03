import {
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  Share,
} from "react-native";
import {
  accentGray,
  mainBackgroundColor,
  secondaryBackgroundColor,
} from "@/constants/globalStyles";
import { useEffect, useState } from "react";
import { Friendship, Profile } from "@/types/api";
import { UserPlus2, Users, Share as ShareIcon } from "lucide-react-native";
import apiFetch from "@/utils/fetch";
import ProfileCard from "@/components/ProfileCard";
import LoadingIndicator from "@/components/LoadingIndicator";
import { FontAwesome } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import profileStore from "@/stores/profile";
import Toast from "react-native-toast-message";
import { messageHandler } from "@/utils/websocket";
import { useSession } from "@/stores/auth";
import * as Contacts from "expo-contacts";
import { shareReferralLink } from "@/utils/deep-links";
import {
  getReferralCode,
  getReferralStats,
  redeemReferralCode,
  canRedeemReferralCode,
  type ReferralStats,
} from "@/utils/referral";

export default function FriendsScreen() {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [friendRequests, setFriendRequests] = useState<Friendship[]>([]);
  const [selectedFriendRequestProfile, setSelectedFriendRequestProfile] =
    useState<Profile | null>(null);
  const userId = useSession((state) => state.session?.user_id);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const { profile: storedProfile } = profileStore();
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(
    storedProfile,
  );
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [contacts, setContacts] = useState<Contacts.Contact[]>([]);
  const [contactsSearch, setContactsSearch] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(
    null,
  );
  const [loadingReferralStats, setLoadingReferralStats] = useState(true);
  const navigation = useNavigation();

  const fetchFriends = async () => {
    try {
      const response = await apiFetch<Friendship[]>(
        `/profile/${userId}/friends`,
      );

      if (response.code !== 200) {
        console.log(response.error);
        return;
      }

      setFriends(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchFriendRequests = async () => {
    try {
      const response = await apiFetch<Friendship[]>("/friendship/requests");

      if (response.code !== 200) {
        console.log(response.error);
        return;
      }

      setFriendRequests(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  const handleBlockFriend = async (profile: Profile) => {
    setSelectedProfile(null);
    for (let i = 0; i < friends.length; i++) {
      if (friends[i].Friend.user_id === profile.user_id) {
        friends.splice(i, 1);
        break;
      }

      if (friends[i].Profile.user_id === profile.user_id) {
        friends.splice(i, 1);
        break;
      }
    }
  };

  const handleRemoveFriend = async (profile: Profile) => {
    try {
      const friendship = friends.find(
        (friendship) =>
          friendship.Friend.user_id === profile.user_id ||
          friendship.Profile.user_id === profile.user_id,
      );

      if (!friendship) {
        console.log("Friendship not found");
        return;
      }

      const response = await apiFetch(`/friendship/${profile.user_id}/remove`, {
        method: "POST",
      });

      if (!response.success) {
        console.log(response);
        return;
      }

      setFriends(friends.filter((friend) => friend.ID !== friendship.ID));
      setSelectedProfile(null);
    } catch (error) {
      console.log(error);
    }
  };

  const handleAcceptFriendRequest = async (profile: Profile) => {
    let friendship: Friendship | null = null;

    for (let i = 0; i < friendRequests.length; i++) {
      if (friendRequests[i].Profile.user_id === profile.user_id) {
        friendship = friendRequests[i];
        break;
      }
    }

    if (!friendship) {
      console.log("Friendship not found");
      return;
    }

    try {
      const response = await apiFetch(`/friendship/${friendship.ID}/accept`, {
        method: "PATCH",
      });

      if (!response.success) {
        console.log(response);
        return;
      }

      setFriendRequests(
        friendRequests.filter((request) => request.ID !== friendship!.ID),
      );
      setSelectedFriendRequestProfile(null);
      await fetchFriends();
      await fetchFriendRequests();
    } catch (error) {
      console.log(error);
    }
  };

  const handleRejectFriendRequest = async (profile: Profile) => {
    let friendship: Friendship | null = null;

    for (let i = 0; i < friendRequests.length; i++) {
      if (friendRequests[i].Profile.user_id === profile.user_id) {
        friendship = friendRequests[i];
        break;
      }
    }

    if (!friendship) {
      console.log("Friendship not found");
      return;
    }

    try {
      const response = await apiFetch(`/friendship/${friendship.ID}/reject`, {
        method: "PATCH",
      });

      if (!response.success) {
        console.log(response.error);
        return;
      }

      setFriendRequests(
        friendRequests.filter((request) => request.ID !== friendship!.ID),
      );
      setSelectedFriendRequestProfile(null);
      await fetchFriends();
      await fetchFriendRequests();
    } catch (error) {
      console.log(error);
    }
  };

  const fetchCurrentUserProfile = async () => {
    try {
      const response = await apiFetch<Profile>("/profile/me");

      if (!response.success) {
        console.log(response.error);
        return;
      }

      setCurrentUserProfile(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchReferralData = async () => {
    try {
      setLoadingReferralStats(true);
      const stats = await getReferralStats();
      setReferralStats(stats);
      setReferralCode(stats.referral_code);
    } catch (error) {
      console.error("Error fetching referral data:", error);
    } finally {
      setLoadingReferralStats(false);
    }
  };

  const requestContactsPermission = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status === "granted") {
      setShowContactsModal(true);
      await fetchContacts();
    } else {
      Alert.alert(
        "Permission Required",
        "We need access to your contacts to help you invite friends to the app.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Settings", onPress: () => {} }, // Could open settings in future
        ],
      );
    }
  };

  const fetchContacts = async () => {
    setLoadingContacts(true);
    try {
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
        sort: Contacts.SortTypes.FirstName,
      });

      // Filter contacts that have phone numbers
      const contactsWithPhones = data.filter(
        (contact) => contact.phoneNumbers && contact.phoneNumbers.length > 0,
      );

      setContacts(contactsWithPhones);
    } catch (error) {
      console.log("Error fetching contacts:", error);
      Alert.alert("Error", "Failed to load contacts");
    } finally {
      setLoadingContacts(false);
    }
  };

  const shareAppWithContact = async (contact: Contacts.Contact) => {
    try {
      let shareMessage;

      if (referralCode) {
        // Use referral link if available
        await shareReferralLink(referralCode, currentUserProfile?.name);
      } else {
        // Fallback to original message
        shareMessage = `Hey ${contact.name || "there"}! I'm using this new double dating app called 2 Man. Let's team up and go on some double dates together! Add me my username is ${currentUserProfile?.username}! Download it here: https://apps.apple.com/us/app/2-man/id6505080080`;

        await Share.share({
          message: shareMessage,
        });
      }

      Toast.show({
        type: "success",
        text1: "Shared with contact",
        text2: `Invited ${contact.name || "contact"} to try 2 Man${referralCode ? " with your referral code!" : ""}`,
      });
    } catch (error) {
      console.log("Error sharing:", error);
      Toast.show({
        type: "error",
        text1: "Failed to share",
        text2: "Could not share with this contact",
      });
    }
  };

  const getFilteredContacts = () => {
    if (!contactsSearch.trim()) {
      return contacts;
    }

    return contacts.filter((contact) => {
      const name = contact.name?.toLowerCase() || "";
      const phone = contact.phoneNumbers?.[0]?.number || "";
      const searchTerm = contactsSearch.toLowerCase();

      return name.includes(searchTerm) || phone.includes(searchTerm);
    });
  };

  const closeContactsModal = () => {
    setShowContactsModal(false);
    setContactsSearch("");
  };

  useEffect(() => {
    if (!navigation.isFocused) return;

    fetchFriends();
    fetchFriendRequests();
    fetchReferralData();

    if (!currentUserProfile) {
      fetchCurrentUserProfile();
    }
  }, [navigation.isFocused]);

  const getFriendName = (friendship: Friendship) => {
    if (friendship.Profile.user_id === userId) {
      return friendship.Friend.name;
    }

    return friendship.Profile.name;
  };

  const renderFriend = ({
    item,
    onClick,
  }: {
    item: Friendship;
    onClick: (friendship: Friendship) => void;
  }) => {
    const friend = item.Profile.user_id === userId ? item.Friend : item.Profile;

    return (
      <TouchableOpacity style={styles.friendItem} onPress={() => onClick(item)}>
        <View style={styles.friendContent}>
          <Image source={{ uri: friend.image1 }} style={styles.friendImage} />
          <View style={styles.friendInfo}>
            <Text style={styles.friendName}>{friend.name}</Text>
            <Text style={styles.friendUsername}>@{friend.username}</Text>
          </View>
        </View>
        <View style={styles.friendAction}>
          <FontAwesome name="chevron-right" size={16} color={accentGray} />
        </View>
      </TouchableOpacity>
    );
  };

  const handleFriendClick = (friendship: Friendship) => {
    if (friendship.ProfileID === currentUserProfile?.user_id) {
      setSelectedProfile(friendship.Friend);
      return;
    }

    setSelectedProfile(friendship.Profile);
  };

  useEffect(() => {
    const handleMatchMessage = () => {
      fetchFriends();
      fetchFriendRequests();
    };

    messageHandler.subscribe("friendship", handleMatchMessage);

    return () => {
      messageHandler.unsubscribe("friendship", handleMatchMessage);
    };
  }, [messageHandler]);

  return (
    <View
      style={{ flex: 1, backgroundColor: mainBackgroundColor, padding: 20 }}
    >
      <FlatList
        data={friends}
        renderItem={({ item }) =>
          renderFriend({ item, onClick: handleFriendClick })
        }
        keyExtractor={(item) => item.ID.toString()}
        ListHeaderComponent={() => (
          <>
            {/* Referral Section - Conditional Rendering */}
            {!loadingReferralStats && referralStats && (
              <ReferralSection
                stats={referralStats}
                onContactsPress={requestContactsPermission}
                onCodeRedeem={fetchReferralData}
              />
            )}

            {/* Username Search */}
            <View style={styles.searchSection}>
              <Text style={styles.sectionTitle}>Find Friends</Text>
              <UsernameSearch />
            </View>

            {/* Friend Requests */}
            <FriendRequests
              friendRequests={friendRequests}
              setSelectedFriendRequestProfile={setSelectedFriendRequestProfile}
            />

            {/* Friends List Header */}
            <View style={styles.friendsListHeader}>
              <Text style={styles.sectionTitle}>
                My Friends ({friends.length})
              </Text>
            </View>
          </>
        )}
      />
      <Modal
        visible={selectedFriendRequestProfile !== null}
        onRequestClose={() => setSelectedFriendRequestProfile(null)}
        presentationStyle="pageSheet"
        animationType="slide"
      >
        <View
          style={{
            backgroundColor: mainBackgroundColor,
            flex: 1,
          }}
        >
          {selectedFriendRequestProfile && (
            <ScrollView>
              <View
                style={{
                  padding: 20,
                }}
              >
                <View
                  style={{
                    flex: 1,
                    backgroundColor: mainBackgroundColor,
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
                    <Pressable
                      onPress={() => {
                        setSelectedFriendRequestProfile(null);
                      }}
                      style={{
                        flex: 1,
                        left: 0,
                        zIndex: 1,
                      }}
                    >
                      <FontAwesome name="angle-down" size={24} color="white" />
                    </Pressable>
                    <TouchableOpacity
                      onPress={() => {
                        handleAcceptFriendRequest(selectedFriendRequestProfile);
                      }}
                      style={styles.acceptFriendButton}
                    >
                      <Text style={styles.acceptFriendButtonText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        handleRejectFriendRequest(selectedFriendRequestProfile);
                      }}
                      style={styles.removeFriendButton}
                    >
                      <Text style={styles.removeFriendButtonText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {selectedFriendRequestProfile && (
                  <ProfileCard
                    profile={selectedFriendRequestProfile}
                    onBlock={() =>
                      handleBlockFriend(selectedFriendRequestProfile)
                    }
                  />
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
      <Modal
        visible={selectedProfile !== null}
        onRequestClose={() => setSelectedProfile(null)}
        presentationStyle="pageSheet"
        animationType="slide"
      >
        <View
          style={{
            backgroundColor: mainBackgroundColor,
            flex: 1,
          }}
        >
          {selectedProfile && (
            <ScrollView>
              <View
                style={{
                  padding: 20,
                }}
              >
                <View
                  style={{
                    flex: 1,
                    backgroundColor: mainBackgroundColor,
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
                    <Pressable
                      onPress={() => {
                        setSelectedProfile(null);
                      }}
                      style={{
                        flex: 1,
                        left: 0,
                        zIndex: 1,
                      }}
                    >
                      <FontAwesome name="angle-down" size={24} color="white" />
                    </Pressable>
                    {/* <TouchableOpacity
                      onPress={() => {
                        handleRemoveFriend(selectedProfile);
                      }}
                      style={styles.messageFriendButton}
                    >
                      <Text style={styles.messageFriendButtonText}>
                        Message
                      </Text>
                    </TouchableOpacity> */}
                    <TouchableOpacity
                      onPress={() => {
                        handleRemoveFriend(selectedProfile);
                      }}
                      style={styles.removeFriendButton}
                    >
                      <Text style={styles.removeFriendButtonText}>
                        Remove Friend
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {selectedProfile && (
                  <ProfileCard
                    profile={selectedProfile}
                    onBlock={() => handleBlockFriend(selectedProfile)}
                  />
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Contacts Modal */}
      <Modal
        visible={showContactsModal}
        onRequestClose={closeContactsModal}
        presentationStyle="pageSheet"
        animationType="slide"
      >
        <View style={{ backgroundColor: mainBackgroundColor, flex: 1 }}>
          <View style={{ padding: 20 }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={closeContactsModal}
                style={styles.modalCloseButton}
              >
                <FontAwesome name="angle-down" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Invite Friends</Text>
              <View style={{ width: 24 }} />
            </View>

            <Text style={styles.modalSubtitle}>
              Add your friends to start running 2 Mans!
            </Text>

            <View style={styles.searchInputContainer}>
              <TextInput
                value={contactsSearch}
                onChangeText={setContactsSearch}
                style={styles.contactsSearchInput}
                placeholder="Search contacts by name or phone"
                placeholderTextColor="gray"
              />
              {contactsSearch.length > 0 && (
                <TouchableOpacity
                  onPress={() => setContactsSearch("")}
                  style={styles.clearSearchButton}
                >
                  <FontAwesome name="times" size={16} color={accentGray} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={getFilteredContacts()}
              keyExtractor={(item) =>
                item.id || item.name || Math.random().toString()
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.contactItem}
                  onPress={() => shareAppWithContact(item)}
                >
                  <View style={styles.contactInfo}>
                    <View style={styles.contactAvatar}>
                      <Text style={styles.contactInitial}>
                        {item.name ? item.name.charAt(0).toUpperCase() : "?"}
                      </Text>
                    </View>
                    <View style={styles.contactDetails}>
                      <Text style={styles.contactName}>
                        {item.name || "Unknown Contact"}
                      </Text>
                      <Text style={styles.contactPhone}>
                        {item.phoneNumbers?.[0]?.number || "No phone number"}
                      </Text>
                    </View>
                  </View>
                  <ShareIcon size={18} color={accentGray} />
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={() => {
                if (loadingContacts) {
                  return (
                    <View style={styles.emptyContactsContainer}>
                      <LoadingIndicator size={48} />
                      <Text style={styles.emptyContactsText}>
                        Loading contacts...
                      </Text>
                    </View>
                  );
                }

                return (
                  <View style={styles.emptyContactsContainer}>
                    <Users size={48} color={accentGray} />
                    <Text style={styles.emptyContactsText}>
                      {contactsSearch.trim()
                        ? "No contacts found"
                        : "No contacts found"}
                    </Text>
                    <Text style={styles.emptyContactsSubtext}>
                      {contactsSearch.trim()
                        ? `No contacts match "${contactsSearch}"`
                        : "Make sure you have contacts with phone numbers"}
                    </Text>
                  </View>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function UsernameSearch() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Profile[]>([]);

  const handleSearch = async () => {
    try {
      const response = await apiFetch<Profile[]>(
        `/profile/search?username=${search}`,
      );

      if (!response.success) {
        console.log(response.error);
        return;
      }

      setResults(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  const handleInviteFriend = async (profile: Profile) => {
    try {
      const response = await apiFetch(`/friendship/${profile.username}`, {
        method: "POST",
      });

      if (!response.success) {
        console.log(response.error);
        return;
      }

      setSearch("");
      setResults([]);

      Toast.show({
        type: "success",
        text1: "Friend request sent",
      });
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (search.length < 3) {
      setResults([]);
      return;
    }

    handleSearch();
  }, [search]);

  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
          placeholder="Search by username"
          placeholderTextColor="gray"
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearch("")}
            style={styles.clearSearchButton}
          >
            <FontAwesome name="times" size={16} color={accentGray} />
          </TouchableOpacity>
        )}
      </View>

      {search.length >= 3 && results.length === 0 ? (
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsText}>No users found</Text>
          <Text style={styles.noResultsSubtext}>
            Try searching for a different username
          </Text>
        </View>
      ) : (
        results.length > 0 && (
          <View style={styles.searchResults}>
            <FlatList
              data={results}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={styles.searchResultItem}
                  onPress={() => handleInviteFriend(item)}
                >
                  <View style={styles.searchResultContent}>
                    <Image
                      source={{ uri: item.image1 }}
                      style={styles.searchResultImage}
                    />
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.searchResultName}>{item.name}</Text>
                      <Text style={styles.searchResultUsername}>
                        @{item.username}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.addFriendButton}>
                    <UserPlus2 size={18} color="#6770eb" />
                  </View>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.user_id.toString()}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )
      )}
    </View>
  );
}

function ReferralSection({
  stats,
  onContactsPress,
  onCodeRedeem,
}: {
  stats: ReferralStats;
  onContactsPress: () => void;
  onCodeRedeem: () => void;
}) {
  const [codeInput, setCodeInput] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const handleRedeemCode = async () => {
    if (!codeInput.trim() || codeInput.length !== 8) {
      Alert.alert(
        "Invalid Code",
        "Please enter a valid 8-character referral code",
      );
      return;
    }

    setRedeeming(true);
    try {
      await redeemReferralCode(codeInput.toUpperCase());
      Toast.show({
        type: "success",
        text1: "Code redeemed!",
        text2: "You now have 1 week of 2 Man Pro free!",
      });
      setCodeInput("");
      onCodeRedeem(); // Refresh the stats
    } catch (error) {
      console.error("Error redeeming code:", error);
      Toast.show({
        type: "error",
        text1: "Failed to redeem",
        text2: error instanceof Error ? error.message : "Invalid referral code",
      });
    } finally {
      setRedeeming(false);
    }
  };

  if (canRedeemReferralCode(stats)) {
    // Show referral code input for new users
    return (
      <View style={styles.inviteFriendsSection}>
        <View style={styles.referralCodeCard}>
          <Text style={styles.referralCodeTitle}>Have a referral code?</Text>
          <Text style={styles.referralCodeSubtitle}>
            Enter your friend's code to get 1 week of 2 Man Pro free!
          </Text>
          <View style={styles.codeInputContainer}>
            <TextInput
              value={codeInput}
              onChangeText={(text) => setCodeInput(text.toUpperCase())}
              style={styles.codeInput}
              placeholder="Enter code"
              placeholderTextColor="#666"
              maxLength={8}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[
                styles.redeemButton,
                (!codeInput.trim() || redeeming) && styles.redeemButtonDisabled,
              ]}
              onPress={handleRedeemCode}
              disabled={!codeInput.trim() || redeeming}
            >
              {redeeming ? (
                <LoadingIndicator size={16} />
              ) : (
                <Text style={styles.redeemButtonText}>Redeem</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Show invite section for existing users
  return (
    <View style={styles.inviteFriendsSection}>
      <TouchableOpacity
        style={styles.contactsButton}
        onPress={onContactsPress}
        activeOpacity={0.8}
      >
        <View style={styles.contactsButtonContent}>
          <View style={styles.contactsButtonTextContainer}>
            <Text style={styles.contactsButtonText}>Invite your friends!</Text>
            <Text style={styles.contactsButtonSubtext}>
              Get 3 friends to join and get 2 Man Pro free for a month. They get
              1 week Pro for free!
            </Text>
          </View>
        </View>
        <ShareIcon size={16} color="white" />
      </TouchableOpacity>
    </View>
  );
}

function FriendRequests({
  friendRequests,
  setSelectedFriendRequestProfile,
}: {
  friendRequests: Friendship[];
  setSelectedFriendRequestProfile: (profile: Profile) => void;
}) {
  return (
    <View style={styles.friendRequestsSection}>
      <Text style={styles.sectionTitle}>
        Friend Requests ({friendRequests.length})
      </Text>

      {friendRequests.length > 0 ? (
        <View style={styles.friendRequestsList}>
          {friendRequests.map((friendRequest, i) => (
            <TouchableOpacity
              style={styles.friendRequestItem}
              key={i}
              onPress={() =>
                setSelectedFriendRequestProfile(friendRequest.Profile)
              }
            >
              <View style={styles.friendRequestContent}>
                <Image
                  source={{ uri: friendRequest.Profile.image1 }}
                  style={styles.friendRequestImage}
                />
                <View style={styles.friendRequestInfo}>
                  <Text style={styles.friendRequestName}>
                    {friendRequest.Profile.name}
                  </Text>
                  <Text style={styles.friendRequestUsername}>
                    @{friendRequest.Profile.username}
                  </Text>
                </View>
              </View>
              <View style={styles.friendRequestAction}>
                <UserPlus2 size={18} color="#5df067" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyStateText}>No pending requests</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  friendItem: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: secondaryBackgroundColor,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  friendContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  friendImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  friendInfo: {
    flexDirection: "column",
  },
  friendName: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  friendUsername: {
    color: accentGray,
    fontSize: 14,
  },
  friendAction: {
    padding: 5,
  },
  removeFriendButton: {
    borderWidth: 1,
    borderColor: "#f05d5d",
    padding: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    flexDirection: "row",
    gap: 10,
  },
  acceptFriendButton: {
    borderWidth: 1,
    borderColor: "#5df067",
    padding: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    flexDirection: "row",
    gap: 10,
  },
  messageFriendButton: {
    borderWidth: 1,
    borderColor: "#6770eb",
    padding: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    flexDirection: "row",
    gap: 10,
  },
  removeFriendButtonText: {
    color: "#f05d5d",
  },
  acceptFriendButtonText: {
    color: "#78f05d",
  },
  messageFriendButtonText: {
    color: "#6770eb",
  },
  inviteFriendsSection: {
    marginBottom: 20,
  },
  contactsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    borderRadius: 12,
    backgroundColor: secondaryBackgroundColor,
    marginBottom: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactsButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  contactsButtonTextContainer: {
    flex: 1,
  },
  contactsButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  contactsButtonSubtext: {
    color: "#CCCCCC",
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  headerContainer: {
    marginBottom: 20,
  },
  pageTitle: {
    color: "white",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 5,
  },
  pageSubtitle: {
    color: accentGray,
    fontSize: 16,
  },
  searchSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  friendsListHeader: {
    marginBottom: 10,
  },
  searchContainer: {
    gap: 10,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: secondaryBackgroundColor,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: "white",
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  clearSearchButton: {
    padding: 5,
  },
  searchResults: {
    backgroundColor: secondaryBackgroundColor,
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
  },
  searchResultContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  searchResultImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  searchResultInfo: {
    flexDirection: "column",
  },
  searchResultName: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  searchResultUsername: {
    color: accentGray,
    fontSize: 14,
  },
  addFriendButton: {
    padding: 5,
  },
  noResultsContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  noResultsText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  noResultsSubtext: {
    color: accentGray,
    fontSize: 14,
    marginTop: 5,
  },
  friendRequestsSection: {
    marginBottom: 20,
  },
  friendRequestsList: {
    backgroundColor: secondaryBackgroundColor,
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  friendRequestItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
  },
  friendRequestContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  friendRequestImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  friendRequestInfo: {
    flexDirection: "column",
  },
  friendRequestName: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  friendRequestUsername: {
    color: accentGray,
    fontSize: 14,
  },
  friendRequestAction: {
    padding: 5,
  },
  emptyStateText: {
    color: accentGray,
    fontSize: 16,
    textAlign: "left",
    paddingVertical: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalCloseButton: {
    padding: 5,
  },
  modalTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  modalSubtitle: {
    color: accentGray,
    fontSize: 14,
    marginBottom: 20,
    textAlign: "center",
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: accentGray,
  },
  contactInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: accentGray,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  contactInitial: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  contactDetails: {
    flexDirection: "column",
  },
  contactName: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  contactPhone: {
    color: accentGray,
    fontSize: 14,
  },
  emptyContactsContainer: {
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyContactsText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 10,
  },
  emptyContactsSubtext: {
    color: accentGray,
    fontSize: 14,
    marginTop: 5,
  },
  contactsSearchInput: {
    flex: 1,
    color: "white",
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  contactsCount: {
    color: accentGray,
    fontSize: 14,
  },
  referralCodeCard: {
    backgroundColor: secondaryBackgroundColor,
    borderRadius: 12,
    padding: 18,
    marginBottom: 5,
  },
  referralCodeTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  referralCodeSubtitle: {
    color: "#CCCCCC",
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  codeInputContainer: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  codeInput: {
    flex: 1,
    backgroundColor: "#2a2a2c",
    color: "white",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 1,
    textAlign: "center",
  },
  redeemButton: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  redeemButtonDisabled: {
    backgroundColor: "#666666",
    opacity: 0.6,
  },
  redeemButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
});
