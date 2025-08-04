import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { secondaryBackgroundColor, mainPurple } from '../constants/globalStyles';
import { Profile } from '../types/api';

const { width } = Dimensions.get('window');

interface SoloStandoutCardProps {
  profile: Profile;
  popularityScore: number;
  onSendLike: (profileId: number, starsCost: number) => Promise<void>;
  isLoading: boolean;
  starsBalance: number;
}

const SoloStandoutCard: React.FC<SoloStandoutCardProps> = ({
  profile,
  popularityScore: _popularityScore,
  onSendLike,
  isLoading,
  starsBalance,
}) => {
  const starsCost = 1; // Fixed cost of 1 star
  const [imageIndex, setImageIndex] = useState(0);

  const getProfileImages = (profile: Profile) => {
    return [profile.image1, profile.image2, profile.image3, profile.image4].filter(Boolean);
  };

  const profileImages = getProfileImages(profile);

  const handleSendLike = () => {
    // Let the parent component handle payment flow and confirmation
    onSendLike(profile.user_id, starsCost);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.subtitle}>Popular profile</Text>
      </View>

      {/* Image Carousel */}
      <TouchableOpacity 
        onPress={() => setImageIndex((prev) => (prev + 1) % profileImages.length)}
        style={styles.imageContainer}
      >
        {profileImages[imageIndex] ? (
          <Image
            source={{ uri: profileImages[imageIndex] }}
            style={styles.carouselImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.carouselImage, styles.placeholderImage]}>
            <FontAwesome name="user" size={60} color="#7f7985" />
          </View>
        )}
        
        {/* Image indicators */}
        {profileImages.length > 1 && (
          <View style={styles.imageIndicators}>
            {profileImages.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  index === imageIndex && styles.activeIndicator,
                ]}
              />
            ))}
          </View>
        )}
      </TouchableOpacity>

      {/* Bio */}
      {profile.bio && (
        <Text style={styles.bioText} numberOfLines={2}>
          {profile.bio}
        </Text>
      )}

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
            <FontAwesome name="star" size={16} color="white" />
            <Text style={styles.sendButtonText}>
              Send Star
            </Text>
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
    alignItems: 'center',
    marginBottom: 20,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: mainPurple,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  imageContainer: {
    position: 'relative',
    alignSelf: 'center',
    marginBottom: 16,
  },
  carouselImage: {
    width: width - 80,
    height: width - 80,
    borderRadius: 16,
  },
  placeholderImage: {
    backgroundColor: '#7f7985',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  activeIndicator: {
    backgroundColor: 'white',
  },
  bioText: {
    fontSize: 15,
    color: 'white',
    lineHeight: 22,
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 20,
  },
  sendButton: {
    backgroundColor: mainPurple,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SoloStandoutCard;