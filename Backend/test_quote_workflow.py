#!/usr/bin/env python3
"""
Test script to verify the quote workflow endpoints are working properly.
This script tests the complete flow from complaint approval to vendor quote submission.
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://localhost:8000"
TEST_EMAIL = "manager@test.com"
TEST_PASSWORD = "password123"

def get_auth_token():
    """Get authentication token for testing"""
    login_data = {
        "username": TEST_EMAIL,
        "password": TEST_PASSWORD
    }
    
    response = requests.post(f"{BASE_URL}/token", data=login_data)
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Failed to authenticate: {response.status_code} - {response.text}")
        return None

def test_quote_request_creation(token):
    """Test creating a quote request"""
    headers = {"Authorization": f"Bearer {token}"}
    
    quote_data = {
        "title": "Test Quote Request",
        "description": "Testing quote request creation",
        "requirements": "Test requirements",
        "budget": 1000.0,
        "priority": "medium",
        "due_date": (datetime.now() + timedelta(days=30)).isoformat(),
        "status": "draft"
    }
    
    response = requests.post(f"{BASE_URL}/quote-requests/", json=quote_data, headers=headers)
    if response.status_code == 200:
        quote_request = response.json()
        print(f"✓ Quote request created successfully: {quote_request['id']}")
        return quote_request
    else:
        print(f"✗ Failed to create quote request: {response.status_code} - {response.text}")
        return None

def test_vendor_addition(token, quote_request_id, vendor_id):
    """Test adding a vendor to a quote request"""
    headers = {"Authorization": f"Bearer {token}"}
    
    vendor_data = {"vendor_id": vendor_id}
    
    response = requests.post(f"{BASE_URL}/quote-requests/{quote_request_id}/vendors", json=vendor_data, headers=headers)
    if response.status_code == 200:
        vendor_selection = response.json()
        print(f"✓ Vendor added to quote request successfully: {vendor_selection['id']}")
        return vendor_selection
    else:
        print(f"✗ Failed to add vendor to quote request: {response.status_code} - {response.text}")
        return None

def test_vendor_quote_requests(token, vendor_id):
    """Test getting quote requests for a vendor"""
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(f"{BASE_URL}/quotes/requests/vendor/{vendor_id}", headers=headers)
    if response.status_code == 200:
        quote_requests = response.json()
        print(f"✓ Retrieved {len(quote_requests)} quote requests for vendor")
        return quote_requests
    else:
        print(f"✗ Failed to get vendor quote requests: {response.status_code} - {response.text}")
        return None

def test_quote_response_submission(token, quote_request_id, vendor_id):
    """Test submitting a quote response"""
    headers = {"Authorization": f"Bearer {token}"}
    
    response_data = {
        "quote_request_id": quote_request_id,
        "vendor_id": vendor_id,
        "quote_amount": 850.0,
        "description": "Test quote response",
        "delivery_timeline": "2 weeks"
    }
    
    response = requests.post(f"{BASE_URL}/quotes/{quote_request_id}/respond", json=response_data, headers=headers)
    if response.status_code == 200:
        quote_response = response.json()
        print(f"✓ Quote response submitted successfully: {quote_response['id']}")
        return quote_response
    else:
        print(f"✗ Failed to submit quote response: {response.status_code} - {response.text}")
        return None

def test_get_quote_responses(token, quote_request_id):
    """Test getting quote responses for a request"""
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(f"{BASE_URL}/quote-requests/{quote_request_id}/responses", headers=headers)
    if response.status_code == 200:
        responses = response.json()
        print(f"✓ Retrieved {len(responses)} quote responses")
        return responses
    else:
        print(f"✗ Failed to get quote responses: {response.status_code} - {response.text}")
        return None

def test_legacy_endpoints(token, quote_request_id, vendor_id):
    """Test legacy purchase request endpoints"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test vendor purchase requests endpoint
    response = requests.get(f"{BASE_URL}/vendors/{vendor_id}/requests", headers=headers)
    if response.status_code == 200:
        requests_data = response.json()
        print(f"✓ Legacy vendor requests endpoint working: {len(requests_data)} requests")
    else:
        print(f"✗ Legacy vendor requests endpoint failed: {response.status_code} - {response.text}")
    
    # Test purchase request quote submission
    quote_data = {
        "vendorId": vendor_id,
        "quote": 900.0,
        "response": "Legacy quote submission test",
        "status": "pending"
    }
    
    response = requests.post(f"{BASE_URL}/purchase-requests/{quote_request_id}/quotes", json=quote_data, headers=headers)
    if response.status_code == 200:
        result = response.json()
        print(f"✓ Legacy quote submission endpoint working")
    else:
        print(f"✗ Legacy quote submission endpoint failed: {response.status_code} - {response.text}")

def main():
    """Main test function"""
    print("Starting Quote Workflow Test...")
    print("=" * 50)
    
    # Get authentication token
    token = get_auth_token()
    if not token:
        print("Failed to authenticate. Exiting.")
        sys.exit(1)
    
    print("✓ Authentication successful")
    
    # Test quote request creation
    quote_request = test_quote_request_creation(token)
    if not quote_request:
        print("Failed to create quote request. Exiting.")
        sys.exit(1)
    
    # For testing, we'll use a dummy vendor ID
    # In a real scenario, you'd get this from the vendors endpoint
    test_vendor_id = "test-vendor-id"
    
    # Test vendor addition (this might fail if vendor doesn't exist)
    vendor_selection = test_vendor_addition(token, quote_request["id"], test_vendor_id)
    
    # Test vendor quote requests
    vendor_requests = test_vendor_quote_requests(token, test_vendor_id)
    
    # Test quote response submission
    quote_response = test_quote_response_submission(token, quote_request["id"], test_vendor_id)
    
    # Test getting quote responses
    responses = test_get_quote_responses(token, quote_request["id"])
    
    # Test legacy endpoints
    test_legacy_endpoints(token, quote_request["id"], test_vendor_id)
    
    print("=" * 50)
    print("Quote Workflow Test Complete!")

if __name__ == "__main__":
    main() 