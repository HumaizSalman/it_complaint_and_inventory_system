#!/usr/bin/env python3

import os
import sys
import json
import asyncio
import requests
from datetime import datetime

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Test configuration
BASE_URL = "http://localhost:8000"
TEST_CREDENTIALS = {
    "manager": {
        "username": "manager@company.com",
        "password": "password123"
    },
    "assistant_manager": {
        "username": "assistant@company.com", 
        "password": "password123"
    },
    "ats": {
        "username": "ats@company.com",
        "password": "password123"
    },
    "employee": {
        "username": "john.doe@company.com",
        "password": "password123"
    }
}

def authenticate_user(username, password):
    """Authenticate user and return token"""
    login_data = {
        "username": username,
        "password": password
    }
    
    response = requests.post(f"{BASE_URL}/token", data=login_data)
    
    if response.status_code == 200:
        token_data = response.json()
        return token_data["access_token"]
    else:
        print(f"❌ Login failed for {username}: {response.status_code}")
        print(response.text)
        return None

def create_test_complaint(employee_token):
    """Create a test complaint for rejection testing"""
    complaint_data = {
        "title": "Test Complaint for Rejection System",
        "description": "This is a test complaint to verify the new rejection notification system works correctly.",
        "priority": "medium",
        "employee_id": "test-employee-id"
    }
    
    headers = {
        "Authorization": f"Bearer {employee_token}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(f"{BASE_URL}/complaints/", 
                           json=complaint_data, 
                           headers=headers)
    
    if response.status_code == 200:
        complaint = response.json()
        print(f"✅ Test complaint created: {complaint['id']}")
        return complaint['id']
    else:
        print(f"❌ Failed to create test complaint: {response.status_code}")
        print(response.text)
        return None

def test_complaint_rejection(complaint_id, token, role):
    """Test the complaint rejection endpoint"""
    print(f"\n🔄 Testing complaint rejection as {role}...")
    
    rejection_data = {
        "reason": f"Test rejection by {role} - System verification test at {datetime.now()}"
    }
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.patch(f"{BASE_URL}/complaints/{complaint_id}/reject",
                            json=rejection_data,
                            headers=headers)
    
    if response.status_code == 200:
        rejected_complaint = response.json()
        print(f"✅ Complaint rejected successfully by {role}")
        print(f"   Status: {rejected_complaint['status']}")
        print(f"   Resolution Notes: {rejected_complaint['resolution_notes']}")
        return True
    else:
        print(f"❌ Rejection failed for {role}: {response.status_code}")
        print(response.text)
        return False

def check_ats_notifications(ats_token):
    """Check if ATS users received rejection notifications"""
    print(f"\n🔄 Checking ATS notifications...")
    
    headers = {
        "Authorization": f"Bearer {ats_token}",
        "Content-Type": "application/json"
    }
    
    response = requests.get(f"{BASE_URL}/notifications", headers=headers)
    
    if response.status_code == 200:
        notifications = response.json()
        
        # Look for rejection notifications
        rejection_notifications = [
            n for n in notifications 
            if "rejected" in n.get("message", "").lower()
        ]
        
        if rejection_notifications:
            print(f"✅ Found {len(rejection_notifications)} rejection notification(s)")
            for notif in rejection_notifications[:3]:  # Show first 3
                print(f"   📧 {notif['message']}")
                print(f"       Type: {notif.get('type', 'Unknown')}")
                print(f"       Created: {notif['created_at']}")
            return True
        else:
            print("❌ No rejection notifications found")
            return False
    else:
        print(f"❌ Failed to fetch notifications: {response.status_code}")
        return False

def verify_complaint_status(complaint_id, token):
    """Verify the complaint status after rejection"""
    print(f"\n🔄 Verifying complaint status...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.get(f"{BASE_URL}/complaints/all", headers=headers)
    
    if response.status_code == 200:
        complaints = response.json()
        
        # Find our test complaint
        test_complaint = next((c for c in complaints if c['id'] == complaint_id), None)
        
        if test_complaint:
            print(f"✅ Complaint found after rejection")
            print(f"   Status: {test_complaint['status']}")
            print(f"   Visible in ATS: {'Yes' if test_complaint['status'] == 'in_progress' else 'No'}")
            return test_complaint['status'] == 'in_progress'
        else:
            print("❌ Complaint not found - may have been closed/hidden")
            return False
    else:
        print(f"❌ Failed to fetch complaints: {response.status_code}")
        return False

def main():
    """Main test function"""
    print("🚀 Testing Complaint Rejection System with Notifications")
    print("=" * 60)
    
    # Authenticate users
    print("\n1️⃣ Authenticating users...")
    tokens = {}
    
    for role, creds in TEST_CREDENTIALS.items():
        token = authenticate_user(creds["username"], creds["password"])
        if token:
            tokens[role] = token
            print(f"✅ {role} authenticated")
        else:
            print(f"❌ Failed to authenticate {role}")
            return False
    
    if len(tokens) < 4:
        print("❌ Not all users authenticated. Test cannot proceed.")
        return False
    
    # Create test complaint
    print("\n2️⃣ Creating test complaint...")
    complaint_id = create_test_complaint(tokens["employee"])
    
    if not complaint_id:
        print("❌ Cannot proceed without test complaint")
        return False
    
    # Test manager rejection
    print("\n3️⃣ Testing Manager Rejection...")
    manager_rejection = test_complaint_rejection(complaint_id, tokens["manager"], "Manager")
    
    if manager_rejection:
        # Check notifications
        notifications_received = check_ats_notifications(tokens["ats"])
        
        # Verify complaint status
        status_correct = verify_complaint_status(complaint_id, tokens["ats"])
        
        print("\n📊 Test Results Summary:")
        print(f"   Manager Rejection: {'✅ PASS' if manager_rejection else '❌ FAIL'}")
        print(f"   ATS Notifications: {'✅ PASS' if notifications_received else '❌ FAIL'}")
        print(f"   Complaint Status: {'✅ PASS (in_progress)' if status_correct else '❌ FAIL (not in_progress)'}")
        
        if manager_rejection and notifications_received and status_correct:
            print("\n🎉 All tests PASSED! Rejection system working correctly.")
            return True
        else:
            print("\n❌ Some tests FAILED. Please check the implementation.")
            return False
    else:
        print("\n❌ Manager rejection failed. Cannot proceed with other tests.")
        return False

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️ Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1) 