"""
SQLite to MySQL Migration Script for IT Inventory App
This script migrates all data from the existing SQLite database to MySQL.
"""

import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import json
from datetime import datetime

# Load environment variables
load_dotenv()

def create_sqlite_connection():
    """Create connection to the existing SQLite database."""
    sqlite_url = "sqlite:///./it_inventory.db"
    engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
    return engine, sessionmaker(bind=engine)

def create_mysql_connection():
    """Create connection to the new MySQL database."""
    db_user = os.getenv("DB_USER", "root")
    db_password = os.getenv("DB_PASSWORD", "")
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "3306")
    db_name = os.getenv("DB_NAME", "it_inventory_db")
    
    mysql_url = f"mysql+pymysql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    
    try:
        engine = create_engine(mysql_url, pool_pre_ping=True)
        # Test connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Successfully connected to MySQL database")
        return engine, sessionmaker(bind=engine)
    except Exception as e:
        print(f"❌ Failed to connect to MySQL: {e}")
        print("\nPlease ensure:")
        print("1. MySQL server is running")
        print("2. Database 'it_inventory_db' exists")
        print("3. User credentials are correct in .env file")
        print("4. User has proper permissions")
        sys.exit(1)

def get_table_names(engine):
    """Get all table names from the database."""
    with engine.connect() as conn:
        if 'sqlite' in str(engine.url):
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"))
        else:
            result = conn.execute(text("SHOW TABLES"))
        
        tables = [row[0] for row in result]
        return tables

def migrate_table_data(sqlite_engine, mysql_engine, table_name):
    """Migrate data from SQLite table to MySQL table."""
    try:
        # Read data from SQLite
        with sqlite_engine.connect() as sqlite_conn:
            result = sqlite_conn.execute(text(f"SELECT * FROM {table_name}"))
            columns = result.keys()
            rows = result.fetchall()
        
        if not rows:
            print(f"  📭 Table '{table_name}' is empty - skipping")
            return True
        
        # Prepare insert statement for MySQL
        column_names = ", ".join(columns)
        placeholders = ", ".join([":{}".format(col) for col in columns])
        insert_sql = f"INSERT INTO {table_name} ({column_names}) VALUES ({placeholders})"
        
        # Insert data into MySQL
        with mysql_engine.connect() as mysql_conn:
            # Convert rows to dictionaries
            data = []
            for row in rows:
                row_dict = {}
                for i, col in enumerate(columns):
                    row_dict[col] = row[i]
                data.append(row_dict)
            
            # Execute batch insert
            mysql_conn.execute(text(insert_sql), data)
            mysql_conn.commit()
        
        print(f"  ✅ Migrated {len(rows)} rows from '{table_name}'")
        return True
        
    except Exception as e:
        print(f"  ❌ Error migrating table '{table_name}': {e}")
        return False

def create_mysql_tables():
    """Create all tables in MySQL using the existing models."""
    try:
        # Import models and database setup
        from models import Base
        from database import engine as mysql_engine
        
        # Create all tables
        Base.metadata.create_all(bind=mysql_engine)
        print("✅ Successfully created all tables in MySQL")
        return True
    except Exception as e:
        print(f"❌ Error creating tables in MySQL: {e}")
        return False

def backup_sqlite_database():
    """Create a backup of the SQLite database before migration."""
    try:
        backup_name = f"it_inventory_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
        import shutil
        shutil.copy2("it_inventory.db", backup_name)
        print(f"✅ Created backup: {backup_name}")
        return True
    except Exception as e:
        print(f"❌ Error creating backup: {e}")
        return False

def main():
    print("🔄 Starting SQLite to MySQL Migration")
    print("=" * 50)
    
    # Check if SQLite database exists
    if not os.path.exists("it_inventory.db"):
        print("❌ SQLite database 'it_inventory.db' not found")
        print("Make sure you're running this script from the Backend directory")
        sys.exit(1)
    
    # Create backup
    print("\n📋 Step 1: Creating backup...")
    if not backup_sqlite_database():
        print("⚠️  Backup failed, but continuing with migration...")
    
    # Create MySQL tables
    print("\n🏗️  Step 2: Creating MySQL tables...")
    if not create_mysql_tables():
        sys.exit(1)
    
    # Connect to databases
    print("\n🔌 Step 3: Connecting to databases...")
    sqlite_engine, sqlite_session = create_sqlite_connection()
    mysql_engine, mysql_session = create_mysql_connection()
    
    # Get tables to migrate
    tables = get_table_names(sqlite_engine)
    if not tables:
        print("❌ No tables found in SQLite database")
        sys.exit(1)
    
    print(f"📊 Found {len(tables)} tables to migrate: {', '.join(tables)}")
    
    # Define migration order (to handle foreign key dependencies)
    migration_order = [
        'users',
        'employees', 
        'vendors',
        'assets',
        'complaints',
        'replies',
        'maintenance_requests',
        'maintenance_records',
        'notifications',
        'quote_requests',
        'quote_request_vendors',
        'quote_responses'
    ]
    
    # Add any remaining tables not in the predefined order
    remaining_tables = [t for t in tables if t not in migration_order]
    migration_order.extend(remaining_tables)
    
    # Migrate data
    print("\n📦 Step 4: Migrating data...")
    success_count = 0
    
    for table in migration_order:
        if table in tables:
            print(f"\n  🔄 Migrating '{table}'...")
            if migrate_table_data(sqlite_engine, mysql_engine, table):
                success_count += 1
    
    # Summary
    print("\n" + "=" * 50)
    print("🎉 Migration Complete!")
    print(f"✅ Successfully migrated {success_count}/{len(tables)} tables")
    
    if success_count == len(tables):
        print("\n🚀 Your application is now ready to use MySQL!")
        print("💡 Don't forget to update your .env file with DB_TYPE=mysql")
    else:
        print(f"\n⚠️  {len(tables) - success_count} tables had issues during migration")
        print("Check the error messages above and fix any issues")

if __name__ == "__main__":
    main() 