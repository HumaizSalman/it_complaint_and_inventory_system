#!/usr/bin/env python3
from database import SessionLocal
from models import User, Vendor, QuoteRequest, QuoteRequestVendor

def check_database():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        vendors = db.query(Vendor).all()
        quote_requests = db.query(QuoteRequest).all()
        quote_request_vendors = db.query(QuoteRequestVendor).all()
        
        print("=== DATABASE STATUS ===")
        print(f"Users ({len(users)}):")
        for user in users:
            print(f"  - {user.email} ({user.role})")
        
        print(f"\nVendors ({len(vendors)}):")
        for vendor in vendors:
            print(f"  - {vendor.email} - {vendor.name} (ID: {vendor.id})")
        
        print(f"\nQuote Requests ({len(quote_requests)}):")
        for qr in quote_requests:
            print(f"  - {qr.title} (ID: {qr.id})")
        
        print(f"\nQuote Request Vendors ({len(quote_request_vendors)}):")
        for qrv in quote_request_vendors:
            print(f"  - Request: {qrv.quote_request_id}, Vendor: {qrv.vendor_id}")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_database() 