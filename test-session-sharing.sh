#!/bin/bash

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Session Sharing Test Suite${NC}"

# Setup
echo -e "\n${YELLOW}Setting up test environment...${NC}"

# Make sure we have all dependencies
echo "Installing dependencies..."
cd session-service && bun install
cd ../ && npm install

# Run backend tests
echo -e "\n${YELLOW}Running Backend Session Service Tests...${NC}"
cd session-service
bun test tests/session-sharing.test.ts
BACKEND_RESULT=$?

if [ $BACKEND_RESULT -eq 0 ]; then
  echo -e "${GREEN}✓ Backend tests passed!${NC}"
else
  echo -e "${RED}✗ Backend tests failed!${NC}"
fi

# Run frontend tests
echo -e "\n${YELLOW}Running Frontend Session Sharing Tests...${NC}"
cd ..
# Check if Vitest is used or Jest
if grep -q "vitest" package.json; then
  npx vitest run tests/frontend-session-sharing.test.tsx
else
  npx jest tests/frontend-session-sharing.test.tsx
fi
FRONTEND_RESULT=$?

if [ $FRONTEND_RESULT -eq 0 ]; then
  echo -e "${GREEN}✓ Frontend tests passed!${NC}"
else
  echo -e "${RED}✗ Frontend tests failed!${NC}"
fi

# End to end testing
echo -e "\n${YELLOW}Running End-to-End Test Workflow...${NC}"
echo "Starting session service in background..."
cd session-service
PORT=3001 bun run dev &
SESSION_SERVICE_PID=$!

# Wait for service to start
sleep 3

# Run a simple end-to-end test with curl
echo "Testing service health..."
HEALTH_CHECK=$(curl -s http://localhost:3001/health)

if [[ $HEALTH_CHECK == *"ok"* ]]; then
  echo -e "${GREEN}✓ Session service is healthy${NC}"
  
  echo "Testing session sharing API workflow..."
  
  # Create a test session
  echo "1. Creating test session..."
  CREATE_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"name":"Test Session","presentation_id":"test-pres-1","source_language":"en","target_languages":["fr","es"]}' \
    http://localhost:3001/api/users/test-user-1/sessions)
  
  # Extract session ID from response
  SESSION_ID=$(echo $CREATE_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
  
  if [ -n "$SESSION_ID" ]; then
    echo -e "${GREEN}✓ Created session with ID: $SESSION_ID${NC}"
    
    # Generate a share link
    echo "2. Generating share link..."
    SHARE_RESPONSE=$(curl -s -X POST \
      -H "Content-Type: application/json" \
      -H "x-base-url: http://localhost:3000" \
      -d '{"userId":"test-user-1"}' \
      http://localhost:3001/api/sessions/$SESSION_ID/share)
    
    SHARE_LINK=$(echo $SHARE_RESPONSE | grep -o '"shareableLink":"[^"]*' | cut -d'"' -f4)
    
    if [ -n "$SHARE_LINK" ]; then
      echo -e "${GREEN}✓ Generated share link: $SHARE_LINK${NC}"
      
      # Extract token from link
      TOKEN=$(echo $SHARE_LINK | grep -o 'token=[^&]*' | cut -d'=' -f2)
      
      # Check access with token
      echo "3. Validating reviewer access with token..."
      ACCESS_RESPONSE=$(curl -s "http://localhost:3001/api/sessions/$SESSION_ID/access?token=$TOKEN")
      
      if [[ $ACCESS_RESPONSE == *"reviewer"* ]]; then
        echo -e "${GREEN}✓ Reviewer access validated successfully${NC}"
        
        # Start editing session
        echo "4. Starting edit session..."
        EDIT_RESPONSE=$(curl -s -X POST \
          -H "Content-Type: application/json" \
          -d '{"editorId":"test-reviewer","editorName":"Test Reviewer"}' \
          http://localhost:3001/api/sessions/$SESSION_ID/access)
        
        if [[ $EDIT_RESPONSE != *"error"* ]]; then
          echo -e "${GREEN}✓ Started editing session successfully${NC}"
          
          # Release editing access
          echo "5. Releasing edit access..."
          RELEASE_RESPONSE=$(curl -s -X DELETE \
            "http://localhost:3001/api/sessions/$SESSION_ID/access?editorId=test-reviewer")
          
          if [[ $RELEASE_RESPONSE == *"success"* ]]; then
            echo -e "${GREEN}✓ Released editing access successfully${NC}"
            echo -e "${GREEN}✓ End-to-end workflow test passed!${NC}"
          else
            echo -e "${RED}✗ Failed to release editing access${NC}"
          fi
        else
          echo -e "${RED}✗ Failed to start editing session${NC}"
        fi
      else
        echo -e "${RED}✗ Failed to validate reviewer access${NC}"
      fi
    else
      echo -e "${RED}✗ Failed to generate share link${NC}"
    fi
  else
    echo -e "${RED}✗ Failed to create test session${NC}"
  fi
else
  echo -e "${RED}✗ Session service is not healthy${NC}"
fi

# Clean up
echo "Cleaning up..."
kill $SESSION_SERVICE_PID

# Final results
echo -e "\n${YELLOW}Test Results Summary${NC}"
if [ $BACKEND_RESULT -eq 0 ] && [ $FRONTEND_RESULT -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed!${NC}"
  exit 1
fi 