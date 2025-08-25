import { SessionData } from "@/types/api";
import * as AppleAuthentication from "expo-apple-authentication";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import apiFetch from "./fetch";
import { useSession } from "@/stores/auth";

export const LoginWithApple = async (): Promise<{
  sessionData: SessionData | null;
  appleUserId: string | null;
  appleUserName: string | null;
}> => {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error("No identity token received from Apple");
    }

    const response = await apiFetch<SessionData>("/auth/apple", {
      method: "POST",
      body: JSON.stringify({
        identity_token: credential.identityToken,
        user_id: credential.user,
        email: credential.email,
      }),
      headers: { "Content-Type": "application/json" },
    });

    let name = "";

    if (credential.fullName?.givenName) {
      name = credential.fullName?.givenName;
    }

    if (response.success) {
      return {
        sessionData: response.data,
        appleUserId: credential.user,
        appleUserName: name,
      };
    } else {
      throw new Error("Failed to authenticate with the server");
    }
  } catch (error: any) {
    if (error.code === "ERR_REQUEST_CANCELED") {
      console.log("User canceled the sign-in flow");
    } else {
      console.error("Apple sign in error", error);
    }
    return { sessionData: null, appleUserId: null, appleUserName: null };
  }
};

export const RefreshSession = async () => {
  try {
    const currentSession = useSession.getState().session;
    console.log("DEBUG: Attempting session refresh...");
    console.log("DEBUG: Current session data:", {
      hasSession: !!currentSession,
      hasRefreshToken: !!currentSession?.refresh_token,
      refreshTokenLength: currentSession?.refresh_token?.length,
      userId: currentSession?.user_id,
    });

    const response = await apiFetch<SessionData>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({
        refresh_token: currentSession?.refresh_token,
      }),
      headers: { "Content-Type": "application/json" },
    });

    console.log("DEBUG: Refresh response:", {
      success: response.success,
      hasData: !!response.data,
      error: response.success ? null : response,
    });

    if (response.success) {
      useSession.setState({
        session: response.data,
      });
      console.log("DEBUG: Session refresh successful, new session saved");
      return true;
    } else {
      console.log(
        "DEBUG: Session refresh failed - server returned unsuccessful response",
      );
    }
  } catch (error) {
    console.error("Failed to refresh session:", error);
  }

  return false;
};

export const LoginWithGoogle = async (): Promise<{
  sessionData: SessionData | null;
  googleUserId: string | null;
  googleUserName: string | null;
}> => {
  try {
    // Configure Google Sign-In (this should ideally be done once at app startup)
    console.log("DEBUG: Configuring Google Sign-In");
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, // From Google Cloud Console
      offlineAccess: false,
    });
    console.log("DEBUG: Checking if device supports Google Play services");
    // Check if device supports Google Play services
    await GoogleSignin.hasPlayServices();

    console.log("DEBUG: Signing in with Google");
    // Sign in with Google
    const userInfo = await GoogleSignin.signIn();

    console.log("DEBUG: Google sign in request sent");
    if (!userInfo.data?.idToken) {
      throw new Error("No ID token received from Google");
    }
    console.log("DEBUG: Google sign in response received");

    console.log("DEBUG: Sending Google sign in response to server");
    const response = await apiFetch<SessionData>("/auth/google", {
      method: "POST",
      body: JSON.stringify({
        id_token: userInfo.data.idToken,
        email: userInfo.data.user.email,
      }),
      headers: { "Content-Type": "application/json" },
    });
    console.log("DEBUG: Google sign in response sent to server");

    console.log("RESPONSE", response);

    if (response.success) {
      return {
        sessionData: response.data,
        googleUserId: userInfo.data.user.id,
        googleUserName: userInfo.data.user.name || userInfo.data.user.givenName,
      };
    } else {
      throw new Error("Failed to authenticate with the server");
    }
  } catch (error: any) {
    console.log("DEBUG: Google sign in error", error);
    if (error.code === "SIGN_IN_CANCELLED") {
      console.log("User canceled Google sign-in");
    } else if (error.code === "PLAY_SERVICES_NOT_AVAILABLE") {
      console.log("Google Play services not available");
    } else {
      console.error("Google sign in error", error);
    }
    return { sessionData: null, googleUserId: null, googleUserName: null };
  }
};
