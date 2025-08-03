import { OnboardScreenProps, ProfileImages } from "@/app/(app)/onboard";
import { FontAwesome } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { globalStyles, mainPurple } from "../../constants/globalStyles";
import LoadingIndicator from "../LoadingIndicator";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ImagePickerComponent({
  value,
  onValueChange,
  onNext,
}: OnboardScreenProps<ProfileImages>) {
  const [images, setImages] = useState<ProfileImages>(value);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const handlePickImage = async (imageNum: number) => {
    try {
      const image = await pickImage();
      if (!image) return;

      setUploadingIndex(imageNum);

      switch (imageNum) {
        case 1:
          setImages((prev) => ({ ...prev, image1: image }));
          break;
        case 2:
          setImages((prev) => ({ ...prev, image2: image }));
          break;
        case 3:
          setImages((prev) => ({ ...prev, image3: image }));
          break;
        case 4:
          setImages((prev) => ({ ...prev, image4: image }));
          break;
      }

      setUploadingIndex(null);
    } catch (error) {
      console.log("Error uploading image: ", error);
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

  useEffect(() => {
    onValueChange(images);
  }, [images.image1, images.image2, images.image3, images.image4]);

  return (
    <ScrollView>
      <View style={{ padding: 20, gap: 10, paddingBottom: 140 }}>
        <TouchableOpacity
          onPress={() => {
            handlePickImage(1);
          }}
          style={styles.imagePickerButton}
        >
          {uploadingIndex === 1 ? (
            <LoadingIndicator />
          ) : (
            <>
              {images.image1 ? (
                <Image
                  source={{ uri: images.image1.uri }}
                  style={styles.profileImage}
                />
              ) : (
                <Text style={styles.regularText}>
                  <FontAwesome name="camera" size={18} color="gray" />
                </Text>
              )}
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            handlePickImage(2);
          }}
          style={styles.imagePickerButton}
        >
          {uploadingIndex === 1 ? (
            <LoadingIndicator />
          ) : (
            <>
              {images.image2 ? (
                <Image
                  source={{ uri: images.image2.uri }}
                  style={styles.profileImage}
                />
              ) : (
                <Text style={styles.regularText}>
                  <FontAwesome name="camera" size={18} color="gray" />
                </Text>
              )}
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            handlePickImage(3);
          }}
          style={styles.imagePickerButton}
        >
          {uploadingIndex === 3 ? (
            <LoadingIndicator />
          ) : (
            <>
              {images.image3 ? (
                <Image
                  source={{ uri: images.image3.uri }}
                  style={styles.profileImage}
                />
              ) : (
                <Text style={styles.regularText}>
                  <FontAwesome name="camera" size={18} color="gray" />
                </Text>
              )}
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            handlePickImage(4);
          }}
          style={styles.imagePickerButton}
        >
          {uploadingIndex === 4 ? (
            <LoadingIndicator />
          ) : (
            <>
              {images.image4 ? (
                <Image
                  source={{ uri: images.image4.uri }}
                  style={styles.profileImage}
                />
              ) : (
                <Text style={styles.regularText}>
                  <FontAwesome name="camera" size={18} color="gray" />
                </Text>
              )}
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onNext}
          style={[
            globalStyles.onboardingNextButton,
            {
              backgroundColor: !value.image1 ? "transparent" : "black",
            },
          ]}
          disabled={!value.image1}
        >
          <Text
            style={[
              globalStyles.onBoardingNextButtonText,
              {
                color: !value.image1 ? "lightgray" : "white",
              },
            ]}
          >
            Next
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  imagePickerButton: {
    backgroundColor: "rgba(38, 38, 38, 0.5)",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: SCREEN_WIDTH - 20,
  },
  profileImage: {
    width: "100%",
    height: SCREEN_WIDTH - 20,
    borderRadius: 20,
  },
  regularText: {
    color: "white",
    fontSize: 16,
  },
  nextButton: {
    backgroundColor: mainPurple,
    padding: 10,
    borderRadius: 25,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
