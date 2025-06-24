#!/usr/bin/env python3
"""
Test script for verifying notification functionality in the backend.
This script creates a test notification directly in the database.
"""

import sys
import os
import json
from datetime import datetime
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# Add parent directory to path to import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import SessionLocal, engine
from models import Notification, User

def create_test_notification():
    """Create a test notification for an employee user"""
    db = SessionLocal()
    try:
        # Find an employee user
        employee_user = db.query(User).filter(User.role == "employee").first()
        if not employee_user:
            print("❌ No employee user found in database")
            return False
        
        print(f"✅ Found employee user: {employee_user.email} (ID: {employee_user.id})")
        
        # Create a test notification
        notification_id = str(uuid.uuid4())
        test_notification = Notification(
            id=notification_id,
            user_id=employee_user.id,
            message=f"Test complaint resolution notification created at {datetime.utcnow().isoformat()}",
            type="complaint_resolved",
            related_id="test-complaint-id",
            created_at=datetime.utcnow(),
            read=False
        )
        
        db.add(test_notification)
        db.commit()
        db.refresh(test_notification)
        
        print(f"✅ Created test notification with ID: {notification_id}")
        print(f"   - User ID: {test_notification.user_id}")
        print(f"   - Message: {test_notification.message}")
        print(f"   - Type: {test_notification.type}")
        print(f"   - Created: {test_notification.created_at}")
        
        return True
    except Exception as e:
        print(f"❌ Error creating test notification: {str(e)}")
        return False
    finally:
        db.close()

def list_recent_notifications():
    """List recent notifications in the database"""
    db = SessionLocal()
    try:
        notifications = db.query(Notification).order_by(Notification.created_at.desc()).limit(5).all()
        
        print(f"\n📋 Recent Notifications ({len(notifications)}):")
        for i, notification in enumerate(notifications):
            print(f"\n{i+1}. ID: {notification.id}")
            print(f"   User ID: {notification.user_id}")
            print(f"   Message: {notification.message}")
            print(f"   Type: {notification.type}")
            print(f"   Created: {notification.created_at}")
            print(f"   Read: {notification.read}")
            print(f"   Related ID: {notification.related_id}")
    except Exception as e:
        print(f"❌ Error listing notifications: {str(e)}")
    finally:
        db.close()

def list_users():
    """List users in the database"""
    db = SessionLocal()
    try:
        users = db.query(User).all()
        
        print(f"\n👥 Users ({len(users)}):")
        for i, user in enumerate(users):
            print(f"{i+1}. ID: {user.id}")
            print(f"   Email: {user.email}")
            print(f"   Role: {user.role}")
    except Exception as e:
        print(f"❌ Error listing users: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    print("🔔 Notification Test Script")
    print("=" * 50)
    
    # List users
    list_users()
    
    # Create test notification
    success = create_test_notification()
    
    # List recent notifications
    list_recent_notifications()
    
    if success:
        print("\n✅ Test notification created successfully!")
        print("\nNext steps:")
        print("1. Login as an employee user")
        print("2. Check the notification bell icon")
        print("3. Verify the test notification appears")
    else:
        print("\n❌ Failed to create test notification") 