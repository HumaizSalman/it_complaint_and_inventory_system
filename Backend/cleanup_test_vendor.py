#!/usr/bin/env python3
"""
Cleanup script to remove test vendor that's causing API issues
"""

import sys
import os
from sqlalchemy.orm import Session

# Add the backend directory to the path
sys.path.append(os.path.dirname(__file__))

from database import SessionLocal
from models import User, Vendor

def cleanup_test_vendor():
    """Remove test vendor and associated user"""
    
    db = SessionLocal()
    
    try:
        test_email = "test.vendor@example.com"
        
        # Find and delete vendor
        vendor = db.query(Vendor).filter(Vendor.email == test_email).first()
        if vendor:
            print(f"🗑️  Deleting vendor: {vendor.name} ({vendor.email})")
            db.delete(vendor)
        else:
            print(f"ℹ️  No vendor found with email: {test_email}")
        
        # Find and delete user
        user = db.query(User).filter(User.email == test_email).first()
        if user:
            print(f"🗑️  Deleting user: {user.email} (role: {user.role})")
            db.delete(user)
        else:
            print(f"ℹ️  No user found with email: {test_email}")
        
        # Commit changes
        db.commit()
        print("✅ Cleanup completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        db.rollback()
    finally:
        db.close()

def main():
    """Main function"""
    print("🧹 Cleaning up test vendor data")
    print("=" * 40)
    
    cleanup_test_vendor()
    
    print("\n" + "=" * 40)
    print("🎉 Cleanup completed!")

if __name__ == "__main__":
    main() 