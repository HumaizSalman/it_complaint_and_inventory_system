#!/usr/bin/env python3

import requests
import json
import io
import os
from PIL import Image

# Test configuration
BASE_URL = "http://localhost:8000"
TEST_EMAIL = "usama@gmail.com"  # Use an actual employee account
TEST_PASSWORD = "password123"

def create_test_image():
    """Create a small test image for upload"""
    img = Image.new('RGB', (100, 100), color = (73, 109, 137))
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)
    return img_bytes

def test_login():
    """Test login and get token"""
    print("🔐 Testing login...")
    
    login_data = {
        "username": TEST_EMAIL,
        "password": TEST_PASSWORD
    }
    
    response = requests.post(f"{BASE_URL}/token", data=login_data)
    
    if response.status_code == 200:
        token_data = response.json()
        print(f"✅ Login successful for user: {token_data['email']}")
        print(f"📊 User role: {token_data['role']}")
        print(f"👤 Employee ID: {token_data.get('employee_id', 'N/A')}")
        return token_data["access_token"], token_data.get('employee_id')
    else:
        print(f"❌ Login failed: {response.status_code} - {response.text}")
        return None, None

def test_get_employee_complaints(token, employee_id):
    """Test getting employee complaints"""
    if not employee_id:
        print("⚠️ No employee ID, skipping employee complaints test")
        return
        
    print(f"\n📋 Testing employee complaints for ID: {employee_id}...")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/employees/{employee_id}/complaints", headers=headers)
    
    if response.status_code == 200:
        complaints = response.json()
        print(f"✅ Successfully retrieved {len(complaints)} complaints")
        
        for complaint in complaints[:3]:  # Show first 3
            print(f"  - {complaint['title']} (Status: {complaint['status']})")
            print(f"    Images: {len(complaint.get('images', []))} files")
    else:
        print(f"❌ Failed to get complaints: {response.status_code} - {response.text}")

def test_get_all_complaints(token):
    """Test getting all complaints"""
    print(f"\n📋 Testing all complaints...")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/complaints/all", headers=headers)
    
    if response.status_code == 200:
        complaints = response.json()
        print(f"✅ Successfully retrieved {len(complaints)} total complaints")
        
        for complaint in complaints[:3]:  # Show first 3
            print(f"  - {complaint['title']} (Status: {complaint['status']})")
            print(f"    Employee: {complaint['employee']['name']}")
            print(f"    Images: {len(complaint.get('images', []))} files")
    else:
        print(f"❌ Failed to get all complaints: {response.status_code} - {response.text}")

def test_image_upload(token):
    """Test image upload functionality"""
    print(f"\n📸 Testing image upload...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create test image
    test_img = create_test_image()
    
    files = [("files", ("test.jpg", test_img, "image/jpeg"))]
    
    response = requests.post(f"{BASE_URL}/upload-complaint-images/", 
                           headers=headers, files=files)
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Image upload successful")
        print(f"📁 Uploaded files: {result['uploaded_files']}")
        return result['uploaded_files']
    else:
        print(f"❌ Image upload failed: {response.status_code} - {response.text}")
        return []

def test_complaint_with_images(token, employee_id):
    """Test creating complaint with images"""
    if not employee_id:
        print("⚠️ No employee ID, skipping complaint creation test")
        return
        
    print(f"\n📝 Testing complaint creation with images...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create test image
    test_img = create_test_image()
    
    data = {
        "title": "Test Complaint with Image",
        "description": "This is a test complaint created via API with image upload",
        "priority": "medium",
        "employee_id": employee_id
    }
    
    files = [("images", ("test.jpg", test_img, "image/jpeg"))]
    
    response = requests.post(f"{BASE_URL}/complaints/with-images/", 
                           headers=headers, data=data, files=files)
    
    if response.status_code == 200:
        complaint = response.json()
        print(f"✅ Complaint created successfully")
        print(f"📋 Complaint ID: {complaint['id']}")
        print(f"📸 Images: {complaint.get('images', [])}")
        return complaint['id']
    else:
        print(f"❌ Complaint creation failed: {response.status_code} - {response.text}")
        return None

def main():
    print("🚀 Testing IT Inventory App API endpoints...")
    
    # Test login
    token, employee_id = test_login()
    if not token:
        print("💥 Cannot proceed without authentication")
        return
    
    # Test getting employee complaints
    test_get_employee_complaints(token, employee_id)
    
    # Test getting all complaints  
    test_get_all_complaints(token)
    
    # Test image upload
    uploaded_files = test_image_upload(token)
    
    # Test complaint creation with images
    complaint_id = test_complaint_with_images(token, employee_id)
    
    print("\n✨ API testing completed!")

if __name__ == "__main__":
    main() 