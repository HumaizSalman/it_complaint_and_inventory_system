#!/usr/bin/env python3
"""
Test script to create test data and verify the vendor portal fix.
This creates a manager, vendor, quote request, and tests the vendor portal endpoints.
"""

import requests
import json
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://localhost:8000"

def create_test_users():
    """Create test manager and vendor users"""
    print("Creating test users...")
    
    # Create manager user
    manager_data = {
        "email": "manager@test.com",
        "password": "password123",
        "role": "manager"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/admin/create-user", json=manager_data)
        if response.status_code == 200:
            print("✓ Manager user created successfully")
        else:
            print(f"Manager user creation: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error creating manager user: {e}")
    
    # Get admin token to create vendor
    admin_login = {
        "username": "admin@test.com",
        "password": "admin123"
    }
    
    admin_response = requests.post(f"{BASE_URL}/token", data=admin_login)
    if admin_response.status_code != 200:
        print("Failed to get admin token, creating admin user first...")
        admin_user_data = {
            "email": "admin@test.com", 
            "password": "admin123",
            "role": "admin"
        }
        # Create admin user directly (this might fail if no users exist)
        try:
            admin_create_response = requests.post(f"{BASE_URL}/admin/create-user", json=admin_user_data)
            print(f"Admin user creation: {admin_create_response.status_code}")
        except:
            pass
        
        # Try login again
        admin_response = requests.post(f"{BASE_URL}/token", data=admin_login)
    
    if admin_response.status_code == 200:
        admin_token = admin_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create vendor
        vendor_data = {
            "name": "Test Vendor Corp",
            "email": "vendor@test.com",
            "phone": "555-1234",
            "address": "123 Vendor St",
            "contact_person": "John Vendor",
            "service_type": "Hardware"
        }
        
        vendor_response = requests.post(f"{BASE_URL}/vendor/", json=vendor_data, headers=headers)
        if vendor_response.status_code == 200:
            vendor_info = vendor_response.json()
            print("✓ Vendor created successfully")
            print(f"  Vendor ID: {vendor_info['id']}")
            print(f"  Vendor Login: {vendor_info['username']} / {vendor_info['temp_password']}")
            return vendor_info
        else:
            print(f"Vendor creation failed: {vendor_response.status_code} - {vendor_response.text}")
    
    return None

def get_auth_token(email, password):
    """Get authentication token"""
    login_data = {
        "username": email,
        "password": password
    }
    
    response = requests.post(f"{BASE_URL}/token", data=login_data)
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Failed to authenticate {email}: {response.status_code} - {response.text}")
        return None

def create_test_quote_request(token, vendor_id):
    """Create a test quote request with the vendor selected"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create quote request
    quote_data = {
        "title": "Test IT Equipment Quote",
        "description": "Need laptops and monitors for new employees",
        "requirements": "10 laptops, 10 monitors, delivery within 2 weeks",
        "budget": 15000.0,
        "priority": "medium",
        "due_date": (datetime.now() + timedelta(days=14)).isoformat(),
        "status": "draft"
    }
    
    response = requests.post(f"{BASE_URL}/quote-requests/", json=quote_data, headers=headers)
    if response.status_code == 200:
        quote_request = response.json()
        print(f"✓ Quote request created: {quote_request['id']}")
        
        # Add vendor to the quote request
        vendor_data = {"vendor_id": vendor_id}
        vendor_response = requests.post(
            f"{BASE_URL}/quote-requests/{quote_request['id']}/vendors", 
            json=vendor_data, 
            headers=headers
        )
        
        if vendor_response.status_code == 200:
            print(f"✓ Vendor added to quote request")
            return quote_request
        else:
            print(f"Failed to add vendor: {vendor_response.status_code} - {vendor_response.text}")
    else:
        print(f"Failed to create quote request: {response.status_code} - {response.text}")
    
    return None

def test_vendor_endpoints(vendor_token, vendor_id):
    """Test vendor portal endpoints"""
    headers = {"Authorization": f"Bearer {vendor_token}"}
    
    print("\nTesting vendor endpoints...")
    
    # Test 1: Get vendor info by email
    response = requests.get(f"{BASE_URL}/vendor/by-email/vendor@test.com", headers=headers)
    if response.status_code == 200:
        vendor_info = response.json()
        print(f"✓ Vendor info by email: {vendor_info['id']} - {vendor_info['name']}")
    else:
        print(f"✗ Failed to get vendor by email: {response.status_code} - {response.text}")
    
    # Test 2: Get quote requests for vendor
    response = requests.get(f"{BASE_URL}/quotes/requests/vendor/{vendor_id}", headers=headers)
    if response.status_code == 200:
        quote_requests = response.json()
        print(f"✓ Vendor quote requests: {len(quote_requests)} requests found")
        for req in quote_requests:
            print(f"  - {req['title']} (ID: {req['id']})")
        return quote_requests
    else:
        print(f"✗ Failed to get vendor quote requests: {response.status_code} - {response.text}")
    
    return []

def main():
    """Main test function"""
    print("Setting up test environment for vendor portal fix...")
    print("=" * 60)
    
    # Create test users
    vendor_info = create_test_users()
    if not vendor_info:
        print("Failed to create test users. Exiting.")
        return
    
    # Get manager token
    manager_token = get_auth_token("manager@test.com", "password123")
    if not manager_token:
        print("Failed to get manager token. Exiting.")
        return
    
    # Create test quote request
    quote_request = create_test_quote_request(manager_token, vendor_info['id'])
    if not quote_request:
        print("Failed to create quote request. Exiting.")
        return
    
    # Get vendor token
    vendor_token = get_auth_token("vendor@test.com", "vendor123")  # Default vendor password
    if not vendor_token:
        print("Failed to get vendor token. Exiting.")
        return
    
    # Test vendor endpoints
    quote_requests = test_vendor_endpoints(vendor_token, vendor_info['id'])
    
    print("\n" + "=" * 60)
    print("Test Summary:")
    print(f"- Vendor created: {vendor_info['name']} (ID: {vendor_info['id']})")
    print(f"- Quote requests visible to vendor: {len(quote_requests)}")
    print("- Vendor portal should now display quote requests properly!")
    print("\nYou can now test the vendor portal by logging in with:")
    print(f"  Email: vendor@test.com")
    print(f"  Password: vendor123")

if __name__ == "__main__":
    main() 