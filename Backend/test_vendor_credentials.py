#!/usr/bin/env python3
"""
Test script for vendor creation with login credentials
This script tests the new vendor creation functionality that generates login credentials.
"""

import requests
import json
from typing import Dict, Any

# Configuration
BASE_URL = "http://localhost:8000"
admin_credentials = {
    "username": "admin@company.com",
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

def create_vendor_with_credentials(token: str) -> Dict[str, Any]:
    """Create a vendor and get credentials"""
    vendor_data = {
        "name": "Test Vendor Corp",
        "email": "test.vendor@example.com",
        "phone": "+1-555-TEST-123",
        "service_type": "Hardware",
        "address": "123 Test Street, Test City, TC 12345",
        "contact_person": "John Test"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/vendor/",
            headers={"Authorization": f"Bearer {token}"},
            json=vendor_data
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"❌ Failed to create vendor: {e}")
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_detail = e.response.json()
                print(f"❌ Error details: {error_detail}")
            except:
                print(f"❌ Response text: {e.response.text}")
        return {}

def verify_vendor_login(credentials: Dict[str, str]) -> bool:
    """Verify vendor can login with generated credentials"""
    try:
        response = requests.post(
            f"{BASE_URL}/token",
            data=credentials
        )
        response.raise_for_status()
        token_data = response.json()
        return token_data.get("role") == "vendor"
    except Exception as e:
        print(f"❌ Vendor login failed: {e}")
        return False

def main():
    print("🔧 Testing Vendor Creation with Login Credentials")
    print("=" * 60)
    
    # Step 1: Admin login
    print("\n=== Step 1: Admin Login ===")
    admin_token = login(admin_credentials)
    if not admin_token:
        print("❌ Failed to login as admin")
        return
    print("✅ Admin logged in successfully")
    
    # Step 2: Create vendor with credentials
    print("\n=== Step 2: Create Vendor with Credentials ===")
    vendor_response = create_vendor_with_credentials(admin_token)
    
    if not vendor_response:
        print("❌ Failed to create vendor")
        return
    
    print("✅ Vendor created successfully!")
    print(f"📋 Vendor Details:")
    print(f"   • Name: {vendor_response.get('name')}")
    print(f"   • Email: {vendor_response.get('email')}")
    print(f"   • Service Type: {vendor_response.get('service_type')}")
    print(f"   • Phone: {vendor_response.get('phone')}")
    
    # Check if credentials were returned
    username = vendor_response.get('username')
    temp_password = vendor_response.get('temp_password')
    
    if username and temp_password:
        print(f"\n🔐 Generated Login Credentials:")
        print(f"   • Username: {username}")
        print(f"   • Password: {temp_password}")
        
        # Step 3: Test vendor login
        print("\n=== Step 3: Test Vendor Login ===")
        vendor_login_data = {
            "username": username,
            "password": temp_password
        }
        
        if verify_vendor_login(vendor_login_data):
            print("✅ Vendor can login successfully with generated credentials")
            print("✅ Vendor role verified")
        else:
            print("❌ Vendor login failed")
            
    else:
        print("❌ No credentials returned in response")
        print(f"Response keys: {list(vendor_response.keys())}")
    
    print("\n" + "=" * 60)
    print("🎉 Vendor Credentials Test Complete")

if __name__ == "__main__":
    main() 