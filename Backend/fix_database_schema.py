"""
Fix Database Schema and Status Values
This script fixes the column size and corrects truncated status values.
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load environment variables
load_dotenv()

def create_mysql_connection():
    """Create connection to MySQL database."""
    db_user = os.getenv("DB_USER", "root")
    db_password = os.getenv("DB_PASSWORD", "")
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "3306")
    db_name = os.getenv("DB_NAME", "it_inventory_db")
    
    mysql_url = f"mysql+pymysql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    engine = create_engine(mysql_url, pool_pre_ping=True)
    return engine

def fix_database_schema():
    """Fix the database schema and status values."""
    engine = create_mysql_connection()
    
    print("🔧 Fixing database schema and status values...")
    
    try:
        with engine.connect() as conn:
            # Step 1: Increase column size for status
            print("📏 Increasing status column size...")
            conn.execute(text("ALTER TABLE complaints MODIFY COLUMN status VARCHAR(50)"))
            conn.commit()
            print("✅ Status column size increased to VARCHAR(50)")
            
            # Step 2: Fix truncated status values
            print("\n🔧 Fixing truncated status values...")
            
            # Fix the specific truncated value
            result = conn.execute(text("""
                UPDATE complaints 
                SET status = 'pending_manager_approval' 
                WHERE status = 'pending_manager_appr'
            """))
            
            if result.rowcount > 0:
                conn.commit()
                print(f"✅ Fixed {result.rowcount} complaints with truncated status")
            else:
                print("ℹ️  No truncated status values found to fix")
            
            # Step 3: Verify the fix
            print("\n📊 Verifying the fix...")
            result = conn.execute(text("SELECT DISTINCT status FROM complaints"))
            statuses = [row[0] for row in result]
            print(f"Current status values: {statuses}")
            
            # Check if any are still too long
            for status in statuses:
                if len(status) > 50:
                    print(f"⚠️  Status '{status}' is longer than 50 characters!")
            
        print("\n🎉 Database schema fix completed!")
        return True
        
    except Exception as e:
        print(f"❌ Error fixing database schema: {e}")
        return False

def main():
    print("🔧 Database Schema Fix")
    print("=" * 25)
    
    if fix_database_schema():
        print("\n✅ Database schema has been fixed!")
        print("📝 Next step: Update the ComplaintStatus enum in models.py")
        print("🔄 Then restart your FastAPI server")
    else:
        print("\n❌ Failed to fix database schema")

if __name__ == "__main__":
    main() 