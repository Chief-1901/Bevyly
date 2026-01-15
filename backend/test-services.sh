#!/bin/bash

# SalesOS Microservices Testing Script
# This script tests all microservices endpoints

echo "========================================"
echo "  SalesOS Microservices Health Check"
echo "========================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TOTAL=0
PASSED=0
FAILED=0

# Function to test an endpoint
test_endpoint() {
    local NAME=$1
    local URL=$2
    local ENDPOINT=$3
    
    TOTAL=$((TOTAL + 1))
    
    echo -n "Testing ${NAME} (${URL}${ENDPOINT})... "
    
    RESPONSE=$(curl -s -w "\n%{http_code}" "${URL}${ENDPOINT}" 2>/dev/null)
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" == "200" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $HTTP_CODE)"
        PASSED=$((PASSED + 1))
        if [ "$VERBOSE" == "true" ]; then
            echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
        fi
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $HTTP_CODE)"
        FAILED=$((FAILED + 1))
        if [ "$VERBOSE" == "true" ]; then
            echo "$BODY"
        fi
    fi
    echo ""
}

# Check if services are running
echo -e "${YELLOW}Checking if services are running...${NC}\n"

# Test API Gateway
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  API Gateway (Port 3000)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Gateway Health" "http://localhost:3000" "/health"
test_endpoint "Gateway Readiness" "http://localhost:3000" "/ready"
test_endpoint "Gateway Liveness" "http://localhost:3000" "/live"

# Test Auth Service
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Auth Service (Port 3001)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Auth Health" "http://localhost:3001" "/health"
test_endpoint "Auth Readiness" "http://localhost:3001" "/ready"
test_endpoint "Auth Liveness" "http://localhost:3001" "/live"

# Test CRM Service
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  CRM Service (Port 3002)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "CRM Health" "http://localhost:3002" "/health"
test_endpoint "CRM Readiness" "http://localhost:3002" "/ready"
test_endpoint "CRM Liveness" "http://localhost:3002" "/live"

# Test Email Service
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Email Service (Port 3003)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Email Health" "http://localhost:3003" "/health"
test_endpoint "Email Readiness" "http://localhost:3003" "/ready"
test_endpoint "Email Liveness" "http://localhost:3003" "/live"

# Test Calendar Service
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Calendar Service (Port 3004)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Calendar Health" "http://localhost:3004" "/health"
test_endpoint "Calendar Readiness" "http://localhost:3004" "/ready"
test_endpoint "Calendar Liveness" "http://localhost:3004" "/live"

# Test Sequences Service
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Sequences Service (Port 3005)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Sequences Health" "http://localhost:3005" "/health"
test_endpoint "Sequences Readiness" "http://localhost:3005" "/ready"
test_endpoint "Sequences Liveness" "http://localhost:3005" "/live"

# Test Activities Service
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Activities Service (Port 3006)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Activities Health" "http://localhost:3006" "/health"
test_endpoint "Activities Readiness" "http://localhost:3006" "/ready"
test_endpoint "Activities Liveness" "http://localhost:3006" "/live"

# Summary
echo "========================================"
echo "  Test Summary"
echo "========================================"
echo -e "Total Tests:  ${TOTAL}"
echo -e "Passed:       ${GREEN}${PASSED}${NC}"
echo -e "Failed:       ${RED}${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All services are healthy!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some services are not responding correctly${NC}"
    exit 1
fi

