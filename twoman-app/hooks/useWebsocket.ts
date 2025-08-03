import { useWebSocketStore } from "@/stores/websocketStore";
import { useSession } from "@/stores/auth";
import { useEffect } from "react";
import { AppState } from "react-native";

export default function useWebSocket() {
  const connect = useWebSocketStore((state) => state.connect);
  const disconnect = useWebSocketStore((state) => state.disconnect);
  const connectionStatus = useWebSocketStore((state) => state.connectionStatus);
  const retriesExhausted = useWebSocketStore((state) => state.retriesExhausted);
  const sendMessage = useWebSocketStore((state) => state.sendMessage);
  const sendValidatedMessage = useWebSocketStore(
    (state) => state.sendValidatedMessage,
  );
  const manualRetry = useWebSocketStore((state) => state.manualRetry);
  const ws = useWebSocketStore((state) => state.ws);

  const { session } = useSession();

  // Debug logging for state changes
  useEffect(() => {
    console.log(`[useWebSocket] State update:`, {
      connectionStatus,
      hasSession: !!session,
      hasWs: !!ws,
      wsReadyState: ws?.readyState,
      retriesExhausted,
    });
  }, [connectionStatus, session, ws, retriesExhausted]);

  useEffect(() => {
    if (connectionStatus === "disconnected") {
      console.log("[useWebSocket] Websocket not connected.");
      if (session) {
        console.log("[useWebSocket] session & user present => connect()");
        connect();
      } else {
        console.log("[useWebSocket] No session, not connecting");
      }
    } else {
      console.log(
        `[useWebSocket] Connection status is: ${connectionStatus}, not attempting to connect`,
      );
    }
  }, [session, connect, disconnect, connectionStatus]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active" && session) {
        connect();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [session, connect]);

  return {
    connect,
    disconnect,
    connectionStatus,
    retriesExhausted,
    sendMessage,
    sendValidatedMessage,
    manualRetry,
    ws,
  };
}
