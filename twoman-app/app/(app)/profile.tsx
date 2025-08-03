import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useEffect, useState, useRef } from "react";
import { Profile } from "@/types/api";
import { getProfile, updateLocation, updateProfile } from "@/utils/profile";
import { uploadFile } from "@/utils/files";
import { FontAwesome, FontAwesome6 } from "@expo/vector-icons";
import {
  globalStyles,
  mainBackgroundColor,
  mainPurple,
  secondaryBackgroundColor,
} from "@/constants/globalStyles";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "expo-router";
import LoadingIndicator from "@/components/LoadingIndicator";
import {
  Book,
  BriefcaseBusiness,
  Cake,
  MapPin,
  MessageSquareHeart,
  NotepadText,
  X,
} from "lucide-react-native";
import * as Location from "expo-location";
import profileStore from "@/stores/profile";
import { useSession } from "@/stores/auth";
import DraggableGrid from "react-native-draggable-grid";
import ProfileCard from "@/components/ProfileCard";
import Colors from "@/constants/Colors";

const { width, height } = Dimensions.get("window");

const capitalize = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

type EditingItem =
  | "none"
  | "bio"
  | "location"
  | "education"
  | "occupation"
  | "interests"
  | "name";

type Education = "" | "High School" | "College" | "Graduate School";

const EducationPicker = ({
  value,
  onChange,
}: {
  value: Education;
  onChange: (value: Education) => void;
}) => {
  return (
    <View style={educationPickerStyles.container}>
      <TouchableOpacity
        style={[
          educationPickerStyles.educationOption,
          {
            backgroundColor:
              value === "" ? mainPurple : secondaryBackgroundColor,
          },
        ]}
        onPress={() => onChange("")}
      >
        <Text
          style={{
            color: "white",
          }}
        >
          None
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          educationPickerStyles.educationOption,
          {
            backgroundColor:
              value === "High School" ? mainPurple : secondaryBackgroundColor,
          },
        ]}
        onPress={() => onChange("High School")}
      >
        <Text
          style={{
            color: "white",
          }}
        >
          High School
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          educationPickerStyles.educationOption,
          {
            backgroundColor:
              value === "College" ? mainPurple : secondaryBackgroundColor,
          },
        ]}
        onPress={() => onChange("College")}
      >
        <Text
          style={{
            color: "white",
          }}
        >
          College
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          educationPickerStyles.educationOption,
          {
            backgroundColor:
              value === "Graduate School"
                ? mainPurple
                : secondaryBackgroundColor,
          },
        ]}
        onPress={() => onChange("Graduate School")}
      >
        <Text
          style={{
            color: "white",
          }}
        >
          Graduate School
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const educationPickerStyles = StyleSheet.create({
  container: {
    gap: 10,
    marginTop: 20,
  },
  educationOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 10,
  },
});

const ImageSavingIndicator = () => {
  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 20,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 20,
      }}
    >
      <LoadingIndicator size={36} />
    </View>
  );
};

// New type for image items in the grid
type ImageItem = {
  key: string;
  uri: string | null;
  isLoading: boolean;
  position: number;
};

// Add this type helper below the ImageItem type definition
type ProfileWithImages = Profile & {
  [key: `image${number}`]: string;
  [key: string]: any; // This allows string indexing
};

export default function ProfileScreen() {
  const { profile: storedProfile, updateProfile: updateStoredProfile } =
    profileStore();

  const [profile, setProfile] = useState<Profile | null>(storedProfile);
  const [profileLoaded, setProfileLoaded] = useState<boolean>(false);
  const [locationServiceEnabled, setLocationServiceEnabled] =
    useState<boolean>(true);
  const [locationErrorMessage, setLocationErrorMessage] = useState<string>("");
  const [updatingLocation, setUpdatingLocation] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<EditingItem>("none");
  const [editingItemValue, setEditingItemValue] = useState<string>("");
  const [editingItemMultilineInput, setEditingItemMultiLineInput] =
    useState<boolean>(false);

  // Replace individual loading states with a new images state array
  const [images, setImages] = useState<ImageItem[]>([]);

  const { session } = useSession();

  const navigation = useNavigation();

  // Add these near the beginning where other useState hooks are
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  // Initialize images from profile when it loads
  useEffect(() => {
    if (profile) {
      const imageItems: ImageItem[] = [];
      for (let i = 1; i <= 4; i++) {
        const uri = profile[`image${i}` as keyof Profile] as string;
        imageItems.push({
          key: `image-${i}`,
          uri: uri || null,
          isLoading: false,
          position: i - 1,
        });
      }
      setImages(imageItems);
    }
  }, [
    profileLoaded,
    profile?.image1,
    profile?.image2,
    profile?.image3,
    profile?.image4,
  ]);

  // Handle reordering of images
  const handleReorder = (newOrder: ImageItem[]) => {
    console.log("Reordering images:", newOrder);

    // Make sure to preserve position properties during reordering
    const reorderedImages = newOrder.map((item, index) => ({
      ...item,
      position: index,
    }));

    setImages(reorderedImages);

    // Update the profile with the new image order
    if (!profile) return;

    const updatedProfile = { ...profile } as ProfileWithImages;
    reorderedImages.forEach((item, index) => {
      const imagePosition = index + 1;
      const imageKey = `image${imagePosition}` as keyof typeof updatedProfile;
      updatedProfile[imageKey] = item.uri || "";
    });

    setProfile(updatedProfile);
  };

  // Handle image deletion
  const handleDeleteImage = (key: string) => {
    // Only allow deletion if there's more than one image with content
    const imagesWithContent = images.filter((img) => img.uri !== null);
    if (imagesWithContent.length <= 1) return;

    const index = images.findIndex((img) => img.key === key);
    if (index === -1) return;

    // Create a copy of the current images array
    const updatedImages = [...images];

    // Mark the selected image as deleted by setting its URI to null
    updatedImages[index] = { ...updatedImages[index], uri: null };

    // Get all non-empty images after deletion
    const nonEmptyImages = updatedImages.filter((img) => img.uri !== null);

    // Create new array with images in correct positions
    const finalImages = updatedImages.map((item, i) => {
      if (i < nonEmptyImages.length) {
        // For positions that should have content, use the content from nonEmptyImages
        return {
          ...item,
          uri: nonEmptyImages[i].uri,
        };
      } else {
        // For remaining positions, ensure they're empty
        return {
          ...item,
          uri: null,
        };
      }
    });

    setImages(finalImages);

    // Update profile
    if (!profile) return;
    const updatedProfile = { ...profile } as ProfileWithImages;

    // Clear all image fields first
    for (let i = 1; i <= 4; i++) {
      updatedProfile[`image${i}`] = "";
    }

    // Assign the images in their new order
    nonEmptyImages.forEach((img, idx) => {
      const position = idx + 1;
      const imageKey = `image${position}` as keyof typeof updatedProfile;
      updatedProfile[imageKey] = img.uri || "";
    });

    setProfile(updatedProfile);
  };

  const getEditingItemValue = (): string => {
    if (!profile) return "";

    switch (editingItem) {
      case "bio":
        setEditingItemMultiLineInput(true);
        return profile?.bio;
      case "education":
        setEditingItemMultiLineInput(false);
        return profile?.education;
      case "interests":
        setEditingItemMultiLineInput(false);
        return profile?.interests;
      case "location":
        setEditingItemMultiLineInput(false);
        return profile?.city;
      case "occupation":
        setEditingItemMultiLineInput(false);
        return profile?.occupation;
      case "name":
        setEditingItemMultiLineInput(false);
        return profile?.name;
      default:
        setEditingItemMultiLineInput(false);
        return "";
    }
  };

  const handleChangeEditingItemText = (text: string) => {
    if (!profile) return;

    switch (editingItem) {
      case "bio":
        setProfile((prevProfile) => {
          if (!prevProfile) return null;

          const updatedProfile: Profile = {
            ...prevProfile,
            bio: text,
          };

          setEditingItemValue(text);

          return updatedProfile;
        });
        break;
      case "education":
        setProfile((prevProfile) => {
          if (!prevProfile) return null;

          const updatedProfile: Profile = {
            ...prevProfile,
            education: text,
          };

          setEditingItemValue(text);

          return updatedProfile;
        });
        break;
      case "interests":
        setProfile((prevProfile) => {
          if (!prevProfile) return null;

          const updatedProfile: Profile = {
            ...prevProfile,
            interests: text,
          };

          setEditingItemValue(text);

          return updatedProfile;
        });
        break;
      case "occupation":
        setProfile((prevProfile) => {
          if (!prevProfile) return null;

          const updatedProfile: Profile = {
            ...prevProfile,
            occupation: text,
          };

          setEditingItemValue(text);

          return updatedProfile;
        });
        break;
      case "name":
        setProfile((prevProfile) => {
          if (!prevProfile) return null;

          const updatedProfile: Profile = {
            ...prevProfile,
            name: text,
          };

          setEditingItemValue(text);

          return updatedProfile;
        });
        break;
      default:
        return "";
    }
  };

  const requestLocation = async (): Promise<Location.LocationObject | null> => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setLocationErrorMessage("Permission to access location was denied");
      setLocationServiceEnabled(false);
      return null;
    }

    return await Location.getCurrentPositionAsync({});
  };

  const handleUpdateLocation = async () => {
    setUpdatingLocation(true);
    try {
      const location = await requestLocation();
      if (!location) return;

      const result = await updateLocation(
        location.coords.latitude,
        location.coords.longitude,
      );

      if (!result.success) {
        setLocationErrorMessage("Error updating location");
        return;
      }

      await fetchProfile();
      setEditingItem("none");
    } catch (error) {
      console.log(error);
      setLocationErrorMessage("Error updating location");
    } finally {
      setUpdatingLocation(false);
    }
  };

  useEffect(() => {
    if (editingItem === "none" && profileLoaded) {
      setEditingItemValue("");
      if (!profile) return;

      // Check if any field contains 'file://'
      if (hasFilePrefix(profile)) {
        console.log("Profile contains 'file://' prefix. Update aborted.");
        return; // Exit without updating
      }

      updateProfile(profile);
      return;
    }

    const value = getEditingItemValue();
    setEditingItemValue(value);
  }, [editingItem, profile]);

  function hasFilePrefix(profile: Profile): boolean {
    const imageFields: (keyof Profile)[] = [
      "image1",
      "image2",
      "image3",
      "image4",
    ];

    return imageFields.some((field) => {
      const value = profile[field];
      return (
        typeof value === "string" &&
        value.length > 0 &&
        value.startsWith("file://")
      );
    });
  }

  const fetchProfile = async () => {
    const profile = await getProfile("me");

    if (profile) {
      setProfile(profile);
      updateStoredProfile(profile);
      setProfileLoaded(true);
    }
  };

  const pickImage = async (): Promise<ImagePicker.ImagePickerAsset | null> => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      return result.assets[0];
    }

    return null;
  };

  const handlePickImage = async (imageNum: number) => {
    if (!profile || !session) return;

    try {
      const image = await pickImage();
      if (!image) return;
      if (!image.uri) return;

      // Update the loading state for this image
      const updatedImages = [...images];
      const index = imageNum - 1;
      updatedImages[index] = { ...updatedImages[index], isLoading: true };
      setImages(updatedImages);

      // Update profile with local image URI
      let updatedProfile: Profile = {
        ...profile,
        [`image${imageNum}`]: image.uri,
      };
      setProfile(updatedProfile);

      console.log("Uploading image");
      const uploadFileResult = await uploadFile(image, session.session_token);

      if (!uploadFileResult || !uploadFileResult.url) {
        console.log("Error with upload result");
        setProfile(profile);
        updatedImages[index] = { ...updatedImages[index], isLoading: false };
        setImages(updatedImages);
        return;
      }

      // Update with the server URL
      setProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          [`image${imageNum}`]: uploadFileResult.url,
        };
      });

      // Update images state with the server URL
      const finalUpdatedImages = [...updatedImages];
      finalUpdatedImages[index] = {
        ...finalUpdatedImages[index],
        uri: uploadFileResult.url,
        isLoading: false,
      };
      setImages(finalUpdatedImages);
    } catch (error) {
      console.log("Error uploading image: ", error);
      // Reset loading state
      const updatedImages = [...images];
      const index = imageNum - 1;
      updatedImages[index] = { ...updatedImages[index], isLoading: false };
      setImages(updatedImages);
    }
  };

  useEffect(() => {
    if (!navigation.isFocused) return;

    fetchProfile();
  }, [navigation.isFocused]);

  if (!profile) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: mainBackgroundColor,
        }}
      >
        <LoadingIndicator size={36} />
      </View>
    );
  }

  // Render an image item for the grid
  const renderItem = (item: ImageItem, index: number) => {
    // Check how many images have content
    const imagesWithContent = images.filter((img) => img.uri !== null);
    const showDeleteButton = imagesWithContent.length > 1;

    // Find the first empty position
    const firstEmptyIndex = images.findIndex((img) => img.uri === null);
    const isNextEmptyPosition = firstEmptyIndex === index;

    return (
      <View style={styles.gridImageContainer}>
        {item.isLoading && <ImageSavingIndicator />}

        {item.uri ? (
          <>
            <TouchableOpacity
              style={{ width: "100%", height: "100%" }}
              onPress={() => handlePickImage(index + 1)}
            >
              <Image source={{ uri: item.uri }} style={styles.gridImage} />
            </TouchableOpacity>

            {showDeleteButton && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteImage(item.key)}
              >
                <X size={16} color="white" />
              </TouchableOpacity>
            )}
          </>
        ) : isNextEmptyPosition ? (
          <TouchableOpacity
            onPress={() => handlePickImage(index + 1)}
            style={styles.emptyImageContainer}
          >
            <FontAwesome name="camera" size={24} color="gray" />
          </TouchableOpacity>
        ) : (
          <View style={[styles.emptyImageContainer, { opacity: 0.3 }]} />
        )}
      </View>
    );
  };

  return (
    <View
      style={{
        backgroundColor: mainBackgroundColor,
        flex: 1,
      }}
    >
      <Modal
        transparent={true}
        visible={editingItem !== "none"}
        animationType="slide"
        onRequestClose={() => setEditingItem("none")}
      >
        <View
          style={{
            flex: 1,
            flexDirection: "column",
            justifyContent: "flex-end",
            alignItems: "flex-end",
          }}
        >
          <Pressable
            style={{
              flex: 1,
              width: "100%",
              flexDirection: "column",
              justifyContent: "flex-end",
              alignItems: "flex-end",
            }}
            onPress={() => {
              setEditingItem("none");
            }}
          >
            <KeyboardAvoidingView
              style={{
                backgroundColor: "#171717",
                padding: 20,
                width: "100%",
                height: height * 0.55,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
              }}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              // keyboardVerticalOffset={Platform.OS === "ios" ? 112 : 0}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontWeight: "bold",
                    fontSize: 18,
                    marginBottom: 10,
                  }}
                >
                  {capitalize(editingItem)}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setEditingItem("none");
                  }}
                >
                  <Text style={{ color: "white" }}>Close</Text>
                </TouchableOpacity>
              </View>

              {editingItem === "location" ? (
                <>
                  {locationErrorMessage ? (
                    <Text>{locationErrorMessage}</Text>
                  ) : (
                    <>
                      {locationServiceEnabled ? (
                        <TouchableOpacity
                          onPress={handleUpdateLocation}
                          style={[
                            styles.updateLocationButton,
                            {
                              backgroundColor: updatingLocation
                                ? "#4b5563"
                                : mainPurple,
                            },
                          ]}
                          disabled={updatingLocation}
                        >
                          <Text style={styles.updateLocationButtonText}>
                            Update Location
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={{ color: "white" }}>
                          Location services are disabled
                        </Text>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  {editingItem === "education" ? (
                    <EducationPicker
                      value={profile.education as Education}
                      onChange={(education) => {
                        setProfile({ ...profile, education });
                      }}
                    />
                  ) : (
                    <TextInput
                      value={editingItemValue}
                      onChangeText={(text) => handleChangeEditingItemText(text)}
                      autoFocus={true}
                      style={{
                        backgroundColor: "#0a0a0a",
                        padding: 10,
                        borderRadius: 10,
                        color: "white",
                      }}
                      placeholder={capitalize(editingItem)}
                      placeholderTextColor={"#9ca3af"}
                      multiline={editingItemMultilineInput}
                    />
                  )}
                </>
              )}
            </KeyboardAvoidingView>
          </Pressable>
        </View>
      </Modal>

      {/* Add tab navigation at the top */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "edit" ? styles.activeTab : null,
          ]}
          onPress={() => setActiveTab("edit")}
        >
          <Text style={styles.tabButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "preview" ? styles.activeTab : null,
          ]}
          onPress={() => setActiveTab("preview")}
        >
          <Text style={styles.tabButtonText}>Preview</Text>
        </TouchableOpacity>
      </View>

      {activeTab === "edit" ? (
        // Original edit view
        <ScrollView style={{ position: "relative" }}>
          <View style={styles.container}>
            {/* Image Grid */}
            <View style={styles.imagesGridContainer}>
              <DraggableGrid
                numColumns={2}
                renderItem={renderItem}
                data={images}
                onDragRelease={handleReorder}
                style={styles.grid}
              />
            </View>

            {/* Profile Name */}
            <View style={styles.infoItemContainer}>
              <View style={styles.infoItem}>
                <Text
                  style={{
                    color: "white",
                    fontSize: 20,
                    fontWeight: "bold",
                  }}
                >
                  {profile.name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setEditingItem("name");
                }}
              >
                <FontAwesome6 name="pencil" size={14} color="white" />
              </TouchableOpacity>
            </View>

            {/* Bio Section */}
            <View style={styles.info}>
              <View style={styles.infoItemContainer}>
                <View style={styles.infoItem}>
                  <NotepadText size={18} color="white" />
                  <Text style={styles.bio}>{profile.bio}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setEditingItem("bio");
                  }}
                  style={styles.infoItemEditButton}
                >
                  <FontAwesome6 name="pencil" size={14} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Other Profile Info */}
            <View style={styles.info}>
              {/* Age */}
              <View style={styles.infoItem}>
                <Cake size={18} color="white" />
                <Text style={globalStyles.regularText}>
                  {(() => {
                    const today = new Date();
                    const birthDate = new Date(profile.date_of_birth);
                    let age = today.getFullYear() - birthDate.getFullYear();
                    const monthDiff = today.getMonth() - birthDate.getMonth();
                    if (
                      monthDiff < 0 ||
                      (monthDiff === 0 && today.getDate() < birthDate.getDate())
                    ) {
                      age--;
                    }
                    return `${age} years old`;
                  })()}
                </Text>
              </View>

              {/* Location */}
              <View style={styles.infoItemContainer}>
                <View style={styles.infoItem}>
                  <MapPin size={18} color="white" />
                  <Text style={globalStyles.regularText}>
                    {profile.city || "No City"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setEditingItem("location");
                  }}
                >
                  <FontAwesome6 name="pencil" size={14} color="white" />
                </TouchableOpacity>
              </View>

              {/* Education */}
              <View style={styles.infoItemContainer}>
                <View style={styles.infoItem}>
                  <Book size={18} color="white" />
                  <Text style={globalStyles.regularText}>
                    {profile.education || "No Education"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setEditingItem("education");
                  }}
                >
                  <FontAwesome6 name="pencil" size={14} color="white" />
                </TouchableOpacity>
              </View>

              {/* Occupation */}
              <View style={styles.infoItemContainer}>
                <View style={styles.infoItem}>
                  <BriefcaseBusiness size={18} color="white" />
                  <Text style={globalStyles.regularText}>
                    {profile.occupation || "No Occupation"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setEditingItem("occupation");
                  }}
                >
                  <FontAwesome6 name="pencil" size={14} color="white" />
                </TouchableOpacity>
              </View>

              {/* Interests */}
              <View style={styles.infoItemContainer}>
                <View style={styles.infoItem}>
                  <MessageSquareHeart size={18} color="white" />
                  <Text style={globalStyles.regularText}>
                    {profile.interests || "No Interests"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setEditingItem("interests");
                  }}
                >
                  <FontAwesome6 name="pencil" size={14} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      ) : (
        // Preview view using ProfileCard
        <ScrollView style={{ padding: 20 }}>
          {profile && (
            <ProfileCard
              profile={profile}
              onBlock={() => {}}
              showOptionButton={false}
            />
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: mainBackgroundColor,
    gap: 20,
  },
  profileImage: {
    width: "100%",
    height: width - 20,
    borderRadius: 10,
  },
  imagePickerButton: {
    backgroundColor: "#1b1a1c",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: width - 20,
  },
  imagesGridContainer: {
    width: "100%",
    marginBottom: 20,
  },
  grid: {
    flex: 1,
    marginBottom: 10,
  },
  gridImageContainer: {
    width: (width - 50) / 2,
    height: (width - 50) / 2,
    margin: 5,
    borderRadius: 10,
    position: "relative",
    overflow: "hidden",
  },
  gridImage: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  emptyImageContainer: {
    width: "100%",
    height: "100%",
    backgroundColor: "#1b1a1c",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "white",
  },
  emptyItemText: {
    color: "#4b5563",
  },
  bio: {
    fontSize: 16,
    textAlign: "left",
    color: "white",
  },
  info: {
    backgroundColor: secondaryBackgroundColor,
    padding: 15,
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderRadius: 10,
    gap: 25,
  },
  infoItemContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
    width: "100%",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    maxWidth: width - 125,
  },
  infoItemEditButton: {
    flex: 0,
  },
  regularText: {
    color: "white",
    fontSize: 16,
  },
  backContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backText: {
    color: "white",
    fontSize: 14,
    marginLeft: 10,
  },
  textInput: {
    color: "white",
    padding: 10,
    backgroundColor: "#262626",
    flex: 1,
    borderRadius: 10,
  },
  updateLocationButton: {
    width: "100%",
    backgroundColor: mainPurple,
    borderRadius: 25,
    marginTop: 20,
  },
  updateLocationButtonText: {
    color: "white",
    fontSize: 16,
    padding: 15,
    textAlign: "center",
    fontWeight: "bold",
  },
  tabContainer: {
    marginTop: 8,
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderBottomWidth: 2,
  },
  activeTab: {
    borderBottomColor: mainPurple,
  },
  tabButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
