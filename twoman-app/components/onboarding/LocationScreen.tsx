import { OnboardScreenProps } from "@/app/(app)/onboard";
import {
  LocationObject,
  LocationPermissionResponse,
  getCurrentPositionAsync,
  getForegroundPermissionsAsync,
  requestForegroundPermissionsAsync,
} from "expo-location";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  AppStateStatus,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { globalStyles, mainPurple } from "../../constants/globalStyles";

export default function LocationPicker({
  onNext,
  onValueChange,
  value,
}: OnboardScreenProps<LocationObject | null>) {
  const [locationStatus, setLocationStatus] =
    useState<LocationPermissionResponse>();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const appState = useRef(AppState.currentState);
  const [, setAppStateVisible] = useState(appState.current);

  const checkLocationPermission = useCallback(async () => {
    const status = await getForegroundPermissionsAsync();
    setLocationStatus(status);
    return status;
  }, []);

  const requestLocationPermission = useCallback(async () => {
    // First check current status
    const currentStatus = await getForegroundPermissionsAsync();

    // If permission can still be requested
    if (currentStatus.canAskAgain) {
      const { status } = await requestForegroundPermissionsAsync();
      setLocationStatus({
        status,
        canAskAgain: status !== "granted",
        granted: status === "granted",
        expires: "never",
      });

      if (status !== "granted") {
        // Permission was denied, but don't automatically open settings
        // Let user choose to open settings explicitly
      }

      return status === "granted";
    } else {
      // Can't ask again, but don't automatically open settings
      // Let user choose to open settings explicitly
      return false;
    }
  }, []);

  const handleAppStateChange = useCallback(
    async (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        await checkLocationPermission();
      }

      appState.current = nextAppState;
      setAppStateVisible(appState.current);
    },
    [checkLocationPermission],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    return () => {
      subscription.remove();
    };
  }, [handleAppStateChange]);

  const requestLocation = useCallback(async () => {
    let status = await checkLocationPermission();

    if (!status.granted) {
      const granted = await requestLocationPermission();
      if (!granted) {
        setErrorMsg(
          "Location permission denied. Please enable it in settings.",
        );
        return;
      }
    }

    try {
      let location = await getCurrentPositionAsync({});
      onValueChange(location);
      onNext();
    } catch (error) {
      setErrorMsg("Failed to get location. Please try again.");
    }
  }, [
    checkLocationPermission,
    requestLocationPermission,
    onValueChange,
    onNext,
  ]);

  useEffect(() => {
    if (!value) requestLocation();
  }, [requestLocation]);

  const openSettings = async () => {
    await Linking.openURL('app-settings:');
  };

  if (!locationStatus && !value) {
    return (
      <Text style={{ color: "white", textAlign: "center" }}>
        Checking permissions...
      </Text>
    );
  }

  return (
    <View style={{ padding: 20, gap: 40 }}>
      {!value && locationStatus ? (
        <>
          {errorMsg ? (
            <View style={{ gap: 10, alignItems: "center" }}>
              <Text style={{ color: "white", textAlign: "center" }}>
                {errorMsg}
              </Text>
              <View style={{ gap: 10, width: "100%" }}>
                {!locationStatus.granted && (
                  <TouchableOpacity
                    onPress={openSettings}
                    style={globalStyles.onboardingNextButton}
                  >
                    <Text style={globalStyles.onBoardingNextButtonText}>
                      Open Settings
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            <View style={{ gap: 10, alignItems: "center" }}>
              <Text style={{ color: "white", textAlign: "center" }}>
                Getting your location...
              </Text>
            </View>
          )}
        </>
      ) : (
        <TouchableOpacity
          onPress={onNext}
          style={[globalStyles.onboardingNextButton]}
          disabled={!value}
        >
          <Text style={[globalStyles.onBoardingNextButtonText]}>Next</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  requestLocationButton: {
    backgroundColor: "black",
    padding: 10,
    borderRadius: 5,
    marginTop: 20,
  },
  requestLocationButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  nextButton: {
    backgroundColor: "black",
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
