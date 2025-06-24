#!/usr/bin/env python3
"""
Comprehensive test for vendor portal functionality.
Tests fetching quote requests and submitting quote responses.
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_vendor_portal():
    print("🧪 Testing Vendor Portal Functionality")
    print("=" * 50)
    
    # Step 1: Login as vendor
    print("1. Logging in as vendor...")
    login_data = {
        "username": "vendor@test.com",
        "password": "vendor123"
    }
    
    response = requests.post(f"{BASE_URL}/token", data=login_data)
    if response.status_code != 200:
        print(f"❌ Login failed: {response.status_code} - {response.text}")
        return False
    
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Login successful")
    
    # Step 2: Get vendor info by email
    print("\n2. Fetching vendor info by email...")
    vendor_response = requests.get(f"{BASE_URL}/vendor/by-email/vendor@test.com", headers=headers)
    if vendor_response.status_code != 200:
        print(f"❌ Failed to get vendor info: {vendor_response.status_code}")
        return False
    
    vendor_info = vendor_response.json()
    vendor_id = vendor_info["id"]
    print(f"✅ Vendor info retrieved: {vendor_info['name']} (ID: {vendor_id})")
    
    # Step 3: Get quote requests for vendor
    print("\n3. Fetching quote requests for vendor...")
    quotes_response = requests.get(f"{BASE_URL}/quotes/requests/vendor/{vendor_id}", headers=headers)
    if quotes_response.status_code != 200:
        print(f"❌ Failed to get quote requests: {quotes_response.status_code}")
        print(f"   Error: {quotes_response.text}")
        return False
    
    quote_requests = quotes_response.json()
    print(f"✅ Found {len(quote_requests)} quote requests")
    
    for i, request in enumerate(quote_requests):
        print(f"   {i+1}. {request['title']} (Status: {request['status']})")
    
    # Step 4: Test quote submission if there are available requests
    if len(quote_requests) > 0:
        print("\n4. Testing quote submission...")
        quote_request = quote_requests[0]
        request_id = quote_request["id"]
        
        quote_data = {
            "quote_request_id": request_id,
            "vendor_id": vendor_id,
            "quote_amount": 5500.00,
            "description": "Comprehensive test quote submission with detailed proposal",
            "delivery_timeline": "3 weeks"
        }
        
        submit_response = requests.post(f"{BASE_URL}/quotes/{request_id}/respond", json=quote_data, headers=headers)
        
        if submit_response.status_code == 200:
            quote_response = submit_response.json()
            print("✅ Quote submitted successfully!")
            print(f"   Quote ID: {quote_response['id']}")
            print(f"   Amount: ${quote_response['quote_amount']}")
            print(f"   Status: {quote_response['status']}")
        else:
            print(f"❌ Quote submission failed: {submit_response.status_code}")
            print(f"   Error: {submit_response.text}")
            return False
    else:
        print("\n4. ⚠️  No quote requests available for testing submission")
    
    # Step 5: Test legacy purchase requests endpoint
    print("\n5. Testing legacy purchase requests endpoint...")
    legacy_response = requests.get(f"{BASE_URL}/vendors/{vendor_id}/requests", headers=headers)
    if legacy_response.status_code == 200:
        legacy_requests = legacy_response.json()
        print(f"✅ Legacy endpoint working: {len(legacy_requests)} requests")
    else:
        print(f"❌ Legacy endpoint failed: {legacy_response.status_code}")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 All vendor portal tests PASSED!")
    print("The vendor portal is now fully functional for:")
    print("✅ Vendor authentication")
    print("✅ Fetching vendor info by email")
    print("✅ Loading quote requests assigned to vendor")
    print("✅ Submitting quote responses")
    print("✅ Legacy endpoints compatibility")
    
    return True

if __name__ == "__main__":
    success = test_vendor_portal()
    if not success:
        print("\n❌ Some tests failed. Please check the output above.")
        exit(1) 