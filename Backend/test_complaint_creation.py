import requests
import json
import io
from PIL import Image

BASE_URL = "http://localhost:8000"

def create_test_image():
    """Create a small test image"""
    img = Image.new('RGB', (100, 100), color=(73, 109, 137))
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)
    return img_bytes

def test_manager_login():
    """Login as manager"""
    print("🔐 Logging in as manager...")
    
    login_data = {
        "username": "manager@company.com",
        "password": "password123"
    }
    
    response = requests.post(f"{BASE_URL}/token", data=login_data)
    
    if response.status_code == 200:
        token_data = response.json()
        print(f"✅ Login successful")
        return token_data["access_token"]
    else:
        print(f"❌ Login failed: {response.status_code}")
        return None

def test_complaint_creation_with_images(token):
    """Test creating a complaint with images"""
    print("\n📝 Testing complaint creation with images...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get an employee ID first
    employees_response = requests.get(f"{BASE_URL}/employees/", headers=headers)
    if employees_response.status_code != 200:
        print("❌ Failed to get employees")
        return None
        
    employees = employees_response.json()
    if not employees:
        print("❌ No employees found")
        return None
        
    employee_id = employees[0]['id']
    print(f"📊 Using employee ID: {employee_id}")
    
    # Create test image
    test_img = create_test_image()
    
    # Prepare form data
    data = {
        "title": "Test Complaint with Image - API Test",
        "description": "This is a test complaint created via API to test image upload functionality",
        "priority": "medium",
        "employee_id": employee_id
    }
    
    # Prepare files
    files = [("images", ("test_complaint.jpg", test_img, "image/jpeg"))]
    
    print(f"📤 Sending complaint creation request...")
    response = requests.post(f"{BASE_URL}/complaints/with-images/", 
                           headers=headers, data=data, files=files)
    
    if response.status_code == 200:
        complaint = response.json()
        print(f"✅ Complaint created successfully!")
        print(f"📋 Complaint ID: {complaint['id']}")
        print(f"📋 Title: {complaint['title']}")
        print(f"📸 Images: {complaint.get('images', [])}")
        print(f"📸 Number of images: {len(complaint.get('images', []))}")
        
        return complaint['id']
    else:
        print(f"❌ Complaint creation failed: {response.status_code}")
        print(f"❌ Error: {response.text}")
        return None

def verify_complaint_in_database(complaint_id, token):
    """Verify that the complaint with images exists in the database"""
    print(f"\n🔍 Verifying complaint {complaint_id} in database...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(f"{BASE_URL}/complaints/{complaint_id}", headers=headers)
    
    if response.status_code == 200:
        complaint = response.json()
        print(f"✅ Complaint found in database")
        print(f"📸 Images: {complaint.get('images', [])}")
        return len(complaint.get('images', [])) > 0
    else:
        print(f"❌ Failed to retrieve complaint: {response.status_code}")
        return False

def main():
    print("🚀 Testing complaint creation with images...")
    
    # Login
    token = test_manager_login()
    if not token:
        print("💥 Cannot proceed without authentication")
        return
    
    # Test complaint creation
    complaint_id = test_complaint_creation_with_images(token)
    if not complaint_id:
        print("💥 Complaint creation failed")
        return
    
    # Verify in database
    has_images = verify_complaint_in_database(complaint_id, token)
    
    if has_images:
        print("\n🎉 SUCCESS: Complaint with images was created and stored correctly!")
    else:
        print("\n⚠️  WARNING: Complaint was created but images are not being stored properly!")

if __name__ == "__main__":
    main() 