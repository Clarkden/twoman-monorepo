import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface LastSeenState {
  lastSeenRecords: Record<number, string>;
  setLastSeen(matchId: number, time: string): void;
}

export const useLastSeenStore = create(
  persist<LastSeenState>(
    (set) => ({
      lastSeenRecords: {},
      setLastSeen: (matchId, time) => {
        set((state) => ({
          lastSeenRecords: {
            ...state.lastSeenRecords,
            [matchId]: time,
          },
        }));
      },
    }),
    {
      name: "lastSeenRecords",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
