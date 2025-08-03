import { Profile } from "@/types/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, devtools, createJSONStorage } from "zustand/middleware";

interface ProfileState {
  profile: Profile | null;
  updateProfile: (profile: Profile) => void;
}

const profileStore = create<ProfileState>()(
  devtools(
    persist(
      (set) => ({
        profile: null,
        updateProfile: (profile: Profile | null) => set({ profile }),
      }),
      {
        name: "userStore",
        storage: createJSONStorage(() => AsyncStorage),
      }
    ),
    { name: "userStore" }
  )
);

export default profileStore;
