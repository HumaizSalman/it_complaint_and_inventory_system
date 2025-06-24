"""
Simple MySQL Connection Test
This script tests the MySQL connection with your .env credentials
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load environment variables
load_dotenv()

def test_connection():
    print("🔍 Testing MySQL Connection...")
    print("=" * 40)
    
    # Get credentials from .env
    db_type = os.getenv("DB_TYPE", "sqlite")
    db_user = os.getenv("DB_USER", "root")
    db_password = os.getenv("DB_PASSWORD", "")
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "3306")
    db_name = os.getenv("DB_NAME", "it_inventory_db")
    
    print(f"DB_TYPE: {db_type}")
    print(f"DB_USER: {db_user}")
    print(f"DB_HOST: {db_host}")
    print(f"DB_PORT: {db_port}")
    print(f"DB_NAME: {db_name}")
    print(f"DB_PASSWORD: {'*' * len(db_password) if db_password else '(empty)'}")
    
    if db_type != "mysql":
        print("❌ DB_TYPE is not set to 'mysql' in .env file")
        return False
    
    if not db_password:
        print("❌ DB_PASSWORD is empty in .env file")
        return False
    
    # Try to connect
    mysql_url = f"mysql+pymysql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    
    try:
        print(f"\n🔌 Attempting connection to: mysql+pymysql://{db_user}:***@{db_host}:{db_port}/{db_name}")
        engine = create_engine(mysql_url, pool_pre_ping=True)
        
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1 as test"))
            print("✅ Connection successful!")
            print(f"✅ Test query result: {result.fetchone()[0]}")
            
            # Check if database exists and show tables
            result = conn.execute(text("SHOW TABLES"))
            tables = [row[0] for row in result]
            print(f"📊 Found {len(tables)} tables: {tables}")
            
        return True
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        print("\nPossible solutions:")
        print("1. Check if MySQL server is running")
        print("2. Verify database 'it_inventory_db' exists")
        print("3. Check username and password in .env file")
        print("4. Ensure user has proper permissions")
        return False

if __name__ == "__main__":
    test_connection() 