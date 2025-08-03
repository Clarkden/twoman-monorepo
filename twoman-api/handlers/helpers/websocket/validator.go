package websocket

import (
	"bytes"
	"embed"
	"encoding/json"
	"fmt"
	"log"
	"path"

	"github.com/santhosh-tekuri/jsonschema/v5"
)

//go:embed schemas
var schemasFS embed.FS

type Validator struct {
	schemas map[string]*jsonschema.Schema
}

func NewValidator() (*Validator, error) {
	v := &Validator{
		schemas: make(map[string]*jsonschema.Schema),
	}

	if err := v.loadSchemas(); err != nil {
		return nil, fmt.Errorf("failed to load schemas: %w", err)
	}

	return v, nil
}

func (v *Validator) loadSchemas() error {
	compiler := jsonschema.NewCompiler()
	
	// Read schema files from the embedded filesystem
	entries, err := schemasFS.ReadDir("schemas")
	if err != nil {
		return fmt.Errorf("failed to read schemas directory: %w", err)
	}

	for _, entry := range entries {
		if entry.IsDir() || path.Ext(entry.Name()) != ".json" {
			continue
		}

		schemaData, err := schemasFS.ReadFile(path.Join("schemas", entry.Name()))
		if err != nil {
			return fmt.Errorf("failed to read schema file %s: %w", entry.Name(), err)
		}

		// Parse the schema to get its $id
		var schemaDoc map[string]interface{}
		if err := json.Unmarshal(schemaData, &schemaDoc); err != nil {
			return fmt.Errorf("failed to parse schema %s: %w", entry.Name(), err)
		}

		schemaID, ok := schemaDoc["$id"].(string)
		if !ok {
			return fmt.Errorf("schema %s missing $id field", entry.Name())
		}

		// Add schema to compiler
		if err := compiler.AddResource(schemaID, bytes.NewReader(schemaData)); err != nil {
			return fmt.Errorf("failed to add schema %s: %w", entry.Name(), err)
		}

		// Compile the schema
		schema, err := compiler.Compile(schemaID)
		if err != nil {
			return fmt.Errorf("failed to compile schema %s: %w", entry.Name(), err)
		}

		// Extract message type from filename (remove .json extension)
		messageType := entry.Name()[:len(entry.Name())-5]
		v.schemas[messageType] = schema

		log.Printf("Loaded WebSocket schema for message type: %s", messageType)
	}

	return nil
}

func (v *Validator) ValidateMessage(messageType string, payload []byte) error {
	schema, exists := v.schemas[messageType]
	if !exists {
		return fmt.Errorf("no schema found for message type: %s", messageType)
	}

	var data interface{}
	if err := json.Unmarshal(payload, &data); err != nil {
		return fmt.Errorf("invalid JSON payload: %w", err)
	}

	if err := schema.Validate(data); err != nil {
		return fmt.Errorf("validation failed: %w", err)
	}

	return nil
}

func (v *Validator) GetSupportedTypes() []string {
	types := make([]string, 0, len(v.schemas))
	for messageType := range v.schemas {
		types = append(types, messageType)
	}
	return types
}