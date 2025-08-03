import {Stack, useLocalSearchParams, useRouter} from "expo-router";
import {TouchableOpacity} from "react-native";
import {ChevronLeft} from "lucide-react-native";
import {mainPurple} from "@/constants/globalStyles";

export default function Layout() {
    const params = useLocalSearchParams();
    const router = useRouter();

    const commonHeaderOptions = {
        headerTintColor: mainPurple,
        headerShadowVisible: false, // This removes the bottom border
        headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
                <ChevronLeft size={24} color={mainPurple}/>
            </TouchableOpacity>
        ),
    };

    return (
        <Stack>
            <Stack.Screen
                name="index"
                options={{
                    title: params.screenTitle as string,
                    ...commonHeaderOptions
                }}
            />
            <Stack.Screen
                name="settings"
                options={{
                    title: "Match Settings",
                    ...commonHeaderOptions
                }}
            />
        </Stack>
    );
}
