#!/usr/bin/env python3
"""
Test script for the component purchase flow integration
"""

import requests
import json
from datetime import datetime

# Base URL for the API
BASE_URL = "http://localhost:8000"

# Test credentials (you'll need to update these with valid credentials)
ATS_USER = {
    "username": "ats@company.com",  # Update with actual ATS user email
    "password": "password123"       # Update with actual password
}

ASSISTANT_MANAGER_USER = {
    "username": "assistant.manager@company.com",  # Update with actual assistant manager email
    "password": "password123"                     # Update with actual password
}

MANAGER_USER = {
    "username": "manager@company.com",  # Update with actual manager email
    "password": "password123"           # Update with actual password
}

def get_auth_token(username, password):
    """Get authentication token for a user"""
    response = requests.post(
        f"{BASE_URL}/token",
        data={"username": username, "password": password}
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Failed to authenticate {username}: {response.text}")
        return None

def test_ats_forward_complaint():
    """Test ATS forwarding a complaint with component details"""
    print("\n=== Testing ATS Complaint Forwarding ===")
    
    # Get ATS auth token
    ats_token = get_auth_token(ATS_USER["username"], ATS_USER["password"])
    if not ats_token:
        print("❌ Failed to get ATS token")
        return None
    
    headers = {"Authorization": f"Bearer {ats_token}"}
    
    # First, get available complaints for ATS
    response = requests.get(f"{BASE_URL}/ats/complaints", headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to get ATS complaints: {response.text}")
        return None
    
    complaints = response.json()
    if not complaints:
        print("❌ No complaints available for testing")
        return None
    
    # Take the first complaint for testing
    test_complaint_id = complaints[0]["id"]
    print(f"📋 Testing with complaint ID: {test_complaint_id}")
    
    # Forward the complaint with component details
    component_data = {
        "component_purchase_reason": "Need to purchase 2x Intel i7 processors, 4x 16GB RAM modules, and 1x motherboard to replace faulty hardware causing system crashes. Estimated cost: $1,200. These components are critical for resolving the performance issues reported by the employee.",
        "status": "forwarded",
        "assigned_to": None
    }
    
    response = requests.patch(
        f"{BASE_URL}/complaints/{test_complaint_id}/forward",
        json=component_data,
        headers=headers
    )
    
    if response.status_code == 200:
        print("✅ Successfully forwarded complaint with component details")
        forwarded_complaint = response.json()
        print(f"📝 Component purchase reason: {forwarded_complaint.get('component_purchase_reason', 'N/A')}")
        return test_complaint_id
    else:
        print(f"❌ Failed to forward complaint: {response.text}")
        return None

def test_assistant_manager_view(complaint_id):
    """Test Assistant Manager viewing complaints with component details"""
    print("\n=== Testing Assistant Manager View ===")
    
    # Get Assistant Manager auth token
    am_token = get_auth_token(ASSISTANT_MANAGER_USER["username"], ASSISTANT_MANAGER_USER["password"])
    if not am_token:
        print("❌ Failed to get Assistant Manager token")
        return
    
    headers = {"Authorization": f"Bearer {am_token}"}
    
    # Get forwarded complaints
    response = requests.get(f"{BASE_URL}/assistant-manager/complaints", headers=headers)
    if response.status_code == 200:
        complaints = response.json()
        forwarded_complaints = [c for c in complaints if c.get("component_purchase_reason")]
        print(f"✅ Assistant Manager can view {len(forwarded_complaints)} complaints with component details")
        
        # Show details of our test complaint
        test_complaint = next((c for c in complaints if c["id"] == complaint_id), None)
        if test_complaint:
            print(f"📋 Test complaint component reason: {test_complaint.get('component_purchase_reason', 'N/A')}")
    else:
        print(f"❌ Failed to get Assistant Manager complaints: {response.text}")

def test_manager_view(complaint_id):
    """Test Manager viewing complaints with component details"""
    print("\n=== Testing Manager View ===")
    
    # Get Manager auth token
    manager_token = get_auth_token(MANAGER_USER["username"], MANAGER_USER["password"])
    if not manager_token:
        print("❌ Failed to get Manager token")
        return
    
    headers = {"Authorization": f"Bearer {manager_token}"}
    
    # Get manager complaints
    response = requests.get(f"{BASE_URL}/manager/complaints", headers=headers)
    if response.status_code == 200:
        complaints = response.json()
        component_complaints = [c for c in complaints if c.get("component_purchase_reason")]
        print(f"✅ Manager can view {len(component_complaints)} complaints with component details")
        
        # Show details of our test complaint
        test_complaint = next((c for c in complaints if c["id"] == complaint_id), None)
        if test_complaint:
            print(f"📋 Test complaint component reason: {test_complaint.get('component_purchase_reason', 'N/A')}")
    else:
        print(f"❌ Failed to get Manager complaints: {response.text}")

def test_component_details_endpoint(complaint_id):
    """Test the specific component details endpoint"""
    print("\n=== Testing Component Details Endpoint ===")
    
    # Test with ATS user
    ats_token = get_auth_token(ATS_USER["username"], ATS_USER["password"])
    if ats_token:
        headers = {"Authorization": f"Bearer {ats_token}"}
        response = requests.get(f"{BASE_URL}/complaints/{complaint_id}/component-details", headers=headers)
        if response.status_code == 200:
            complaint = response.json()
            print(f"✅ ATS can access component details: {complaint.get('component_purchase_reason', 'N/A')}")
        else:
            print(f"❌ ATS failed to access component details: {response.text}")

def main():
    """Run all tests"""
    print("🚀 Starting Component Purchase Flow Integration Tests")
    print("=" * 60)
    
    # Test ATS forwarding
    test_complaint_id = test_ats_forward_complaint()
    if not test_complaint_id:
        print("❌ Cannot continue tests without a forwarded complaint")
        return
    
    # Test Assistant Manager view
    test_assistant_manager_view(test_complaint_id)
    
    # Test Manager view
    test_manager_view(test_complaint_id)
    
    # Test component details endpoint
    test_component_details_endpoint(test_complaint_id)
    
    print("\n" + "=" * 60)
    print("🎉 Component Purchase Flow Integration Tests Completed")
    print("\nNote: Update the user credentials in this script to match your actual test users.")

if __name__ == "__main__":
    main() 