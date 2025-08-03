import {FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View} from "react-native";
import {mainBackgroundColor, secondaryBackgroundColor} from "@/constants/globalStyles";
import {Block} from "@/types/api";
import {useEffect, useState} from "react";
import apiFetch from "@/utils/fetch";
import ProfileCard from "@/components/ProfileCard";
import LoadingIndicator from "@/components/LoadingIndicator";
import {FontAwesome} from "@expo/vector-icons";
import {useNavigation} from "expo-router";

export default function BlockScreen() {

    const [blockedAccounts, setBlockedAccounts] = useState<Block[]>([])
    const [loading, setLoading] = useState(true)
    const navigation = useNavigation()

    const fetchBlockedAccounts = async () => {
        try {
            const response = await apiFetch<Block[]>("/profile/blocked")

            if (!response.success) {
                console.log(response.error)
                return
            }

            setBlockedAccounts(response.data)


        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false)
        }
    }

    const handleUnblock = async (blockedProfileID: number) => {
        try {
            const response = await apiFetch(`/profile/unblock`, {
                method: "POST",
                body: {
                    profile_id: blockedProfileID
                }
            })

            if (!response.success) {
                console.log(response.error)
                return
            }

            await fetchBlockedAccounts()

        } catch (error) {
            console.log(error)
        }
    }

    useEffect(() => {
        if (!navigation.isFocused) return;

        fetchBlockedAccounts()
    }, [navigation.isFocused])

    if (loading) {
        return (
            <View
                style={{flex: 1, backgroundColor: mainBackgroundColor, justifyContent: "center", alignItems: "center"}}>
                <LoadingIndicator size={48}/>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <BlockedProfiles blockedAccounts={blockedAccounts} handleUnblock={handleUnblock}/>
        </View>
    )
}

function BlockedProfiles({
                             blockedAccounts, handleUnblock
                         }: {
    blockedAccounts: Block[],
    handleUnblock: (blockedProfileID: number) => Promise<void>
}) {
    const [selectedBlock, setSelectedBlock] = useState<Block | null>(null)

    return (
        < View>
            <Modal
                visible={selectedBlock !== null}
                onRequestClose={() => setSelectedBlock(null)}
                presentationStyle={"pageSheet"}
                animationType={"slide"}>
                <View style={{flex: 1, backgroundColor: mainBackgroundColor, padding: 20}}>
                    <ScrollView>
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
                                    setSelectedBlock(null);
                                }}
                                style={{
                                    flex: 1,
                                    left: 0,
                                    zIndex: 1,
                                }}
                            >
                                <FontAwesome name="angle-down" size={24} color="white"/>
                            </Pressable>
                            {selectedBlock && (
                                <TouchableOpacity onPress={async () => {
                                    await handleUnblock(selectedBlock?.BlockedProfileID)
                                    setSelectedBlock(null)
                                }}>
                                    <Text style={styles.blockFriendButtonText}>Unblock</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {selectedBlock?.BlockedProfile && (
                            <ProfileCard
                                profile={selectedBlock?.BlockedProfile}
                                onBlock={() => {
                                }}
                                showOptionButton={false}
                            />
                        )}
                    </ScrollView>
                </View>
            </Modal>
            < FlatList
                data={blockedAccounts}
                renderItem={({item}) => (
                    <BlockedProfileItem
                        block={item}
                        setSelectedBlock={setSelectedBlock}
                    />
                )}
                keyExtractor={item => item.BlockedProfileID.toString()}
                style={{padding: 20}}
            />
        </View>
    )
}

function BlockedProfileItem({block, setSelectedBlock}: { block: Block, setSelectedBlock: (block: Block) => void }) {
    return (
        <TouchableOpacity onPress={() => setSelectedBlock(block)} style={{
            padding: 15,
            backgroundColor: secondaryBackgroundColor,
            borderRadius: 10,
            marginBottom: 10,
        }}>
            <Text style={{
                color: "white",
                fontSize: 16,
                fontWeight: "500",
            }}>{block.BlockedProfile.username}</Text>
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: mainBackgroundColor
    },
    blockFriendButton: {
        borderWidth: 1,
        borderColor: "#f05d5d",
        padding: 5,
        paddingHorizontal: 10,
        borderRadius: 5,
        flexDirection: "row",
        gap: 10,
    },
    blockFriendButtonText: {
        color: "#f05d5d",
    },
})