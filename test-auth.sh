#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:5000/api"

echo -e "${YELLOW}Testing Authentication Flow${NC}\n"

# Test 1: Register
echo -e "${YELLOW}1. Testing Registration...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User",
    "role": "student"
  }')

echo "Response: $REGISTER_RESPONSE"

# Extract token from registration
TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
  echo -e "${GREEN}✓ Registration successful! Token: ${TOKEN:0:20}...${NC}\n"
else
  echo -e "${RED}✗ Registration failed${NC}\n"
  echo "$REGISTER_RESPONSE"
fi

# Test 2: Login
echo -e "${YELLOW}2. Testing Login...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

echo "Response: $LOGIN_RESPONSE"

LOGIN_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -n "$LOGIN_TOKEN" ]; then
  echo -e "${GREEN}✓ Login successful! Token: ${LOGIN_TOKEN:0:20}...${NC}\n"
else
  echo -e "${RED}✗ Login failed${NC}\n"
  echo "$LOGIN_RESPONSE"
fi

# Test 3: Get current user
if [ -n "$LOGIN_TOKEN" ]; then
  echo -e "${YELLOW}3. Testing /auth/me endpoint...${NC}"
  ME_RESPONSE=$(curl -s -X GET "$API_URL/auth/me" \
    -H "Authorization: Bearer $LOGIN_TOKEN")

  echo "Response: $ME_RESPONSE"

  if echo "$ME_RESPONSE" | grep -q "test@example.com"; then
    echo -e "${GREEN}✓ /auth/me endpoint working!${NC}\n"
  else
    echo -e "${RED}✗ /auth/me endpoint failed${NC}\n"
  fi
fi

echo -e "${YELLOW}4. Testing invalid login...${NC}"
INVALID_LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "wrongpassword"
  }')

echo "Response: $INVALID_LOGIN"

if echo "$INVALID_LOGIN" | grep -q "incorretos"; then
  echo -e "${GREEN}✓ Invalid login properly rejected!${NC}\n"
else
  echo -e "${RED}✗ Invalid login validation failed${NC}\n"
fi

echo -e "${GREEN}All tests completed!${NC}"
