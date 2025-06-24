#!/usr/bin/env python3
"""
Comprehensive test script for vendor API
Tests various scenarios including success cases, error cases, and edge cases
"""

import requests
import json
from typing import Dict, Any
import uuid

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

def test_create_vendor_success(token: str) -> bool:
    """Test successful vendor creation"""
    print("\n=== Test 1: Successful Vendor Creation ===")
    
    # Generate unique email for this test
    unique_id = str(uuid.uuid4())[:8]
    vendor_data = {
        "name": f"Test Vendor {unique_id}",
        "email": f"vendor.{unique_id}@testcompany.com",
        "phone": "+1-555-TEST-456",
        "service_type": "Software",
        "address": "456 Test Avenue, Test City, TC 67890",
        "contact_person": "Jane Test"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/vendor/",
            headers={"Authorization": f"Bearer {token}"},
            json=vendor_data
        )
        response.raise_for_status()
        vendor_response = response.json()
        
        print(f"✅ Vendor created successfully!")
        print(f"   • Name: {vendor_response.get('name')}")
        print(f"   • Email: {vendor_response.get('email')}")
        print(f"   • Username: {vendor_response.get('username')}")
        print(f"   • Password: {vendor_response.get('temp_password')}")
        
        return True
    except Exception as e:
        print(f"❌ Failed to create vendor: {e}")
        return False

def test_create_duplicate_vendor(token: str) -> bool:
    """Test vendor creation with duplicate email"""
    print("\n=== Test 2: Duplicate Email Error ===")
    
    vendor_data = {
        "name": "Duplicate Test Vendor",
        "email": "test.vendor@example.com",  # This email already exists
        "phone": "+1-555-DUPLICATE",
        "service_type": "Hardware"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/vendor/",
            headers={"Authorization": f"Bearer {token}"},
            json=vendor_data
        )
        response.raise_for_status()
        print("❌ Expected duplicate email error, but request succeeded")
        return False
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 400:
            error_detail = e.response.json().get('detail', 'Unknown error')
            print(f"✅ Correctly rejected duplicate email: {error_detail}")
            return True
        else:
            print(f"❌ Unexpected error: {e}")
            return False

def test_create_vendor_missing_fields(token: str) -> bool:
    """Test vendor creation with missing required fields"""
    print("\n=== Test 3: Missing Required Fields ===")
    
    vendor_data = {
        "name": "Incomplete Vendor",
        # Missing email, phone, service_type
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/vendor/",
            headers={"Authorization": f"Bearer {token}"},
            json=vendor_data
        )
        response.raise_for_status()
        print("❌ Expected validation error, but request succeeded")
        return False
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 422:
            print(f"✅ Correctly rejected incomplete data: {e.response.status_code}")
            return True
        else:
            print(f"❌ Unexpected error status: {e.response.status_code}")
            return False

def test_unauthorized_access() -> bool:
    """Test vendor creation without authorization"""
    print("\n=== Test 4: Unauthorized Access ===")
    
    vendor_data = {
        "name": "Unauthorized Vendor",
        "email": "unauthorized@test.com",
        "phone": "+1-555-UNAUTH",
        "service_type": "Hardware"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/vendor/",
            # No authorization header
            json=vendor_data
        )
        response.raise_for_status()
        print("❌ Expected authorization error, but request succeeded")
        return False
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            print(f"✅ Correctly rejected unauthorized request: {e.response.status_code}")
            return True
        else:
            print(f"❌ Unexpected error status: {e.response.status_code}")
            return False

def test_get_vendors(token: str) -> bool:
    """Test fetching all vendors"""
    print("\n=== Test 5: Fetch All Vendors ===")
    
    try:
        response = requests.get(
            f"{BASE_URL}/vendor/",
            headers={"Authorization": f"Bearer {token}"}
        )
        response.raise_for_status()
        vendors = response.json()
        
        print(f"✅ Successfully fetched {len(vendors)} vendors")
        if vendors:
            print(f"   • First vendor: {vendors[0].get('name')} ({vendors[0].get('email')})")
        
        return True
    except Exception as e:
        print(f"❌ Failed to fetch vendors: {e}")
        return False

def main():
    print("🧪 Comprehensive Vendor API Test Suite")
    print("=" * 60)
    
    # Step 1: Admin login
    print("\n=== Step 1: Admin Authentication ===")
    admin_token = login(admin_credentials)
    if not admin_token:
        print("❌ Failed to login as admin - cannot continue tests")
        return
    print("✅ Admin logged in successfully")
    
    # Run all tests
    tests = [
        ("Successful Vendor Creation", lambda: test_create_vendor_success(admin_token)),
        ("Duplicate Email Handling", lambda: test_create_duplicate_vendor(admin_token)),
        ("Missing Fields Validation", lambda: test_create_vendor_missing_fields(admin_token)),
        ("Unauthorized Access", test_unauthorized_access),
        ("Fetch Vendors", lambda: test_get_vendors(admin_token)),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Test '{test_name}' crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Results Summary")
    print("=" * 60)
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
        if result:
            passed += 1
    
    print(f"\n🎯 Results: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("🎉 All tests passed! Vendor API is working correctly.")
    else:
        print("⚠️  Some tests failed. Please review the issues above.")

if __name__ == "__main__":
    main() 