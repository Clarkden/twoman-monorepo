import Ajv from 'ajv/dist/2020';
import type { JSONSchemaType } from 'ajv';

// Import schemas
import envelopeSchema from '@/schemas/envelope.json';
import authorizationSchema from '@/schemas/authorization.json';
import chatSchema from '@/schemas/chat.json';
import matchSchema from '@/schemas/match.json';
import profileSchema from '@/schemas/profile.json';
import pingSchema from '@/schemas/ping.json';
import connectionSuccessSchema from '@/schemas/connection_success.json';
import connectionFailedSchema from '@/schemas/connection_failed.json';
import profileResponseSchema from '@/schemas/profile_response.json';

// Import generated types
import type {
  WebSocketEnvelope,
  WebSocketResponse,
  ValidatedMessage,
  AuthorizationMessage,
  ChatMessage,
  MatchActionMessage,
  ProfileDecisionMessage,
  PingMessage,
  ConnectionSuccessMessage,
  ConnectionFailedMessage,
  ProfileResponseMessage,
} from '@/types/generated/websocket-types';

// Simple UUID generator for React Native compatibility
function generateUUID(): string {
  // Generate a simple UUID v4 compatible string
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export class WebSocketValidator {
  private ajv: Ajv;
  private schemas: Map<string, any>;

  constructor() {
    this.ajv = new Ajv();
    this.schemas = new Map();
    this.loadSchemas();
  }

  private loadSchemas() {
    const schemaMap = {
      envelope: envelopeSchema,
      authorization: authorizationSchema,
      chat: chatSchema,
      match: matchSchema,
      profile: profileSchema,
      ping: pingSchema,
      connection_success: connectionSuccessSchema,
      connection_failed: connectionFailedSchema,
      profile_response: profileResponseSchema,
    };

    Object.entries(schemaMap).forEach(([key, schema]) => {
      const validate = this.ajv.compile(schema);
      this.schemas.set(key, validate);
    });
  }

  validateEnvelope(data: unknown): data is WebSocketEnvelope {
    const validate = this.schemas.get('envelope');
    if (!validate) throw new Error('Envelope schema not found');
    
    const isValid = validate(data);
    if (!isValid) {
      console.error('Envelope validation failed:', validate.errors);
    }
    return isValid;
  }

  validatePayload<T>(messageType: string, payload: unknown): payload is T {
    const validate = this.schemas.get(messageType);
    if (!validate) {
      console.error(`No schema found for message type: ${messageType}`);
      return false;
    }
    
    const isValid = validate(payload);
    if (!isValid) {
      console.error(`Payload validation failed for ${messageType}:`, validate.errors);
    }
    return isValid;
  }

  createValidatedMessage<T>(
    type: string,
    payload: T,
    correlationId?: string
  ): ValidatedMessage<T> {
    // Validate the payload first
    if (!this.validatePayload(type, payload)) {
      throw new Error(`Invalid payload for message type: ${type}`);
    }

    return {
      type,
      v: '1',
      correlationId: correlationId || generateUUID(),
      payload,
    };
  }
}

// Export a singleton instance
export const wsValidator = new WebSocketValidator();

// Type-safe message creators
export const createAuthMessage = (payload: AuthorizationMessage, correlationId?: string): ValidatedMessage<AuthorizationMessage> => {
  return wsValidator.createValidatedMessage('authorization', payload, correlationId);
};

export const createChatMessage = (payload: ChatMessage, correlationId?: string): ValidatedMessage<ChatMessage> => {
  return wsValidator.createValidatedMessage('chat', payload, correlationId);
};

export const createMatchMessage = (payload: MatchActionMessage, correlationId?: string): ValidatedMessage<MatchActionMessage> => {
  return wsValidator.createValidatedMessage('match', payload, correlationId);
};

export const createProfileMessage = (payload: ProfileDecisionMessage, correlationId?: string): ValidatedMessage<ProfileDecisionMessage> => {
  return wsValidator.createValidatedMessage('profile', payload, correlationId);
};

export const createPingMessage = (payload: PingMessage = {}, correlationId?: string): ValidatedMessage<PingMessage> => {
  return wsValidator.createValidatedMessage('ping', payload, correlationId);
};

// Type guards for responses
export const isWebSocketResponse = (data: unknown): data is WebSocketResponse => {
  return typeof data === 'object' && data !== null && 
    'type' in data && 'v' in data && 'correlationId' in data && 'kind' in data;
};

export const isConnectionSuccess = (data: unknown): data is ConnectionSuccessMessage => {
  return wsValidator.validatePayload<ConnectionSuccessMessage>('connection_success', data);
};

export const isConnectionFailed = (data: unknown): data is ConnectionFailedMessage => {
  return wsValidator.validatePayload<ConnectionFailedMessage>('connection_failed', data);
};