# Session Service

A microservice for managing translation sessions in the PowerPoint Translator App.

## Features

- Create, read, update, and delete session records
- Track session status and metadata
- Manage presentation references and language settings
- RESTful API with OpenAPI documentation
- Session sharing via secure links
- Single-editor access control to prevent conflicts

## Tech Stack

- Node.js with Bun.js runtime
- Fastify framework
- TypeScript
- Supabase (PostgreSQL)
- Zod for validation

## Getting Started

### Prerequisites

- Bun.js (1.0.0+)
- Supabase project with appropriate tables

### Environment Setup

Create a `.env` file in the root directory with the following variables:

```
PORT=3001
HOST=0.0.0.0
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
CORS_ORIGIN=http://localhost:3000
```

### Installation

```bash
# Install dependencies
bun install
```

### Development

```bash
# Run in development mode with hot reload
bun run dev
```

### Production

```bash
# Build for production
bun run build

# Start production server
bun run start
```

## API Documentation

When the server is running, API documentation is available at:

```
http://localhost:3001/docs
```

### Key Endpoints

- `GET /api/users/:userId/sessions` - Get all sessions for a user
- `GET /api/sessions/:sessionId` - Get a session by ID
- `POST /api/users/:userId/sessions` - Create a new session
- `PATCH /api/sessions/:sessionId` - Update a session
- `POST /api/sessions/:sessionId/share` - Generate a shareable link
- `GET /api/sessions/:sessionId/access` - Validate session access
- `POST /api/sessions/:sessionId/access` - Start editing a session
- `DELETE /api/sessions/:sessionId/access` - Release editing access

## Database Schema

The service requires a `sessions` table in Supabase with the following structure:

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  presentation_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  source_language TEXT NOT NULL,
  target_languages TEXT[] NOT NULL,
  slide_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB,
  review_token TEXT,
  last_accessed_by TEXT,
  last_accessed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_presentation_id ON sessions(presentation_id);
```

## License

MIT 