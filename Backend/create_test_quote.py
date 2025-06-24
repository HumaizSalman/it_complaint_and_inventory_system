#!/usr/bin/env python3
from database import SessionLocal
from models import User, Vendor, QuoteRequest, QuoteRequestVendor
from datetime import datetime, timedelta
import uuid

def create_test_quote():
    db = SessionLocal()
    
    try:
        # Get manager and vendor
        manager = db.query(User).filter(User.email == 'manager@test.com').first()
        vendor = db.query(Vendor).filter(Vendor.email == 'vendor@test.com').first()
        
        if manager and vendor:
            # Create quote request
            quote_request = QuoteRequest(
                id=str(uuid.uuid4()),
                title='Test Quote Request for Vendor Portal',
                description='Testing the vendor portal functionality',
                requirements='Test requirements',
                budget=5000.0,
                priority='medium',
                status='open',
                created_by_id=manager.id,
                due_date=datetime.now() + timedelta(days=30)
            )
            db.add(quote_request)
            db.commit()
            
            # Add vendor to quote request
            qrv = QuoteRequestVendor(
                id=str(uuid.uuid4()),
                quote_request_id=quote_request.id,
                vendor_id=vendor.id
            )
            db.add(qrv)
            db.commit()
            
            print('Quote request created and vendor assigned')
            print(f'Quote Request ID: {quote_request.id}')
            print(f'Vendor ID: {vendor.id}')
        else:
            print('Manager or vendor not found')
            print(f'Manager found: {manager is not None}')
            print(f'Vendor found: {vendor is not None}')
    
    finally:
        db.close()

if __name__ == "__main__":
    create_test_quote() 