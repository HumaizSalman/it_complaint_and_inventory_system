"""
Check Current Status Values in Database
This script checks what status values are currently being used in the database.
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

def check_status_values():
    """Check current status values in complaints table."""
    engine = create_mysql_connection()
    
    print("🔍 Checking current status values...")
    
    try:
        with engine.connect() as conn:
            # Get all distinct status values
            result = conn.execute(text("SELECT DISTINCT status FROM complaints"))
            statuses = [row[0] for row in result]
            
            print(f"📊 Found status values: {statuses}")
            
            # Get count for each status
            for status in statuses:
                result = conn.execute(text("SELECT COUNT(*) FROM complaints WHERE status = :status"), {'status': status})
                count = result.fetchone()[0]
                print(f"  - '{status}': {count} complaints")
            
            # Check column definition
            result = conn.execute(text("DESCRIBE complaints"))
            for row in result:
                if row[0] == 'status':
                    print(f"\n📋 Column definition: {row}")
                    break
            
        return statuses
        
    except Exception as e:
        print(f"❌ Error checking status values: {e}")
        return []

def main():
    print("🔍 Status Values Analysis")
    print("=" * 30)
    
    statuses = check_status_values()
    
    if statuses:
        print(f"\n💡 Recommendations:")
        print(f"1. Update the ComplaintStatus enum to include all these values")
        print(f"2. Increase the status column size to accommodate longer values")
        
        # Show which ones might be truncated
        long_statuses = [s for s in statuses if len(s) > 20]
        if long_statuses:
            print(f"3. These statuses are longer than 20 chars: {long_statuses}")

if __name__ == "__main__":
    main() 