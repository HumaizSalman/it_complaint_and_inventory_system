#!/usr/bin/env python3
"""
Test script to verify quote submission functionality works properly.
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_quote_submission():
    # Login as vendor
    login_data = {
        "username": "vendor@test.com",
        "password": "vendor123"
    }
    
    response = requests.post(f"{BASE_URL}/token", data=login_data)
    if response.status_code != 200:
        print(f"Failed to login: {response.status_code} - {response.text}")
        return
    
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get vendor info
    vendor_response = requests.get(f"{BASE_URL}/vendor/by-email/vendor@test.com", headers=headers)
    if vendor_response.status_code != 200:
        print(f"Failed to get vendor info: {vendor_response.status_code}")
        return
    
    vendor_info = vendor_response.json()
    vendor_id = vendor_info["id"]
    print(f"Vendor ID: {vendor_id}")
    
    # Get quote requests for vendor
    quotes_response = requests.get(f"{BASE_URL}/quotes/requests/vendor/{vendor_id}", headers=headers)
    if quotes_response.status_code != 200:
        print(f"Failed to get quote requests: {quotes_response.status_code}")
        return
    
    quote_requests = quotes_response.json()
    print(f"Found {len(quote_requests)} quote requests")
    
    if len(quote_requests) == 0:
        print("No quote requests found to test submission")
        return
    
    # Test quote submission on first request
    quote_request = quote_requests[0]
    request_id = quote_request["id"]
    print(f"Testing quote submission for request: {quote_request['title']}")
    
    # Prepare quote response data
    quote_data = {
        "quote_request_id": request_id,
        "vendor_id": vendor_id,
        "quote_amount": 4500.00,
        "description": "Test quote response from vendor portal",
        "delivery_timeline": "2 weeks"
    }
    
    # Submit quote using the /quotes/{request_id}/respond endpoint
    submit_response = requests.post(f"{BASE_URL}/quotes/{request_id}/respond", json=quote_data, headers=headers)
    
    if submit_response.status_code == 200:
        quote_response = submit_response.json()
        print("✓ Quote submitted successfully!")
        print(f"  Quote ID: {quote_response['id']}")
        print(f"  Amount: ${quote_response['quote_amount']}")
        print(f"  Status: {quote_response['status']}")
    else:
        print(f"✗ Quote submission failed: {submit_response.status_code}")
        print(f"  Error: {submit_response.text}")

if __name__ == "__main__":
    test_quote_submission() 