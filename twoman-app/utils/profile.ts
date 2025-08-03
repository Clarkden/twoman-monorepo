import { Profile } from "@/types/api";
import apiFetch from "./fetch";
import profileStore from "@/stores/profile";

export const getProfile = async (
  profileId: number | string
): Promise<Profile | null> => {
  try {
    const response = await apiFetch<Profile>("/profile/" + profileId);

    if (response.code !== 200) {
      throw Error(response.error);
    }

    return response.data;
  } catch (error) {
    console.log(error);
  }

  return null;
};

export const updateProfile = async (
  profile: Profile
): Promise<{
  success: boolean;
}> => {
  try {
    const response = await apiFetch("/profile", {
      method: "PATCH",
      body: profile,
    });

    if (response.code !== 200) {
      throw Error(response.error);
    }

    profileStore.getState().updateProfile(profile);
    return { success: true };
  } catch (error) {
    console.log(error);
  }
  return { success: false };
};

export const updateLocation = async (
  lat: number,
  lon: number
): Promise<{ success: boolean }> => {
  try {
    const response = await apiFetch("/profile/location", {
      method: "POST",
      body: {
        lat,
        lon,
      },
    });

    if (!response.success) {
      throw Error(response.error);
    }

    return { success: true };
  } catch (error) {
    console.log(error);
  }

  return { success: false };
};
