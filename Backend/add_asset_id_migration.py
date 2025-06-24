#!/usr/bin/env python3
"""
Database migration script to add asset_id column to complaints table
"""

import sqlite3
import os
from pathlib import Path

def migrate_database():
    """Add asset_id column to complaints table if it doesn't exist"""
    
    # Database file path
    db_path = Path(__file__).parent / "it_inventory.db"
    
    if not db_path.exists():
        print(f"Database file not found: {db_path}")
        return False
    
    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if asset_id column already exists
        cursor.execute("PRAGMA table_info(complaints)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'asset_id' not in columns:
            print("Adding asset_id column to complaints table...")
            
            # Add asset_id column
            cursor.execute("""
                ALTER TABLE complaints 
                ADD COLUMN asset_id TEXT
            """)
            
            # Create index for better performance
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_complaints_asset_id 
                ON complaints(asset_id)
            """)
            
            conn.commit()
            print("✅ Successfully added asset_id column to complaints table")
        else:
            print("✅ asset_id column already exists in complaints table")
        
        # Verify the migration
        cursor.execute("PRAGMA table_info(complaints)")
        columns = cursor.fetchall()
        print("\nCurrent complaints table structure:")
        for column in columns:
            print(f"  - {column[1]} ({column[2]})")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error during migration: {str(e)}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return False

if __name__ == "__main__":
    print("Starting database migration...")
    success = migrate_database()
    
    if success:
        print("\n🎉 Migration completed successfully!")
    else:
        print("\n💥 Migration failed!")
        exit(1) 