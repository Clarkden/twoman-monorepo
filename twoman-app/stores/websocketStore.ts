import { create } from "zustand";
import { AppState } from "react-native";
import { SocketAuthorizationData, SocketMessage } from "@/types/socket";
import { CLIENT_VERSION } from "@/utils/general";
import { useSession } from "@/stores/auth";
import { messageHandler } from "@/utils/websocket";
import { RefreshSession } from "@/utils/auth";
import {
  wsValidator,
  createAuthMessage,
  isWebSocketResponse,
  isConnectionSuccess,
  isConnectionFailed,
} from "@/utils/websocket-validator";
import type {
  WebSocketEnvelope,
  WebSocketResponse,
  ValidatedMessage,
} from "@/types/generated/websocket-types";

type ConnectionStatus = "connected" | "disconnected" | "connecting";

type WebSocketStore = {
  ws: WebSocket | null;
  connectionStatus: ConnectionStatus;

  reconnectAttempts: number;
  reconnectScheduled: boolean;
  isRefreshing: boolean;
  connectTimeoutId: NodeJS.Timeout | null;

  // Heart-beat & liveness tracking
  healthCheckTimer: NodeJS.Timeout | null;
  lastPong: number | null;

  // NEW: store queued messages
  messageQueue: any[];

  connect: () => void;
  disconnect: () => void;

  // changed signature to either typed or generic. using generic for brevity
  sendMessage: (message: any) => void;
  sendValidatedMessage: <T>(message: ValidatedMessage<T>) => void;
  backoffReconnect: () => void;

  startHealthCheck: () => NodeJS.Timeout;
  stopHealthCheck: () => void;

  // Manual retry method for UI to trigger
  manualRetry: () => void;

  // Flag once we've tried MAX_RECONNECT_ATTEMPTS without success
  retriesExhausted: boolean;
};

// Maximum reconnection attempts before we give up and surface an error UI
const MAX_RECONNECT_ATTEMPTS = 3;

export const useWebSocketStore = create<WebSocketStore>((set, get) => ({
  ws: null,
  connectionStatus: "disconnected",
  reconnectAttempts: 0,
  reconnectScheduled: false,
  isRefreshing: false,
  connectTimeoutId: null,

  // Heart-beat state
  healthCheckTimer: null,
  lastPong: null,

  // NEW: initialize queue
  messageQueue: [],

  // Flag once we've tried MAX_RECONNECT_ATTEMPTS without success
  retriesExhausted: false,

  connect: () => {
    const { session } = useSession.getState();
    const userId = session?.user_id;
    const { ws, connectionStatus, reconnectScheduled, connectTimeoutId } =
      get();

    console.log("DEBUG: connect() called");
    console.log("DEBUG: Session state at connect time:", {
      hasSession: !!session,
      userId: userId,
      hasSessionToken: !!session?.session_token,
      hasRefreshToken: !!session?.refresh_token,
      sessionTokenLength: session?.session_token?.length,
      refreshTokenLength: session?.refresh_token?.length,
    });

    // If no session or user, skip
    if (!session || !userId) {
      console.log("connect() called but no session or user. Skipping.");
      return;
    }

    // If the socket is open or connecting, skip
    if (
      ws &&
      (ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING)
    ) {
      console.log("WebSocket is already open/connecting. Skipping connect().");
      return;
    }

    // If we are already in connecting state, skip
    if (connectionStatus === "connecting") {
      console.log("Already in 'connecting' status. Skipping connect().");
      return;
    }

    // DEBUG: Test if session token works for regular API calls before WebSocket
    console.log("DEBUG: Testing session token with regular API call first...");
    fetch(`${process.env.EXPO_PUBLIC_API_URL}/user/profile`, {
      headers: {
        Authorization: `Bearer ${session.session_token}`,
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        console.log(
          "DEBUG: Session token test response status:",
          response.status,
        );
        if (response.status === 200) {
          console.log(
            "DEBUG: Session token works for HTTP requests - WebSocket server issue",
          );
        } else {
          console.log(
            "DEBUG: Session token doesn't work for HTTP requests either - general session issue",
          );
        }
      })
      .catch((error) => {
        console.log("DEBUG: Session token test failed with error:", error);
      });

    set({ connectionStatus: "connecting" });
    console.log("Attempting to connect WebSocket...");

    try {
      const socket = new WebSocket(
        `${process.env.EXPO_PUBLIC_WS_PROTOCOL}://${process.env.EXPO_PUBLIC_BASE_API_URL}/ws`,
      );

      socket.onopen = () => {
        console.log("WebSocket connection opened");

        // DEBUG: Log the session data being sent
        console.log("DEBUG: Session data:", {
          session_token: session.session_token
            ? `${session.session_token.substring(0, 20)}...`
            : "null",
          user_id: session.user_id,
          version: CLIENT_VERSION,
        });

        // Try to send validated authorization message first
        try {
          const validatedAuth = createAuthMessage({
            session: session.session_token,
            version: CLIENT_VERSION || "",
          });
          console.log("DEBUG: Sending validated auth message:", {
            type: validatedAuth.type,
            hasSession: !!validatedAuth.payload?.session,
            sessionLength: validatedAuth.payload?.session?.length,
          });
          socket.send(JSON.stringify(validatedAuth));
        } catch (error) {
          console.warn(
            "Failed to create validated auth message, falling back to legacy:",
            error,
          );
          // Fall back to legacy format
          const authorization: SocketMessage<SocketAuthorizationData> = {
            type: "authorization",
            data: {
              session: session.session_token,
              version: CLIENT_VERSION || "",
            },
          };
          console.log("DEBUG: Sending legacy auth message:", {
            type: authorization.type,
            hasSession: !!authorization.data.session,
            sessionLength: authorization.data.session?.length,
          });
          socket.send(JSON.stringify(authorization));
        }
      };

      socket.onmessage = async (event) => {
        // Handle non-JSON messages like "pong"
        if (event.data === "pong") {
          set({ lastPong: Date.now() });
          return;
        }

        // Try to parse as JSON
        let message;
        try {
          message = JSON.parse(event.data);
        } catch (error) {
          console.warn("Received non-JSON message:", event.data);
          return;
        }

        // Check if this is a validated WebSocket response
        if (isWebSocketResponse(message)) {
          console.log("Received validated WebSocket response:", message);

          if (message.kind === "ERROR" && message.error) {
            console.error("WebSocket error response:", message.error);
            return;
          }

          if (message.type === "connection_success") {
            console.log("WebSocket connection established (validated).");
            set({
              connectionStatus: "connected",
              reconnectAttempts: 0,
              reconnectScheduled: false,
              healthCheckTimer: get().startHealthCheck(),
              retriesExhausted: false,
            });

            // Flush queued messages
            const { messageQueue } = get();
            if (messageQueue.length > 0) {
              console.log("Flushing queued messages:", messageQueue);
              messageQueue.forEach((msg) => {
                socket.send(JSON.stringify(msg));
              });
              set({ messageQueue: [] });
            }
            return;
          }

          // Forward validated messages to handler
          messageHandler.dispatch(message.type, message.payload || message);
          return;
        }

        // Handle legacy format
        if (message.type === "connection_failed") {
          console.log("DEBUG: Received connection_failed message:", message);
          switch (message.data.code) {
            case "INVALID_SESSION":
            case "INVALID_AUTH_TOKEN":
              console.log("Invalid session/token. Attempting to refresh...");
              if (get().isRefreshing) {
                console.log("Already refreshing. Skipping.");
                return;
              }
              set({ isRefreshing: true });
              const refreshed = await RefreshSession();
              set({ isRefreshing: false });

              if (refreshed) {
                console.log("Session refreshed. Reconnecting...");
                socket.close();
                get().connect();
              } else {
                console.log(
                  "Session refresh failed. Will attempt reconnect after backoff...",
                );
                // Instead of immediately logging out, attempt reconnect which will try again
                socket.close(); // This will trigger onclose -> backoffReconnect
                // Only log out after max attempts are exhausted (handled by backoffReconnect)
              }
              break;

            case "INVALID_MESSAGE_TYPE":
              console.error("Invalid message type sent.");
              break;

            case "INVALID_AUTH_DATA":
              console.error("Invalid authorization data.");
              break;

            default:
              console.error(
                "Unknown connection failure:",
                message.data.message,
              );
              break;
          }
        } else if (message.type === "connection_success") {
          console.log("WebSocket connection established.");
          set({
            connectionStatus: "connected",
            reconnectAttempts: 0,
            reconnectScheduled: false,
            // Start / reset heartbeat
            healthCheckTimer: get().startHealthCheck(),
            retriesExhausted: false,
          });

          // Flush the queued messages once we get a connection_success
          const { messageQueue } = get();
          if (messageQueue.length > 0) {
            console.log("Flushing queued messages:", messageQueue);
            messageQueue.forEach((msg) => {
              socket.send(JSON.stringify(msg));
            });
            set({ messageQueue: [] });
          }
        } else {
          // Forward to a handler that dispatches by type
          messageHandler.dispatch(message.type, message.data);
        }
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        // Mark as disconnected so UI can react
        set({ connectionStatus: "disconnected" });
        // Attempt reconnect if not already scheduled
        if (!get().reconnectScheduled) {
          get().backoffReconnect();
        }
      };

      socket.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason);
        // Clean up heartbeat timer and update status
        get().stopHealthCheck();
        set({ connectionStatus: "disconnected" });
        // Only attempt to reconnect automatically if user is still logged in
        const { session: latestSession } = useSession.getState();
        const latestUserId = latestSession?.user_id;
        if (
          AppState.currentState === "active" &&
          latestSession &&
          latestUserId
        ) {
          get().backoffReconnect();
        } else {
          console.log(
            "Not reconnecting because app is background or user is logged out.",
          );
        }
      };

      set({ ws: socket });
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      set({ connectionStatus: "disconnected" });
      // Attempt reconnect if not already scheduled
      if (!get().reconnectScheduled) {
        get().backoffReconnect();
      }
    }
  },

  disconnect: () => {
    const { ws } = get();
    if (ws) {
      console.log("Disconnecting WebSocket...");
      ws.close();
    }
    // Ensure we stop the heartbeat interval when manually disconnecting
    get().stopHealthCheck();
    set({
      ws: null,
      connectionStatus: "disconnected",
      reconnectAttempts: 0,
      reconnectScheduled: false,
      connectTimeoutId: null,
      isRefreshing: false,
      // Clear queue on disconnect if you want; or leave it for next connect
      messageQueue: [],
      healthCheckTimer: null,
      lastPong: null,
      retriesExhausted: false,
    });
  },

  // Adjusted sendMessage method
  sendMessage: (message) => {
    const { ws, connectionStatus, messageQueue } = get();

    // If already open and connected, send immediately.
    if (
      ws &&
      connectionStatus === "connected" &&
      ws.readyState === WebSocket.OPEN
    ) {
      ws.send(JSON.stringify(message));
    } else {
      // Otherwise queue the message, and ensure we start a connect attempt
      console.warn("WebSocket is not open. Queuing message:", message);
      set({ messageQueue: [...messageQueue, message] });

      // If not connecting yet, let's call connect
      if (connectionStatus !== "connecting") {
        get().connect();
      }
    }
  },

  // New validated message sending method
  sendValidatedMessage: <T>(message: ValidatedMessage<T>) => {
    const { ws, connectionStatus, messageQueue } = get();

    console.log("Sending validated message:", message);

    // If already open and connected, send immediately.
    if (
      ws &&
      connectionStatus === "connected" &&
      ws.readyState === WebSocket.OPEN
    ) {
      ws.send(JSON.stringify(message));
    } else {
      // Otherwise queue the message, and ensure we start a connect attempt
      console.warn(
        "WebSocket is not open. Queuing validated message:",
        message,
      );
      set({ messageQueue: [...messageQueue, message] });

      // If not connecting yet, let's call connect
      if (connectionStatus !== "connecting") {
        get().connect();
      }
    }
  },

  backoffReconnect: () => {
    const {
      reconnectAttempts,
      reconnectScheduled,
      isRefreshing,
      connectionStatus,
    } = get();
    const { session } = useSession.getState();
    const userId = session?.user_id;

    console.log(
      `[backoffReconnect] Attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS}, scheduled: ${reconnectScheduled}, refreshing: ${isRefreshing}, status: ${connectionStatus}`,
    );

    if (!session || !userId) {
      console.log("No session or user. Stopping reconnection attempts.");
      set({
        connectionStatus: "disconnected",
        reconnectAttempts: 0,
        reconnectScheduled: false,
      });
      return;
    }

    if (isRefreshing) {
      console.log("Currently refreshing. Skipping reconnection attempt.");
      return;
    }

    if (connectionStatus === "connected") {
      console.log("Already connected. Skipping reconnection.");
      return;
    }

    // If we've exceeded the max attempts, give up and surface the error.
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.warn("Max websocket reconnection attempts exhausted.");
      set({ retriesExhausted: true, connectionStatus: "disconnected" });
      return;
    }

    if (!reconnectScheduled) {
      // Exponential backoff: min(1000 * 2^attempts, 30000)
      const backoffTime = Math.min(1000 * 2 ** reconnectAttempts, 30000);
      console.log(
        `[backoffReconnect] Scheduling reconnection attempt #${reconnectAttempts + 1} in ${
          backoffTime / 1000
        } seconds...`,
      );
      set({
        reconnectAttempts: reconnectAttempts + 1,
        reconnectScheduled: true,
      });
      setTimeout(() => {
        console.log(
          `[backoffReconnect] Executing scheduled reconnection attempt #${get().reconnectAttempts}`,
        );
        set({ reconnectScheduled: false });
        get().connect();
      }, backoffTime);
    } else {
      console.log(
        "[backoffReconnect] Reconnection already scheduled, skipping.",
      );
    }
  },

  // ---------------------------------
  //  HEART-BEAT / LIVENESS FUNCTIONS
  // ---------------------------------
  startHealthCheck: () => {
    // ping every 30 seconds and make sure we have received a pong within the last 60 s
    const intervalId = setInterval(() => {
      const { ws, connectionStatus, lastPong } = get();

      // If we lost the connection silently (no close event) force a close & reconnect.
      if (
        !ws ||
        ws.readyState !== WebSocket.OPEN ||
        connectionStatus !== "connected"
      ) {
        clearInterval(intervalId);
        set({ healthCheckTimer: null });
        get().backoffReconnect();
        return;
      }

      // Detect stale connection (no pong in > 60s)
      if (lastPong && Date.now() - lastPong > 60_000) {
        console.warn(
          "WebSocket health-check failed – no pong received >60s. Reconnecting…",
        );
        ws.close(); // will trigger onclose → backoffReconnect
        return;
      }

      // Send ping message
      try {
        ws.send(JSON.stringify({ type: "ping", data: {} }));
      } catch (e) {
        console.warn("Failed to send ping. Closing socket…", e);
        ws.close();
      }
    }, 30_000);

    return intervalId;
  },

  stopHealthCheck: () => {
    const { healthCheckTimer } = get();
    if (healthCheckTimer) {
      clearInterval(healthCheckTimer);
      set({ healthCheckTimer: null });
    }
  },

  // Manual retry method for UI to trigger
  manualRetry: () => {
    console.log("Manual retry triggered by user");
    set({
      reconnectAttempts: 0,
      retriesExhausted: false,
      reconnectScheduled: false,
    });
    get().connect();
  },
}));
