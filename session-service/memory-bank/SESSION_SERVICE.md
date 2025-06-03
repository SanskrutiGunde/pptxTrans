# Session Service

## Overview

The Session Service is a microservice that manages translation sessions for the PowerPoint Translator App. It provides a RESTful API for creating, retrieving, updating, and deleting session records. The service interfaces with Supabase for data storage.

## Technology Stack

- **Runtime**: Node.js with Bun.js for improved performance
- **Framework**: Fastify for API server
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Libraries**:
  - `@supabase/supabase-js` for database interaction
  - Zod for request validation
  - UUID for generating unique identifiers

## Architecture

The service follows a clean architecture pattern:

- `app/`: Main application code
  - `api/routes/`: API route definitions
  - `core/`: Core utilities and configurations
  - `models/`: Data models and types
  - `services/`: Business logic

## API Endpoints

### Sessions

- `GET /api/users/:userId/sessions` - Get all sessions for a user
- `GET /api/sessions/:sessionId` - Get a session by ID
- `POST /api/users/:userId/sessions` - Create a new session
- `PATCH /api/sessions/:sessionId` - Update a session
- `DELETE /api/sessions/:sessionId` - Delete a session
- `PATCH /api/sessions/:sessionId/status` - Update session status
- `PATCH /api/sessions/:sessionId/slide-count` - Update slide count

## Data Model

### Session

```typescript
{
  id: string;              // UUID
  user_id: string;         // User ID
  presentation_id: string; // Presentation ID
  name: string;            // Session name
  description?: string;    // Optional description
  status: SessionStatus;   // pending, processing, ready, error
  source_language: string; // Source language code
  target_languages: string[]; // Target language codes
  slide_count: number;     // Number of slides
  created_at: string;      // ISO date string
  updated_at: string;      // ISO date string
  metadata?: Record<string, any>; // Additional metadata
}
```

## Environment Variables

- `PORT`: Server port (default: 3001)
- `HOST`: Server host (default: 0.0.0.0)
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_KEY`: Supabase service key for admin access
- `CORS_ORIGIN`: Allowed CORS origins (default: *)

## Development

```bash
# Install dependencies
bun install

# Run in development mode with hot reload
bun run dev

# Build for production
bun run build

# Run in production mode
bun run start

# Run tests
bun run test
```

## Integration with Main Application

The Session Service is designed to work alongside the main PowerPoint Translator application and other microservices. It's primarily responsible for managing session metadata and state, while other services handle specific tasks like PPTX processing. 