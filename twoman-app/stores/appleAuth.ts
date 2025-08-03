import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, devtools, createJSONStorage } from 'zustand/middleware';

interface UserState {
    userId: number | null;
    updateUser: (userId: number | null) => void;
}

const useUserStore = create<UserState>()(
    devtools(
        persist(
            (set) => ({
                userId: 0,
                updateUser: (newUserId: number | null) => set({ userId: newUserId }),
            }),
            {
                name: 'userStore',
                storage: createJSONStorage(() => AsyncStorage),
            }
        ),
        { name: 'userStore' }
    )
);

export default useUserStore;