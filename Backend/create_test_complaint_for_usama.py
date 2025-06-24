import requests
import json
import io
from PIL import Image

BASE_URL = "http://localhost:8000"
USAMA_EMPLOYEE_ID = "0cf862e0-3bde-43a4-bab1-ae7ef7a13b8d"

def create_test_image():
    """Create a colorful test image"""
    img = Image.new('RGB', (200, 200), color=(0, 128, 255))  # Blue background
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)
    return img_bytes

def create_complaint_for_usama():
    """Create a test complaint with images for Usama"""
    print("🧪 Creating test complaint with images for Usama...")
    
    # Login as manager
    print("🔐 Logging in as manager...")
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
    
    # Create test image
    test_img = create_test_image()
    
    # Create complaint data
    data = {
        "title": "🖼️ Test Complaint - Image Display Test for Employee Portal",
        "description": "This is a test complaint created specifically to test image display functionality in the Employee Portal. If you can see this complaint and its attached images, the feature is working correctly!",
        "priority": "medium",
        "employee_id": USAMA_EMPLOYEE_ID
    }
    
    # Prepare files
    files = [("images", ("employee_portal_test.jpg", test_img, "image/jpeg"))]
    
    print(f"📤 Creating complaint for Usama (ID: {USAMA_EMPLOYEE_ID})...")
    response = requests.post(f"{BASE_URL}/complaints/with-images/", 
                           headers=headers, data=data, files=files)
    
    if response.status_code == 200:
        complaint = response.json()
        print(f"✅ Test complaint created successfully!")
        print(f"📋 Complaint ID: {complaint['id']}")
        print(f"📋 Title: {complaint['title']}")
        print(f"📸 Images: {complaint.get('images', [])}")
        print(f"📸 Number of images: {len(complaint.get('images', []))}")
        
        # Get the image URL
        if complaint.get('images') and len(complaint['images']) > 0:
            image_path = complaint['images'][0]
            image_url = f"{BASE_URL}/{image_path}"
            print(f"🔗 Image URL: {image_url}")
            print(f"\n📝 Instructions for testing:")
            print(f"   1. Open the Employee Portal in your browser")
            print(f"   2. Login as Usama (usama@gmail.com)")
            print(f"   3. Look for the complaint titled: '{complaint['title']}'")
            print(f"   4. Click on the complaint to view details")
            print(f"   5. You should see the attached image displayed")
            print(f"   6. The image should be accessible at: {image_url}")
        
        return complaint['id']
    else:
        print(f"❌ Failed to create complaint: {response.status_code}")
        print(f"❌ Error: {response.text}")
        return None

if __name__ == "__main__":
    create_complaint_for_usama() 