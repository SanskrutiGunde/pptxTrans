# Session Sharing and Access Control

## Overview

The session sharing functionality allows session owners to share their translation sessions with reviewers via a secure link, while ensuring that only one person can edit the session at a time.

## Features

1. **Shareable Links**
   - Session owners can generate secure shareable links
   - Links contain a session token that grants reviewer access
   - No reviewer login required

2. **Access Control**
   - Role-based permissions (owner, reviewer, viewer)
   - Validation of session access on every request
   - Tracking of who is currently editing

3. **Concurrent Editing Prevention**
   - Only one person can edit at a time
   - 5-minute session lock to prevent conflicts
   - Clear indication of current editor status

## API Endpoints

### Generate Shareable Link
```
POST /api/sessions/:sessionId/share
Body: { userId: string }
Headers: { 'x-base-url': string } (optional)
Response: { shareableLink: string }
```

### Validate Session Access
```
GET /api/sessions/:sessionId/access
Query: userId=string, token=string
Response: { canAccess: boolean, role: string, currentEditor: string, error: string }
```

### Start Editing Session
```
POST /api/sessions/:sessionId/access
Body: { editorId: string, editorName: string }
Response: { session: Session }
```

### Release Editing Access
```
DELETE /api/sessions/:sessionId/access
Query: editorId=string
Response: { success: boolean }
```

## Database Schema Updates

The following fields were added to the `sessions` table:

```sql
ALTER TABLE sessions
ADD COLUMN review_token TEXT,
ADD COLUMN last_accessed_by TEXT,
ADD COLUMN last_accessed_at TIMESTAMP WITH TIME ZONE;
```

## Front-end Implementation

1. **useSessionSharing Hook**
   - Manages session access and sharing functionality
   - Handles token validation and role determination
   - Provides session editing controls

2. **ShareSessionButton Component**
   - Generates shareable links for session owners
   - Provides easy link copying functionality
   - Only visible to session owners

3. **SessionAccessIndicator Component**
   - Shows current session status and editor
   - Provides controls to start/stop editing
   - Shows appropriate UI based on user role

## Usage Flow

### Owner Sharing Workflow
1. Owner creates and uploads a presentation
2. Owner clicks "Share with reviewer" button
3. System generates a secure token and creates a shareable link
4. Owner copies and sends link to reviewer
5. Reviewer accesses session through the link without login

### Editing Workflow
1. User (owner or reviewer) accesses session
2. System validates access based on user ID or token
3. User enters their name and clicks "Start Editing"
4. System checks if session is already being edited
5. If available, user gets editing access and UI updates
6. When done, user releases editing access

## Security Considerations

1. Token Security
   - 32-byte random tokens generated using crypto library
   - Tokens stored in database and included in URLs

2. Access Validation
   - Every session access is validated 
   - Checks for both owner access and token-based access

3. Edit Locking
   - 5-minute session lock after last access
   - Only current editor can release their own lock

## Error Handling

- Appropriate error codes and messages for unauthorized access
- Clear UI indicators for access errors
- Automatic cleanup of editing status when user leaves 