import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { BlurView } from "expo-blur";
import LoadingIndicator from "./LoadingIndicator";
import useWebSocket from "@/hooks/useWebsocket";

export const ConnectionStatusOverlay: React.FC = () => {
  const { retriesExhausted, connectionStatus, manualRetry } = useWebSocket();

  // Only show the overlay once we've fully given up retrying.
  if (!retriesExhausted) {
    return null;
  }

  return (
    <BlurView intensity={25} style={styles.overlay}>
      <View style={styles.content}>
        <Text style={styles.title}>Connection Lost</Text>
        <Text style={styles.message}>
          Unable to connect to servers. Please check your internet connection and try again.
        </Text>
        
        {connectionStatus === "connecting" ? (
          <View style={styles.connectingContainer}>
            <LoadingIndicator size={24} />
            <Text style={styles.connectingText}>Reconnecting...</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.retryButton} onPress={manualRetry}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  content: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 12,
    padding: 24,
    margin: 20,
    alignItems: "center",
    maxWidth: 300,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  connectingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  connectingText: {
    fontSize: 14,
    color: "#666",
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
