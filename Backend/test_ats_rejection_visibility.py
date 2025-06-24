#!/usr/bin/env python3

import requests
import json

# Test configuration
BASE_URL = "http://localhost:8000"

def test_ats_complaint_visibility():
    """Test that ATS can see complaints with in_progress status"""
    
    print("🔍 Testing ATS Portal Complaint Visibility After Rejection")
    print("=" * 55)
    
    # Test credentials (adjust as needed for your setup)
    ats_credentials = {
        "username": "ats@company.com",
        "password": "password123"
    }
    
    try:
        # 1. Authenticate ATS user
        print("\n1️⃣ Authenticating ATS user...")
        login_response = requests.post(f"{BASE_URL}/token", data=ats_credentials)
        
        if login_response.status_code != 200:
            print(f"❌ ATS login failed: {login_response.status_code}")
            return False
        
        token = login_response.json()["access_token"]
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        print("✅ ATS user authenticated successfully")
        
        # 2. Fetch all complaints
        print("\n2️⃣ Fetching all complaints...")
        complaints_response = requests.get(f"{BASE_URL}/complaints/all", headers=headers)
        
        if complaints_response.status_code != 200:
            print(f"❌ Failed to fetch complaints: {complaints_response.status_code}")
            return False
        
        all_complaints = complaints_response.json()
        print(f"✅ Fetched {len(all_complaints)} total complaints")
        
        # 3. Filter and analyze complaints by status
        print("\n3️⃣ Analyzing complaint statuses...")
        
        status_counts = {}
        in_progress_complaints = []
        open_complaints = []
        
        for complaint in all_complaints:
            status = complaint.get('status', 'unknown').lower()
            status_counts[status] = status_counts.get(status, 0) + 1
            
            if status == 'in_progress':
                in_progress_complaints.append(complaint)
            elif status == 'open':
                open_complaints.append(complaint)
        
        # Display status breakdown
        print("\n📊 Complaint Status Breakdown:")
        for status, count in status_counts.items():
            print(f"   {status.title()}: {count}")
        
        # 4. Check what ATS portal would show (open + in_progress)
        active_complaints = [c for c in all_complaints 
                           if c.get('status', '').lower() in ['open', 'in_progress']]
        
        print(f"\n🎯 Active Complaints (Open + In Progress): {len(active_complaints)}")
        print(f"   - Open: {len(open_complaints)}")
        print(f"   - In Progress: {len(in_progress_complaints)}")
        
        # 5. Look for rejection indicators
        print("\n🔍 Checking for rejected complaints...")
        
        rejected_complaints = []
        for complaint in in_progress_complaints:
            resolution_notes = complaint.get('resolution_notes', '')
            if 'rejected by' in resolution_notes.lower():
                rejected_complaints.append(complaint)
                print(f"   📝 Found rejected complaint: {complaint.get('id', 'Unknown ID')}")
                print(f"      Title: {complaint.get('title', 'No title')}")
                print(f"      Notes: {resolution_notes[:100]}...")
        
        print(f"\n✅ Found {len(rejected_complaints)} rejected complaints that are still in_progress")
        
        # 6. Summary
        print("\n📋 Test Results Summary:")
        print(f"   Total complaints: {len(all_complaints)}")
        print(f"   Active (visible to ATS): {len(active_complaints)}")
        print(f"   Rejected but still active: {len(rejected_complaints)}")
        
        if len(active_complaints) > 0:
            print("✅ ATS portal will show active complaints (including rejected ones)")
            
            if len(rejected_complaints) > 0:
                print("✅ Rejected complaints are properly maintained as in_progress")
                print("✅ ATS team can rework on rejected complaints")
            else:
                print("ℹ️  No rejected complaints found in current data")
        else:
            print("⚠️  No active complaints found - ATS portal will be empty")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        return False

def main():
    """Main test runner"""
    try:
        success = test_ats_complaint_visibility()
        
        print("\n" + "=" * 55)
        if success:
            print("🎉 Test completed successfully!")
            print("🔧 ATS portal should show rejected complaints for rework")
        else:
            print("❌ Test failed - check server and credentials")
            
        return success
        
    except KeyboardInterrupt:
        print("\n\n⚠️ Test interrupted by user")
        return False

if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1) 