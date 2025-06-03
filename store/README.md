# Frontend State Management with Zustand

This folder contains the state management logic for the PowerPoint Translator App using Zustand. The state is divided into three main stores:

## 1. Session Store (`useSessionStore.ts`)

Manages the current session and user context:

- Current session ID
- User role (owner, reviewer, viewer)
- User ID
- Loading and error states

Session data is persisted in local storage for session continuity.

## 2. Slides Store (`useSlidesStore.ts`)

Manages slide content and editor state:

- Slide metadata (SVG URLs, dimensions, etc.)
- Text elements with positioning data
- Edit buffers for unsaved changes
- Selection and reordering state
- Per-slide visibility state

Uses Immer for immutable state updates with a mutable API style.

## 3. Comments Store (`useCommentsStore.ts`)

Manages the commenting system:

- Comments indexed by ID
- Comments organized by slide and text element
- Unread counts for notification badges
- Comment resolution state

## Usage

### Basic Store Access

```tsx
import { useSessionStore, useSlidesStore, useCommentsStore } from '@/store';

function MyComponent() {
  // Access store state and actions
  const { sessionId, role } = useSessionStore();
  const { slides, currentSlideId } = useSlidesStore();
  const { totalUnread } = useCommentsStore();
  
  // Use state in your component
}
```

### Combined Hook Pattern

For components that need access to multiple stores, we've created a combined hook:

```tsx
import { useEditorState } from '@/hooks/useEditorState';

function EditorComponent({ sessionId }) {
  const {
    role,
    currentSlide,
    currentSlideComments,
    handleTextEdit,
    handleSaveText,
    // ...more properties and actions
  } = useEditorState(sessionId);
  
  // Access combined state from multiple stores
}
```

## State Update Flow

1. User interactions trigger store actions
2. Actions update the store state
3. React components re-render with the new state
4. Async operations (API calls) update the state when completed

## Persisted State

Some state is persisted across sessions using the `persist` middleware:

- Session ID
- User role
- User ID

## Performance Considerations

- State is split into multiple stores to prevent unnecessary re-renders
- Heavy operations use the Immer middleware for efficient updates
- Components should select only the state they need 