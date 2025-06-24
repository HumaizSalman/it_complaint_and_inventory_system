#!/usr/bin/env python3
import requests

def test_vendor_endpoint():
    # Try to get vendor token
    login_data = {
        "username": "vendor@test.com",
        "password": "vendor123"
    }
    
    response = requests.post("http://localhost:8000/token", data=login_data)
    if response.status_code == 200:
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test new endpoint
        vendor_response = requests.get("http://localhost:8000/vendor/by-email/vendor@test.com", headers=headers)
        print(f"Vendor by email endpoint: {vendor_response.status_code}")
        if vendor_response.status_code == 200:
            vendor_info = vendor_response.json()
            print(f"Vendor ID: {vendor_info['id']}")
            print(f"Vendor Name: {vendor_info['name']}")
            
            # Test quote requests endpoint
            quotes_response = requests.get(f"http://localhost:8000/quotes/requests/vendor/{vendor_info['id']}", headers=headers)
            print(f"Quote requests endpoint: {quotes_response.status_code}")
            if quotes_response.status_code == 200:
                quote_requests = quotes_response.json()
                print(f"Quote requests found: {len(quote_requests)}")
                for req in quote_requests:
                    print(f"  - {req['title']}")
            else:
                print(f"Quote requests error: {quotes_response.text}")
        else:
            print(f"Vendor by email error: {vendor_response.text}")
    else:
        print(f"Login failed: {response.status_code} - {response.text}")

if __name__ == "__main__":
    test_vendor_endpoint() 