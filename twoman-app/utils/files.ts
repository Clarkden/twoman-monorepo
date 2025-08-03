import { ImagePickerAsset } from "expo-image-picker";
import { API_URL } from "./general";
import { ApiResponse } from "@/types/api";
import * as FileSystem from "expo-file-system";
import { UploadFileResponse } from "@/types/file";
import { Alert } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";

const fetchImageFromUri = async (uri: string): Promise<Blob | null> => {
  try {
    const response = await fetch(uri);
    return await response.blob();
  } catch (error) {
    console.error("Error fetching image from uri:", error);
  }
  return null;
};

export const uploadFile = async (
  file: ImagePickerAsset,
  session: string
): Promise<UploadFileResponse | null> => {
  try {
    const processedImage = await ImageManipulator.manipulateAsync(
      file.uri,
      [{ resize: { width: 500, height: 500 } }],
      { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
    );

    if (!processedImage) {
      console.error("Error processing image");
      return null;
    }

    const img = await fetchImageFromUri(processedImage.uri);

    if (!img) {
      console.error("Error fetching image from uri");
      return null;
    }
    const result = await FileSystem.uploadAsync(
      API_URL + "/file/upload",
      file.uri,
      {
        httpMethod: "POST",
        headers: {
          Authorization: "Bearer " + session,
        },
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: "file",
      }
    );

    const data = JSON.parse(result.body) as ApiResponse;

    if (!data.success) {
      Alert.alert("Error uploading file: " + data.error);
      console.error(
        "Error uploading file: " + data.error,
        " Status: " + data.code
      );
      return null;
    }

    return data.data as UploadFileResponse;
  } catch (error) {
    console.error("Error during file upload:", error);
  }

  return null;
};
