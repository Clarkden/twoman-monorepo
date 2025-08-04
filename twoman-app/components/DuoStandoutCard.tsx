import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import {
  secondaryBackgroundColor,
  mainPurple,
} from "../constants/globalStyles";
import { Profile } from "../types/api";

const { width } = Dimensions.get("window");

interface DuoStandoutCardProps {
  profile1: Profile;
  profile2: Profile;
  matchCount: number;
  onSendLike: (
    profile1Id: number,
    profile2Id: number,
    starsCost: number,
  ) => Promise<void>;
  isLoading: boolean;
  starsBalance: number;
}

const DuoStandoutCard: React.FC<DuoStandoutCardProps> = ({
  profile1,
  profile2,
  matchCount: _matchCount,
  onSendLike,
  isLoading,
  starsBalance,
}) => {
  const starsCost = 1; // Fixed cost of 1 star
  const [profile1ImageIndex, setProfile1ImageIndex] = useState(0);
  const [profile2ImageIndex, setProfile2ImageIndex] = useState(0);

  const getProfileImages = (profile: Profile) => {
    return [
      profile.image1,
      profile.image2,
      profile.image3,
      profile.image4,
    ].filter(Boolean);
  };

  const profile1Images = getProfileImages(profile1);
  const profile2Images = getProfileImages(profile2);

  const handleSendLike = () => {
    // Check if user has enough stars
    if (starsBalance < starsCost) {
      Alert.alert(
        "Insufficient Stars",
        `You need ${starsCost} star${starsCost > 1 ? 's' : ''} to send this like. You currently have ${starsBalance} star${starsBalance > 1 ? 's' : ''}.`
      );
      return;
    }
    
    // Always trigger the duo flow (friend selection first)
    onSendLike(profile1.user_id, profile2.user_id, starsCost);
  };

  const renderImageCarousel = (
    images: string[],
    currentIndex: number,
    onTap: () => void,
    name: string,
  ) => {
    const currentImage = images[currentIndex] || "";

    return (
      <View style={styles.imageCarouselContainer}>
        <TouchableOpacity onPress={onTap} style={styles.imageContainer}>
          {currentImage ? (
            <Image
              source={{ uri: currentImage }}
              style={styles.carouselImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.carouselImage, styles.placeholderImage]}>
              <FontAwesome name="user" size={40} color="#7f7985" />
            </View>
          )}

          {/* Image indicators */}
          {images.length > 1 && (
            <View style={styles.imageIndicators}>
              {images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    index === currentIndex && styles.activeIndicator,
                  ]}
                />
              ))}
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.profileName}>{name}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {profile1.name} & {profile2.name}
        </Text>
        <Text style={styles.subtitle}>Popular duo pair</Text>
      </View>

      {/* Image Carousels */}
      <View style={styles.carouselsContainer}>
        {renderImageCarousel(
          profile1Images,
          profile1ImageIndex,
          () =>
            setProfile1ImageIndex((prev) => (prev + 1) % profile1Images.length),
          profile1.name,
        )}

        {renderImageCarousel(
          profile2Images,
          profile2ImageIndex,
          () =>
            setProfile2ImageIndex((prev) => (prev + 1) % profile2Images.length),
          profile2.name,
        )}
      </View>

      {/* Send Like Button */}
      <TouchableOpacity
        style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
        onPress={handleSendLike}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <>
            <FontAwesome name="users" size={16} color="white" />
            <Text style={styles.sendButtonText}>Add your duo partner</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: secondaryBackgroundColor,
    margin: 20,
    marginVertical: 10,
    borderRadius: 16,
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: mainPurple,
    fontWeight: "600",
    marginTop: 4,
  },
  carouselsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },
  imageCarouselContainer: {
    flex: 1,
    alignItems: "center",
  },
  imageContainer: {
    position: "relative",
    marginBottom: 8,
  },
  carouselImage: {
    width: (width - 80) / 2,
    height: (width - 80) / 2,
    borderRadius: 12,
  },
  placeholderImage: {
    backgroundColor: "#7f7985",
    justifyContent: "center",
    alignItems: "center",
  },
  imageIndicators: {
    position: "absolute",
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  activeIndicator: {
    backgroundColor: "white",
  },
  profileName: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    textAlign: "center",
  },
  sendButton: {
    backgroundColor: mainPurple,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default DuoStandoutCard;
