#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text, MetaData, inspect
from database import DATABASE_URL, DB_TYPE
import pymysql

def migrate_mysql_database():
    """Add asset_id column to complaints table in MySQL database"""
    
    print("🚀 Starting MySQL database migration...")
    print(f"📊 Database Type: {DB_TYPE}")
    print(f"🔗 Database URL: {DATABASE_URL}")
    
    if DB_TYPE != "mysql":
        print("⚠️  This script is for MySQL only. Current database type is:", DB_TYPE)
        return False
        
    try:
        # Create engine
        engine = create_engine(DATABASE_URL, pool_pre_ping=True)
        
        # Connect to database
        with engine.connect() as conn:
            print("✅ Successfully connected to MySQL database")
            
            # Check if complaints table exists
            inspector = inspect(engine)
            tables = inspector.get_table_names()
            
            if 'complaints' not in tables:
                print("❌ Complaints table does not exist!")
                return False
                
            # Get current columns
            columns = inspector.get_columns('complaints')
            column_names = [col['name'] for col in columns]
            
            print("📋 Current complaints table columns:")
            for col_name in column_names:
                print(f"  - {col_name}")
                
            # Check if asset_id column already exists
            if 'asset_id' in column_names:
                print("✅ asset_id column already exists in complaints table")
                return True
                
            # Add asset_id column
            print("\n🔧 Adding asset_id column to complaints table...")
            
            alter_query = text("""
                ALTER TABLE complaints 
                ADD COLUMN asset_id VARCHAR(36) NULL
            """)
            
            conn.execute(alter_query)
            conn.commit()
            
            print("✅ Successfully added asset_id column to complaints table")
            
            # Verify the column was added
            inspector = inspect(engine)
            columns = inspector.get_columns('complaints')
            column_names = [col['name'] for col in columns]
            
            if 'asset_id' in column_names:
                print("✅ Verification successful: asset_id column is present")
                
                print("\n📊 Updated complaints table structure:")
                for col in columns:
                    print(f"  - {col['name']} ({col['type']})")
                    
                return True
            else:
                print("❌ Verification failed: asset_id column not found")
                return False
                
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = migrate_mysql_database()
    if success:
        print("\n🎉 Migration completed successfully!")
    else:
        print("\n💥 Migration failed!") 