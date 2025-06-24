#!/usr/bin/env python3
from database import SessionLocal
import crud

def test_crud():
    db = SessionLocal()
    try:
        vendor_id = '0fe50d2d-066c-451d-a209-c5a9d84263a0'
        print(f"Testing get_vendor_quote_requests for vendor_id: {vendor_id}")
        
        try:
            result = crud.get_vendor_quote_requests(db, vendor_id)
            print(f"Success! Found {len(result)} quote requests")
            for req in result:
                print(f"  - {req.title} (ID: {req.id})")
        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_crud() 