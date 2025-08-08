import * as Application from "expo-application";

export const API_URL = `${process.env.EXPO_PUBLIC_HTTP_PROTOCOL}://${process.env.EXPO_PUBLIC_BASE_API_URL}/${process.env.EXPO_PUBLIC_API_VERSION}`;

export const APP_VERSION = Application.nativeApplicationVersion ?? "";

export const CLIENT_VERSION = APP_VERSION;
