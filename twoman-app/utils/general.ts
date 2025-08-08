import * as Application from "expo-application";
import Constants from "expo-constants";

export const API_URL = `${process.env.EXPO_PUBLIC_HTTP_PROTOCOL}://${process.env.EXPO_PUBLIC_BASE_API_URL}/${process.env.EXPO_PUBLIC_API_VERSION}`;

// Get version with fallback chain for production builds
export const APP_VERSION =
  Application.nativeApplicationVersion ?? Constants.expoConfig?.version;

export const CLIENT_VERSION = APP_VERSION;
