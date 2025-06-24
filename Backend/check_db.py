#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from database import DATABASE_URL, SessionLocal
import crud
import models
from datetime import datetime

def check_database():
    print("🔍 Checking database status...")
    
    try:
        # Create database session
        db = SessionLocal()
        
        # Check employees
        employees = db.query(models.Employee).all()
        print(f"📊 Found {len(employees)} employees in database")
        
        # Check complaints
        complaints = db.query(models.Complaint).all()
        print(f"📋 Found {len(complaints)} complaints in database")
        
        if complaints:
            print("📝 Recent complaints:")
            for complaint in complaints[-3:]:  # Show last 3
                print(f"  - ID: {complaint.id}")
                print(f"    Title: {complaint.title}")
                print(f"    Employee: {complaint.employee_id}")
                print(f"    Status: {complaint.status}")
                print(f"    Asset ID: {complaint.asset_id}")
                print(f"    Images: {complaint.images}")
                print()
        
        # Check assets
        assets = db.query(models.Asset).all()
        print(f"🏢 Found {len(assets)} assets in database")
        
        # Test complaint creation with images
        print("\n🧪 Testing complaint retrieval...")
        test_complaints = crud.get_complaints(db, skip=0, limit=10)
        print(f"✅ Successfully retrieved {len(test_complaints)} complaints via CRUD")
        
        db.close()
        
    except Exception as e:
        print(f"❌ Database error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_database() 