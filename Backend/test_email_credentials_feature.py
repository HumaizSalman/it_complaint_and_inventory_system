#!/usr/bin/env python3
"""
Test script for Email Credentials Feature
Tests the implementation of automatic credential email sending for employees and vendors.
"""

import requests
import json
import sys
import os
from password_utils import generate_employee_password, generate_vendor_password
from email_service import get_email_configuration_status

# Configuration
BASE_URL = "http://localhost:8000"

def get_admin_token():
    """Get admin authentication token"""
    login_data = {
        "username": "admin@test.com",  # Update with your admin email
        "password": "admin123"         # Update with your admin password
    }
    
    try:
        response = requests.post(f"{BASE_URL}/token", data=login_data)
        if response.status_code == 200:
            return response.json()["access_token"]
        else:
            print(f"❌ Failed to authenticate admin: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error authenticating admin: {e}")
        return None

def test_email_configuration():
    """Test email configuration status"""
    print("\n=== Testing Email Configuration ===")
    
    try:
        config = get_email_configuration_status()
        print(f"✅ Email Configuration Status:")
        print(f"   • Configured: {config['configured']}")
        print(f"   • Enabled: {config['enabled']}")
        print(f"   • SMTP Server: {config['smtp_server']}")
        print(f"   • Sender Email: {config['sender_email']}")
        print(f"   • Login URL: {config['login_url']}")
        
        if config['issues']:
            print(f"⚠️  Issues found:")
            for issue in config['issues']:
                print(f"     - {issue}")
        
        return config['enabled']
    except Exception as e:
        print(f"❌ Error checking email configuration: {e}")
        return False

def test_password_generation():
    """Test secure password generation"""
    print("\n=== Testing Password Generation ===")
    
    try:
        # Test employee password generation
        emp_password = generate_employee_password()
        print(f"✅ Employee password generated: {emp_password}")
        print(f"   • Length: {len(emp_password)}")
        print(f"   • Has uppercase: {any(c.isupper() for c in emp_password)}")
        print(f"   • Has lowercase: {any(c.islower() for c in emp_password)}")
        print(f"   • Has digits: {any(c.isdigit() for c in emp_password)}")
        print(f"   • Has symbols: {any(c in '!@#$%^&*' for c in emp_password)}")
        
        # Test vendor password generation
        vendor_password = generate_vendor_password()
        print(f"✅ Vendor password generated: {vendor_password}")
        print(f"   • Length: {len(vendor_password)}")
        
        return True
    except Exception as e:
        print(f"❌ Error testing password generation: {e}")
        return False

def test_email_configuration_endpoint(token):
    """Test email configuration API endpoint"""
    print("\n=== Testing Email Configuration Endpoint ===")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/admin/email-configuration", headers=headers)
        if response.status_code == 200:
            config = response.json()
            print(f"✅ Email configuration endpoint working")
            print(f"   • Response: {json.dumps(config, indent=2)}")
            return True
        else:
            print(f"❌ Email configuration endpoint failed: {response.status_code}")
            print(f"   • Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error testing email configuration endpoint: {e}")
        return False

def test_email_functionality(token, test_email):
    """Test email sending functionality"""
    print(f"\n=== Testing Email Functionality ===")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    test_data = {
        "email": test_email,
        "name": "Test User",
        "type": "employee"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/admin/test-email", 
                               headers=headers, 
                               json=test_data)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Test email functionality working")
            print(f"   • Message: {result['message']}")
            print(f"   • Test email: {result['test_email']}")
            return True
        else:
            print(f"❌ Test email functionality failed: {response.status_code}")
            print(f"   • Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error testing email functionality: {e}")
        return False

def test_employee_creation(token):
    """Test employee creation with email sending"""
    print(f"\n=== Testing Employee Creation ===")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    employee_data = {
        "name": "Test Employee",
        "email": f"test.employee.{os.urandom(4).hex()}@testcompany.com",
        "department": "IT",
        "role": "Software Developer",
        "phone_number": "+1-555-0123",
        "location": "Remote"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/employees/", 
                               headers=headers, 
                               json=employee_data)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Employee creation successful")
            print(f"   • Name: {result['name']}")
            print(f"   • Email: {result['email']}")
            print(f"   • Temp Password: {result.get('temp_password', 'Not included')}")
            print(f"   • Username: {result.get('username', 'Not included')}")
            return True, result
        else:
            print(f"❌ Employee creation failed: {response.status_code}")
            print(f"   • Response: {response.text}")
            return False, None
    except Exception as e:
        print(f"❌ Error testing employee creation: {e}")
        return False, None

def test_vendor_creation(token):
    """Test vendor creation with email sending"""
    print(f"\n=== Testing Vendor Creation ===")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    vendor_data = {
        "name": "Test Vendor Corp",
        "email": f"test.vendor.{os.urandom(4).hex()}@testcompany.com",
        "phone": "+1-555-0456",
        "service_type": "Hardware",
        "address": "123 Test Street, Test City, TC 12345",
        "contact_person": "Jane Test"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/vendor/", 
                               headers=headers, 
                               json=vendor_data)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Vendor creation successful")
            print(f"   • Name: {result['name']}")
            print(f"   • Email: {result['email']}")
            print(f"   • Temp Password: {result.get('temp_password', 'Not included')}")
            print(f"   • Username: {result.get('username', 'Not included')}")
            return True, result
        else:
            print(f"❌ Vendor creation failed: {response.status_code}")
            print(f"   • Response: {response.text}")
            return False, None
    except Exception as e:
        print(f"❌ Error testing vendor creation: {e}")
        return False, None

def main():
    """Main test function"""
    print("🧪 Email Credentials Feature Test Suite")
    print("=" * 50)
    
    # Test email configuration locally
    email_enabled = test_email_configuration()
    
    # Test password generation
    password_test_passed = test_password_generation()
    
    # Get admin token for API tests
    token = get_admin_token()
    if not token:
        print("\n❌ Cannot continue without admin token")
        sys.exit(1)
    
    # Test email configuration endpoint
    config_endpoint_passed = test_email_configuration_endpoint(token)
    
    # Test email functionality (if email is enabled)
    if email_enabled:
        test_email = input("\nEnter your email address for testing (or press Enter to skip): ").strip()
        if test_email:
            test_email_functionality(token, test_email)
    
    # Test employee creation
    employee_test_passed, employee_result = test_employee_creation(token)
    
    # Test vendor creation
    vendor_test_passed, vendor_result = test_vendor_creation(token)
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Results Summary")
    print("=" * 50)
    print(f"✅ Email Configuration: {'PASS' if email_enabled else 'DISABLED'}")
    print(f"✅ Password Generation: {'PASS' if password_test_passed else 'FAIL'}")
    print(f"✅ Configuration API: {'PASS' if config_endpoint_passed else 'FAIL'}")
    print(f"✅ Employee Creation: {'PASS' if employee_test_passed else 'FAIL'}")
    print(f"✅ Vendor Creation: {'PASS' if vendor_test_passed else 'FAIL'}")
    
    if not email_enabled:
        print("\n⚠️  Email is not configured. To enable email functionality:")
        print("   1. Create a .env file with SMTP settings")
        print("   2. Restart the application")
        print("   3. Run this test again")
    
    all_tests_passed = all([
        password_test_passed,
        config_endpoint_passed,
        employee_test_passed,
        vendor_test_passed
    ])
    
    if all_tests_passed:
        print("\n🎉 All core functionality tests PASSED!")
        if email_enabled:
            print("📧 Check your email for test credentials!")
    else:
        print("\n❌ Some tests FAILED. Check the output above for details.")
        sys.exit(1)

if __name__ == "__main__":
    main() 