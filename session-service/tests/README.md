# Session Sharing Tests

This directory contains tests for the Session Sharing functionality, including both backend API tests and frontend component tests.

## Test Files

- `session-sharing.test.ts` - Backend tests for the Session Service API
- `../../tests/frontend-session-sharing.test.tsx` - Frontend component tests
- `../../test-session-sharing.sh` - Shell script to run all tests and perform end-to-end testing

## Backend Tests

The backend tests verify:

1. Session service methods:
   - Generating shareable links
   - Validating access based on user ID or token
   - Updating session access
   - Preventing concurrent editing
   - Releasing session access

2. API endpoints:
   - POST `/api/sessions/:sessionId/share`
   - GET `/api/sessions/:sessionId/access`
   - POST `/api/sessions/:sessionId/access`
   - DELETE `/api/sessions/:sessionId/access`

3. Error handling for invalid inputs and unauthorized access

### Running Backend Tests

```bash
cd session-service
bun test tests/session-sharing.test.ts
```

## Frontend Tests

The frontend tests verify:

1. ShareSessionButton component:
   - Only renders for session owners
   - Generates and displays shareable links
   - Handles copying to clipboard

2. SessionAccessIndicator component:
   - Shows user's role and access status
   - Displays editing controls when appropriate
   - Shows warnings when someone else is editing
   - Handles starting and stopping editing sessions
   - Displays access errors correctly

### Running Frontend Tests

```bash
# Using Vitest
npx vitest run tests/frontend-session-sharing.test.tsx

# Using Jest
npx jest tests/frontend-session-sharing.test.tsx
```

## End-to-End Testing

The shell script `test-session-sharing.sh` performs end-to-end testing of the session sharing functionality, including:

1. Starting the session service
2. Creating a test session
3. Generating a shareable link
4. Validating reviewer access
5. Starting and releasing edit access

### Running All Tests

```bash
chmod +x test-session-sharing.sh
./test-session-sharing.sh
```

## Test Coverage

The tests cover:

- Session sharing generation and validation
- Role-based access control (owner, reviewer, viewer)
- Concurrent editing prevention
- Error handling and edge cases
- UI component behavior and interaction

## Dependencies

- Bun (for running backend tests)
- Vitest or Jest (for running frontend tests)
- React Testing Library (for testing React components)
- Curl (for end-to-end API testing) 