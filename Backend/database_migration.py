#!/usr/bin/env python3
"""
Database migration script to add component_purchase_reason field to complaints table
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

# Add the backend directory to the path
sys.path.append(os.path.dirname(__file__))

from database import DATABASE_URL

def migrate_database():
    """Add component_purchase_reason column to complaints table"""
    
    engine = create_engine(DATABASE_URL)
    
    try:
        with engine.connect() as connection:
            # Check if the column already exists using SQLite PRAGMA
            check_sql = "PRAGMA table_info(complaints)"
            
            result = connection.execute(text(check_sql))
            columns = result.fetchall()
            
            # Check if component_purchase_reason column exists
            column_exists = any(col[1] == 'component_purchase_reason' for col in columns)
            
            if not column_exists:
                # Add the new column
                alter_sql = """
                ALTER TABLE complaints 
                ADD COLUMN component_purchase_reason TEXT
                """
                
                connection.execute(text(alter_sql))
                connection.commit()
                print("✅ Successfully added component_purchase_reason column to complaints table")
            else:
                print("ℹ️  component_purchase_reason column already exists in complaints table")
                
    except OperationalError as e:
        print(f"❌ Error during migration: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    migrate_database() 