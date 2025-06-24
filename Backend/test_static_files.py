import requests

def test_static_file_serving():
    """Test if static files are being served correctly"""
    print("🔍 Testing static file serving...")
    
    # Test the uploaded image
    image_url = "http://localhost:8000/uploads/complaint_images/6d4129bf-8c45-4a02-af0e-a51236bca320.jpg"
    
    try:
        response = requests.get(image_url)
        print(f"📊 Status Code: {response.status_code}")
        print(f"📊 Content-Type: {response.headers.get('Content-Type', 'Not found')}")
        print(f"📊 Content-Length: {len(response.content)} bytes")
        
        if response.status_code == 200:
            print("✅ Image is accessible via static file server!")
        else:
            print("❌ Image is NOT accessible via static file server")
            print(f"❌ Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error accessing image: {str(e)}")

if __name__ == "__main__":
    test_static_file_serving() 