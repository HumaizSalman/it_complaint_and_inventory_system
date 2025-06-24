#!/usr/bin/env python3
"""
Test script for approve button hiding logic
Tests that the backend correctly identifies complaints with quote requests
"""

import requests
import json
import sys

# Configuration
BASE_URL = "http://localhost:8000"
MANAGER_EMAIL = "manager@company.com"  # Update with actual manager email
MANAGER_PASSWORD = "password123"        # Update with actual manager password

def authenticate():
    """Get access token for manager"""
    response = requests.post(f"{BASE_URL}/token", data={
        "username": MANAGER_EMAIL,
        "password": MANAGER_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"❌ Authentication failed: {response.status_code}")
        print(response.text)
        return None

def test_quote_request_check_endpoint():
    """Test the has-quote-requests endpoint"""
    token = authenticate()
    if not token:
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n🔍 Testing quote request check endpoint...")
    
    # Get manager complaints
    response = requests.get(f"{BASE_URL}/manager/complaints", headers=headers)
    if response.status_code == 200:
        complaints = response.json()
        print(f"📋 Found {len(complaints)} manager complaints")
        
        for complaint in complaints[:3]:  # Test first 3 complaints
            print(f"\n👤 Testing complaint: {complaint['title']}")
            print(f"   ID: {complaint['id']}")
            
            # Check if complaint has quote requests
            check_response = requests.get(f"{BASE_URL}/complaints/{complaint['id']}/has-quote-requests", headers=headers)
            
            if check_response.status_code == 200:
                result = check_response.json()
                print(f"   ✅ Has quote requests: {result['has_quote_requests']}")
                print(f"   🎯 Can approve: {result['can_approve']}")
                print(f"   📝 Message: {result['message']}")
                
                if result['matching_quote_requests']:
                    print(f"   🔗 Related quote requests:")
                    for qr in result['matching_quote_requests']:
                        print(f"     - {qr['title']} (Status: {qr['status']})")
                else:
                    print(f"   📭 No related quote requests found")
            else:
                print(f"   ❌ Error checking quote requests: {check_response.status_code}")
                print(f"   📝 Response: {check_response.text}")
    else:
        print(f"❌ Failed to fetch manager complaints: {response.status_code}")

def test_approval_workflow():
    """Test the complete approval workflow"""
    token = authenticate()
    if not token:
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n🧪 Testing approval workflow...")
    
    # Get quote requests to see if any exist
    response = requests.get(f"{BASE_URL}/quote-requests/", headers=headers)
    if response.status_code == 200:
        quote_requests = response.json()
        print(f"📋 Found {len(quote_requests)} quote requests in system")
        
        for qr in quote_requests:
            print(f"   - {qr['title']} (Status: {qr['status']})")
            if 'complaint' in qr.get('title', '').lower() or 'complaint' in qr.get('description', '').lower():
                print(f"     🔗 This quote request appears to be linked to a complaint")
    else:
        print(f"❌ Failed to fetch quote requests: {response.status_code}")

if __name__ == "__main__":
    print("🧪 Testing Approve Button Hiding Logic")
    print("=" * 50)
    
    try:
        test_quote_request_check_endpoint()
        test_approval_workflow()
        
        print("\n✅ Test completed!")
        print("\nExpected Behavior:")
        print("✓ Complaints with quote requests should have 'has_quote_requests': true")
        print("✓ Complaints with quote requests should have 'can_approve': false")
        print("✓ Frontend should hide approve button for these complaints")
        print("✓ Frontend should show 'Quote Created' chip instead")
        
    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Could not connect to backend server")
        print("Make sure the backend is running on localhost:8000")
        sys.exit(1)
    except Exception as e:
        print(f"❌ UNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1) 