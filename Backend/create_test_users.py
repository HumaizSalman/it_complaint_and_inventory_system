#!/usr/bin/env python3
"""
Script to create test users for component purchase flow testing
"""

import sys
import os
from sqlalchemy.orm import Session

# Add the backend directory to the path
sys.path.append(os.path.dirname(__file__))

from database import SessionLocal
from auth import get_password_hash
from models import User
import uuid

def create_test_users():
    """Create test users for different roles"""
    
    db = SessionLocal()
    
    try:
        # Test users data
        test_users = [
            {
                "email": "ats@company.com",
                "password": "password123",
                "role": "ats"
            },
            {
                "email": "assistant.manager@company.com", 
                "password": "password123",
                "role": "assistant_manager"
            },
            {
                "email": "manager@company.com",
                "password": "password123", 
                "role": "manager"
            },
            {
                "email": "employee@company.com",
                "password": "password123",
                "role": "employee"
            },
            {
                "email": "admin@company.com",
                "password": "password123",
                "role": "admin"
            }
        ]
        
        created_users = []
        
        for user_data in test_users:
            # Check if user already exists
            existing_user = db.query(User).filter(User.email == user_data["email"]).first()
            
            if existing_user:
                print(f"⚠️  User {user_data['email']} already exists, skipping...")
                continue
            
            # Create new user
            hashed_password = get_password_hash(user_data["password"])
            
            new_user = User(
                id=str(uuid.uuid4()),
                email=user_data["email"],
                password=hashed_password,
                role=user_data["role"],
                is_active=True
            )
            
            db.add(new_user)
            created_users.append(user_data)
        
        # Commit all changes
        db.commit()
        
        if created_users:
            print("✅ Successfully created the following test users:")
            print("-" * 50)
            for user in created_users:
                print(f"Email: {user['email']}")
                print(f"Password: {user['password']}")
                print(f"Role: {user['role']}")
                print("-" * 30)
        else:
            print("ℹ️  All test users already exist")
        
        print(f"\n📝 Total users in database: {db.query(User).count()}")
        
    except Exception as e:
        print(f"❌ Error creating test users: {e}")
        db.rollback()
    finally:
        db.close()

def main():
    """Main function"""
    print("🚀 Creating test users for Component Purchase Flow testing")
    print("=" * 60)
    
    create_test_users()
    
    print("\n" + "=" * 60)
    print("🎉 Test user creation completed!")
    print("\nUse these credentials to test the component purchase flow:")
    print("- ATS: ats@company.com / password123")
    print("- Assistant Manager: assistant.manager@company.com / password123") 
    print("- Manager: manager@company.com / password123")
    print("- Employee: employee@company.com / password123")
    print("- Admin: admin@company.com / password123")

if __name__ == "__main__":
    main() 