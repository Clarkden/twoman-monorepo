# Type-Safe WebSocket Implementation

This implementation provides type safety and runtime validation for WebSocket communication between your Go backend and React Native TypeScript frontend using JSON Schema validation.

## Features

✅ **JSON Schema validation** on both client and server  
✅ **Auto-generated TypeScript types** from schemas  
✅ **Backward compatibility** with existing WebSocket messages  
✅ **Runtime validation** with detailed error messages  
✅ **Type-safe message creation** helpers  
✅ **Envelope structure** for request/response correlation  

## Architecture

### Backend (Go)
- **JSON Schema Validation**: Uses `github.com/santhosh-tekuri/jsonschema/v5`
- **Schema Files**: Located in `/twoman-api/websocket-schemas/`
- **Validation**: Embedded schemas provide runtime validation
- **Backward Compatibility**: Supports both new envelope format and legacy format

### Frontend (React Native)
- **Client Validation**: Uses `ajv` for JSON Schema validation
- **Type Generation**: Auto-generates TypeScript types from schemas
- **Type-Safe Helpers**: Provides validated message creation functions
- **Graceful Fallback**: Falls back to legacy format if validation fails

## Message Format

### New Envelope Format
```json
{
  "type": "chat",
  "v": "1", 
  "correlationId": "uuid-v4",
  "payload": {
    "message": "Hello!",
    "match_id": 123
  }
}
```

### Response Format
```json
{
  "type": "chat_response",
  "v": "1",
  "correlationId": "uuid-v4", 
  "kind": "RESPONSE",
  "payload": { ... }
}
```

### Error Format
```json
{
  "type": "error",
  "v": "1", 
  "correlationId": "uuid-v4",
  "kind": "ERROR",
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Message validation failed"
  }
}
```

## Usage

### Frontend (React Native)

#### Type-Safe Hook
```typescript
import { useTypeSafeWebSocket } from '@/utils/type-safe-websocket';

function ChatComponent({ matchId }: { matchId: number }) {
  const { sendChatMessage, connectionStatus } = useTypeSafeWebSocket();
  
  const handleSend = (message: string) => {
    if (connectionStatus === 'connected') {
      // This is fully type-safe and validated
      sendChatMessage(matchId, message);
    }
  };
}
```

#### Manual Validation
```typescript
import { createChatMessage, wsValidator } from '@/utils/websocket-validator';

// Create validated message
const message = createChatMessage({
  message: "Hello!",
  match_id: 123
});

// Send with validation
sendValidatedMessage(message);
```

### Backend (Go)

The backend automatically:
1. Detects envelope format vs legacy format
2. Validates messages against schemas
3. Routes to appropriate handlers
4. Provides detailed validation errors

#### Example Handler Update
```go
// Your existing handlers continue to work unchanged
func (h *Handler) HandleChat(message types.SocketMessage[types.SocketChatData], userID uint, db *gorm.DB, rdb *redis.Client, clientVersion string) {
    // Existing logic unchanged
}
```

## Schema Management

### Adding New Message Types

1. **Create Schema** (`/twoman-api/websocket-schemas/new_message.json`):
```json
{
  "$id": "https://schema.twoman.dev/ws/new_message.v1.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "New Message",
  "type": "object",
  "required": ["field1"],
  "properties": {
    "field1": {
      "type": "string",
      "minLength": 1
    }
  }
}
```

2. **Update Frontend Types**:
```bash
cd twoman-app
npm run sync-schemas  # Copies schemas and regenerates types
```

3. **Add Backend Handler**:
```go
case "new_message":
    // Handle new message type
```

### Validation Rules

Schemas support rich validation:
- **String constraints**: `minLength`, `maxLength`, `pattern`
- **Number constraints**: `minimum`, `maximum`
- **Enum values**: Restrict to specific options
- **Required fields**: Ensure critical data is present
- **Additional properties**: Control schema flexibility

## Commands

### Frontend
```bash
# Regenerate types from schemas
npm run generate-types

# Sync schemas from backend and regenerate types  
npm run sync-schemas
```

### Backend
The Go backend automatically embeds schemas at compile time.

## Migration Strategy

1. **Phase 1**: Deploy backend with dual format support ✅
2. **Phase 2**: Update frontend to use validated messages ✅
3. **Phase 3**: Gradually migrate existing message sending to use type-safe helpers
4. **Phase 4**: Eventually deprecate legacy format (optional)

## Error Handling

### Frontend
- Validation errors are logged to console
- Automatic fallback to legacy format
- Type errors caught at compile time

### Backend  
- Schema validation errors returned to client
- Detailed error messages for debugging
- Existing handlers unchanged

## Benefits

1. **Type Safety**: Compile-time type checking prevents runtime errors
2. **Runtime Validation**: Catch invalid data before processing
3. **API Documentation**: Schemas serve as living documentation
4. **Backward Compatibility**: Existing code continues to work
5. **Error Prevention**: Invalid messages rejected early
6. **Developer Experience**: Auto-completion and IntelliSense support

## Example Schemas

See `/twoman-api/websocket-schemas/` for complete schema definitions:
- `authorization.json` - Client authentication
- `chat.json` - Chat messages  
- `match.json` - Match actions
- `profile.json` - Profile decisions
- `ping.json` - Keep-alive messages

## Troubleshooting

### Backend Build Issues
Ensure schemas are copied to `/twoman-api/handlers/helpers/websocket/schemas/`

### Frontend Type Issues  
Run `npm run generate-types` to regenerate TypeScript definitions

### Validation Failures
Check browser/server console for detailed validation error messages