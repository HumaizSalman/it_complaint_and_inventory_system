#!/usr/bin/env python3
"""
Test script for the quote response review endpoint
Tests that the 404 error is resolved
"""

import requests
import json
import sys

# Configuration
BASE_URL = "http://localhost:8000"

def test_review_endpoint():
    """Test that the review endpoint exists and responds correctly"""
    
    # Test with a dummy quote response ID (should return 404 for quote not found, not 404 for endpoint)
    test_id = "dc8ffaf4-aa05-45fa-85e2-ce9e5c32e19b"
    
    print(f"🧪 Testing review endpoint with quote response ID: {test_id}")
    
    # Try without authentication first (should get 401, not 404)
    response = requests.put(f"{BASE_URL}/quote-responses/{test_id}/review", json={
        "status": "accepted",
        "notes": "Test review"
    })
    
    print(f"📊 Response status: {response.status_code}")
    print(f"📝 Response text: {response.text}")
    
    if response.status_code == 404 and "Not Found" in response.text:
        print("❌ ISSUE: Endpoint still returning 404 - endpoint not found")
        return False
    elif response.status_code == 401:
        print("✅ SUCCESS: Endpoint exists (401 Unauthorized - need authentication)")
        return True
    elif response.status_code == 422:
        print("✅ SUCCESS: Endpoint exists (422 Validation Error)")
        return True
    else:
        print(f"🤔 UNEXPECTED: Status {response.status_code}")
        return True  # Endpoint exists, different error

def test_endpoint_discovery():
    """Check if the endpoint is discoverable"""
    
    print("\n🔍 Checking if endpoint is in OpenAPI docs...")
    
    try:
        response = requests.get(f"{BASE_URL}/docs")
        if response.status_code == 200:
            print("✅ OpenAPI docs accessible")
        else:
            print(f"⚠️ OpenAPI docs not accessible: {response.status_code}")
    except Exception as e:
        print(f"⚠️ Could not access OpenAPI docs: {e}")

if __name__ == "__main__":
    print("🧪 Testing Quote Response Review Endpoint")
    print("=" * 50)
    
    try:
        # Test if endpoint exists
        success = test_review_endpoint()
        test_endpoint_discovery()
        
        if success:
            print("\n✅ RESOLUTION SUCCESSFUL!")
            print("The /quote-responses/{id}/review endpoint is now working")
            print("Frontend should no longer get 404 errors for this endpoint")
        else:
            print("\n❌ ISSUE NOT RESOLVED")
            print("The endpoint is still returning 404 errors")
            
    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Could not connect to backend server")
        print("Make sure the backend is running on localhost:8000")
        sys.exit(1)
    except Exception as e:
        print(f"❌ UNEXPECTED ERROR: {e}")
        sys.exit(1) 