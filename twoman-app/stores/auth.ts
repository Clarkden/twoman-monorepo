import { SessionData } from "@/types/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

import { createJSONStorage, persist } from "zustand/middleware";

type AppleInfoStore = {
  id: string | null;
  name: string | null;
  setAppleInfo: (id: string | null, name: string | null) => void;
};

export const useAppleInfo = create(
  persist<AppleInfoStore>(
    (set) => ({
      id: null,
      name: null,
      setAppleInfo: async (id, name) => {
        set(() => ({
          id,
          name,
        }));
      },
    }),
    {
      name: "apple-info-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

type GoogleInfoStore = {
  id: string | null;
  name: string | null;
  setGoogleInfo: (id: string | null, name: string | null) => void;
};

export const useGoogleInfo = create(
  persist<GoogleInfoStore>(
    (set) => ({
      id: null,
      name: null,
      setGoogleInfo: async (id, name) => {
        set(() => ({
          id,
          name,
        }));
      },
    }),
    {
      name: "google-info-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

type SessionStore = {
  session: SessionData | null;
  setSession: (session: SessionData | null) => void;
  logout: () => void;
};

export const useSession = create(
  persist<SessionStore>(
    (set) => ({
      session: null,
      setSession: async (session) => {
        set(() => ({
          session: session,
        }));
      },
      logout: async () => {
        set(() => ({
          session: null,
        }));
      },
    }),
    {
      name: "session-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export async function setStorageItemAsync(key: string, value: string | null) {
  if (value == null) {
    await SecureStore.deleteItemAsync(key);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}
