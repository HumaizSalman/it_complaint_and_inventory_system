import requests
import json
import io
from PIL import Image

BASE_URL = "http://localhost:8000"

def create_test_image():
    """Create a small test image"""
    img = Image.new('RGB', (100, 100), color=(255, 0, 0))  # Red square
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)
    return img_bytes

def test_direct_api():
    """Test the API directly"""
    print("🧪 Testing complaint creation API directly...")
    
    # Login as manager first
    print("🔐 Logging in...")
    login_data = {
        "username": "manager@company.com",
        "password": "password123"
    }
    
    login_response = requests.post(f"{BASE_URL}/token", data=login_data)
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        return
        
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # First, let's try to get employees to see what's available
    print("📋 Getting employees list...")
    employees_response = requests.get(f"{BASE_URL}/employees/", headers=headers)
    print(f"Employees endpoint status: {employees_response.status_code}")
    
    if employees_response.status_code == 200:
        employees = employees_response.json()
        print(f"Found {len(employees)} employees")
        if employees:
            employee_id = employees[0]['id']
            print(f"Using employee ID: {employee_id}")
        else:
            print("❌ No employees found")
            return
    else:
        # Try with a hardcoded employee ID from our database check
        print("⚠️ Using hardcoded employee ID from database")
        employee_id = "fa5a3cf9-a302-4763-9fce-49aa0ade167a"  # From our earlier database check
    
    # Create test image
    test_img = create_test_image()
    
    # Test 1: Create complaint WITHOUT images first
    print("\n🧪 Test 1: Creating complaint WITHOUT images...")
    data_no_img = {
        "title": "Debug Test - No Images",
        "description": "This is a test complaint without images for debugging",
        "priority": "medium",
        "employee_id": employee_id
    }
    
    response = requests.post(f"{BASE_URL}/complaints/with-images/", 
                           headers=headers, data=data_no_img)
    
    if response.status_code == 200:
        complaint = response.json()
        print(f"✅ Complaint without images created: {complaint['id']}")
        print(f"📸 Images: {complaint.get('images', [])}")
    else:
        print(f"❌ Failed to create complaint without images: {response.status_code}")
        print(f"❌ Error: {response.text}")
        return
    
    # Test 2: Create complaint WITH images
    print("\n🧪 Test 2: Creating complaint WITH images...")
    test_img = create_test_image()  # Create fresh image
    
    data_with_img = {
        "title": "Debug Test - With Images",
        "description": "This is a test complaint with images for debugging",
        "priority": "medium",
        "employee_id": employee_id
    }
    
    files = [("images", ("debug_test.jpg", test_img, "image/jpeg"))]
    
    response = requests.post(f"{BASE_URL}/complaints/with-images/", 
                           headers=headers, data=data_with_img, files=files)
    
    if response.status_code == 200:
        complaint = response.json()
        print(f"✅ Complaint with images created: {complaint['id']}")
        print(f"📸 Images: {complaint.get('images', [])}")
        print(f"📸 Number of images: {len(complaint.get('images', []))}")
        
        # Test 3: Immediately query the complaint back
        print(f"\n🔍 Test 3: Querying complaint back from API...")
        get_response = requests.get(f"{BASE_URL}/complaints/{complaint['id']}", headers=headers)
        
        if get_response.status_code == 200:
            retrieved_complaint = get_response.json()
            print(f"✅ Retrieved complaint: {retrieved_complaint['title']}")
            print(f"📸 Retrieved images: {retrieved_complaint.get('images', [])}")
        else:
            print(f"❌ Failed to retrieve complaint: {get_response.status_code}")
            
    else:
        print(f"❌ Failed to create complaint with images: {response.status_code}")
        print(f"❌ Error: {response.text}")

if __name__ == "__main__":
    test_direct_api() 