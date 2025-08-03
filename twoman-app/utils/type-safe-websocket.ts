// Type-safe WebSocket utility functions
// This file demonstrates how to use the new validated WebSocket system

import {
  createChatMessage,
  createMatchMessage,
  createProfileMessage,
  createPingMessage,
} from "@/utils/websocket-validator";
import type {
  ChatMessage,
  MatchActionMessage,
  ProfileDecisionMessage,
} from "@/types/generated/websocket-types";
import useWebSocket from "@/hooks/useWebsocket";

// Helper hook for type-safe WebSocket operations
export function useTypeSafeWebSocket() {
  const { sendValidatedMessage, sendMessage, ...rest } = useWebSocket();

  const sendChatMessage = (matchId: number, message: string) => {
    try {
      const payload: ChatMessage = {
        match_id: matchId,
        message: message.trim(),
      };

      const validatedMessage = createChatMessage(payload);
      sendValidatedMessage(validatedMessage);
    } catch (error) {
      console.error("Failed to send validated chat message:", error);
      // Fall back to legacy format
      sendMessage({
        type: "chat",
        data: { match_id: matchId, message: message.trim() },
      });
    }
  };

  const sendMatchAction = (
    matchId: number,
    action: "accept" | "reject" | "update_target" | "friend_match" | "unmatch",
    targetProfile?: number,
  ) => {
    try {
      const payload: MatchActionMessage = {
        match_id: matchId,
        action,
        ...(targetProfile && { target_profile: targetProfile }),
      };
      const validatedMessage = createMatchMessage(payload);
      sendValidatedMessage(validatedMessage);
    } catch (error) {
      console.error("Failed to send validated match message:", error);
      // Fall back to legacy format
      sendMessage({
        type: "match",
        data: { match_id: matchId, action, target_profile: targetProfile },
      });
    }
  };

  const sendProfileDecision = (
    targetProfile: number,
    decision: "like" | "pass" | "super_like",
    isDuo?: boolean,
    friendProfile?: number,
  ) => {
    try {
      const payload: ProfileDecisionMessage = {
        target_profile: targetProfile,
        decision,
        ...(isDuo !== undefined && { is_duo: isDuo }),
        ...(friendProfile && { friend_profile: friendProfile }),
      };
      const validatedMessage = createProfileMessage(payload);
      sendValidatedMessage(validatedMessage);
    } catch (error) {
      console.error("Failed to send validated profile message:", error);
      // Fall back to legacy format
      sendMessage({
        type: "profile",
        data: {
          target_profile: targetProfile,
          decision,
          is_duo: isDuo,
          friend_profile: friendProfile,
        },
      });
    }
  };

  const sendPing = () => {
    try {
      const validatedMessage = createPingMessage();
      sendValidatedMessage(validatedMessage);
    } catch (error) {
      console.error("Failed to send validated ping message:", error);
      // Fall back to legacy format
      sendMessage({ type: "ping", data: {} });
    }
  };

  return {
    ...rest,
    sendMessage,
    sendValidatedMessage,
    // Type-safe methods
    sendChatMessage,
    sendMatchAction,
    sendProfileDecision,
    sendPing,
  };
}

// Example usage in a component:
/*
import { useTypeSafeWebSocket } from '@/utils/type-safe-websocket';

function ChatComponent({ matchId }: { matchId: number }) {
  const { sendChatMessage, connectionStatus } = useTypeSafeWebSocket();
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() && connectionStatus === 'connected') {
      sendChatMessage(matchId, message);
      setMessage('');
    }
  };

  return (
    <View>
      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder="Type a message..."
      />
      <Button title="Send" onPress={handleSend} />
    </View>
  );
}
*/
