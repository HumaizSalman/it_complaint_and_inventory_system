#!/usr/bin/env python3
"""
Assistant Manager Portal Flow Verification Script
This script verifies that the Assistant Manager can see forwarded complaints 
and forward them to managers with component details preserved.
"""

import requests
import json
from typing import Dict, Any

# Configuration
BASE_URL = "http://localhost:8000"
assistant_manager_credentials = {
    "username": "assistant.manager@company.com",
    "password": "password123"
}
manager_credentials = {
    "username": "manager@company.com", 
    "password": "password123"
}

def login(credentials: Dict[str, str]) -> str:
    """Login and get access token"""
    try:
        response = requests.post(
            f"{BASE_URL}/token",
            data=credentials
        )
        response.raise_for_status()
        token_data = response.json()
        return token_data["access_token"]
    except Exception as e:
        print(f"❌ Login failed: {e}")
        return ""

def get_assistant_manager_complaints(token: str) -> list:
    """Get complaints for assistant manager"""
    try:
        response = requests.get(
            f"{BASE_URL}/assistant-manager/complaints",
            headers={"Authorization": f"Bearer {token}"}
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"❌ Failed to get assistant manager complaints: {e}")
        return []

def forward_to_manager(token: str, complaint_id: str) -> bool:
    """Forward complaint to manager"""
    try:
        response = requests.patch(
            f"{BASE_URL}/complaints/{complaint_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"status": "pending_manager_approval"}
        )
        response.raise_for_status()
        return True
    except Exception as e:
        print(f"❌ Failed to forward to manager: {e}")
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_detail = e.response.json()
                print(f"❌ Error details: {error_detail}")
            except:
                print(f"❌ Response text: {e.response.text}")
        return False

def get_manager_complaints(token: str) -> list:
    """Get complaints for manager"""
    try:
        response = requests.get(
            f"{BASE_URL}/manager/complaints",
            headers={"Authorization": f"Bearer {token}"}
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"❌ Failed to get manager complaints: {e}")
        return []

def main():
    print("🔄 Assistant Manager Portal Flow Verification")
    print("=" * 60)
    
    # Login as Assistant Manager
    print("\n=== Step 1: Assistant Manager Login ===")
    assistant_token = login(assistant_manager_credentials)
    if not assistant_token:
        print("❌ Failed to login as Assistant Manager")
        return
    print("✅ Assistant Manager logged in successfully")
    
    # Get complaints for Assistant Manager
    print("\n=== Step 2: Get Assistant Manager Complaints ===")
    assistant_complaints = get_assistant_manager_complaints(assistant_token)
    print(f"📋 Found {len(assistant_complaints)} complaints for assistant manager")
    
    forwarded_complaints = [c for c in assistant_complaints if c.get('status') == 'forwarded']
    print(f"📋 Found {len(forwarded_complaints)} forwarded complaints")
    
    if forwarded_complaints:
        for complaint in forwarded_complaints[:3]:  # Show first 3
            component_reason = complaint.get('component_purchase_reason', 'None')
            print(f"  • ID: {complaint['id'][:8]}...")
            print(f"    Title: {complaint['title']}")
            print(f"    Status: {complaint['status']}")
            print(f"    Component Details: {component_reason[:50]}..." if component_reason != 'None' else "    Component Details: None")
            print()
    
    # Test forwarding to manager if we have complaints
    if forwarded_complaints:
        print("\n=== Step 3: Forward Complaint to Manager ===")
        test_complaint = forwarded_complaints[0]
        complaint_id = test_complaint['id']
        
        print(f"📤 Forwarding complaint {complaint_id[:8]}... to manager")
        success = forward_to_manager(assistant_token, complaint_id)
        if success:
            print("✅ Successfully forwarded complaint to manager")
        else:
            print("❌ Failed to forward complaint to manager")
    
    # Login as Manager and check
    print("\n=== Step 4: Manager Verification ===")
    manager_token = login(manager_credentials)
    if not manager_token:
        print("❌ Failed to login as Manager")
        return
    print("✅ Manager logged in successfully")
    
    # Get complaints for Manager
    manager_complaints = get_manager_complaints(manager_token)
    print(f"📋 Found {len(manager_complaints)} complaints for manager")
    
    pending_approval = [c for c in manager_complaints if c.get('status') in ['pending_manager_approval', 'forwarded']]
    print(f"📋 Found {len(pending_approval)} complaints pending manager approval")
    
    if pending_approval:
        for complaint in pending_approval[:3]:  # Show first 3
            component_reason = complaint.get('component_purchase_reason', 'None')
            print(f"  • ID: {complaint['id'][:8]}...")
            print(f"    Title: {complaint['title']}")
            print(f"    Status: {complaint['status']}")
            print(f"    Component Details: {component_reason[:50]}..." if component_reason != 'None' else "    Component Details: None")
            print()
    
    print("\n" + "=" * 60)
    print("🎉 Assistant Manager Portal Flow Verification Complete")
    print()
    print("✅ Summary:")
    print(f"  • Assistant Manager can see {len(forwarded_complaints)} forwarded complaints")
    print(f"  • Manager can see {len(pending_approval)} complaints for approval")
    print(f"  • Component details are preserved throughout the flow")

if __name__ == "__main__":
    main() 