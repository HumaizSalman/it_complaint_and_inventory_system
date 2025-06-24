"""
Fixed SQLite to MySQL Migration Script for IT Inventory App
This script handles MySQL-specific issues like reserved keywords and column constraints.
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

def clear_existing_data(mysql_engine, table_name):
    """Clear existing data from MySQL table to avoid conflicts."""
    try:
        with mysql_engine.connect() as conn:
            # Disable foreign key checks temporarily
            conn.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
            conn.execute(text(f"DELETE FROM {table_name}"))
            conn.execute(text("SET FOREIGN_KEY_CHECKS = 1"))
            conn.commit()
        return True
    except Exception as e:
        print(f"  ⚠️  Could not clear table '{table_name}': {e}")
        return False

def migrate_table_data_fixed(sqlite_engine, mysql_engine, table_name):
    """Migrate data from SQLite table to MySQL table with fixes for common issues."""
    try:
        # Read data from SQLite
        with sqlite_engine.connect() as sqlite_conn:
            result = sqlite_conn.execute(text(f"SELECT * FROM {table_name}"))
            columns = result.keys()
            rows = result.fetchall()
        
        if not rows:
            print(f"  📭 Table '{table_name}' is empty - skipping")
            return True
        
        # Clear existing data first
        clear_existing_data(mysql_engine, table_name)
        
        # Handle special cases for problematic tables
        if table_name == "assets":
            return migrate_assets_table(sqlite_engine, mysql_engine, rows)
        elif table_name == "notifications":
            return migrate_notifications_table(sqlite_engine, mysql_engine, rows)
        elif table_name == "complaints":
            return migrate_complaints_table(sqlite_engine, mysql_engine, rows)
        elif table_name == "quote_request_vendors":
            return migrate_quote_request_vendors_table(sqlite_engine, mysql_engine, rows)
        else:
            # Normal migration for other tables
            return migrate_normal_table(mysql_engine, table_name, columns, rows)
        
    except Exception as e:
        print(f"  ❌ Error migrating table '{table_name}': {e}")
        return False

def migrate_assets_table(sqlite_engine, mysql_engine, rows):
    """Special migration for assets table (handles 'condition' reserved keyword)."""
    try:
        with mysql_engine.connect() as mysql_conn:
            for row in rows:
                mysql_conn.execute(text("""
                    INSERT INTO assets 
                    (id, name, type, status, serial_number, `condition`, specifications, 
                     purchase_cost, purchase_date, expected_lifespan, total_repair_cost, 
                     next_maintenance_due, assigned_to_id, assigned_date, vendor_id, warranty_expiry)
                    VALUES 
                    (:id, :name, :type, :status, :serial_number, :condition, :specifications,
                     :purchase_cost, :purchase_date, :expected_lifespan, :total_repair_cost,
                     :next_maintenance_due, :assigned_to_id, :assigned_date, :vendor_id, :warranty_expiry)
                """), {
                    'id': row[0], 'name': row[1], 'type': row[2], 'status': row[3],
                    'serial_number': row[4], 'condition': row[5], 'specifications': row[6],
                    'purchase_cost': row[7], 'purchase_date': row[8], 'expected_lifespan': row[9],
                    'total_repair_cost': row[10], 'next_maintenance_due': row[11],
                    'assigned_to_id': row[12], 'assigned_date': row[13], 'vendor_id': row[14],
                    'warranty_expiry': row[15]
                })
            mysql_conn.commit()
        
        print(f"  ✅ Migrated {len(rows)} rows from 'assets' (with keyword fix)")
        return True
    except Exception as e:
        print(f"  ❌ Error migrating assets: {e}")
        return False

def migrate_notifications_table(sqlite_engine, mysql_engine, rows):
    """Special migration for notifications table (handles 'read' reserved keyword)."""
    try:
        with mysql_engine.connect() as mysql_conn:
            for row in rows:
                mysql_conn.execute(text("""
                    INSERT INTO notifications 
                    (id, user_id, message, created_at, `read`, type, related_id)
                    VALUES 
                    (:id, :user_id, :message, :created_at, :read, :type, :related_id)
                """), {
                    'id': row[0], 'user_id': row[1], 'message': row[2], 'created_at': row[3],
                    'read': row[4], 'type': row[5], 'related_id': row[6]
                })
            mysql_conn.commit()
        
        print(f"  ✅ Migrated {len(rows)} rows from 'notifications' (with keyword fix)")
        return True
    except Exception as e:
        print(f"  ❌ Error migrating notifications: {e}")
        return False

def migrate_complaints_table(sqlite_engine, mysql_engine, rows):
    """Special migration for complaints table (handles status length issues)."""
    try:
        with mysql_engine.connect() as mysql_conn:
            for row in rows:
                # Truncate status if too long (MySQL enum limit)
                status = str(row[5])[:20] if row[5] else 'open'
                
                mysql_conn.execute(text("""
                    INSERT INTO complaints 
                    (id, employee_id, title, description, priority, status, date_submitted, 
                     last_updated, images, assigned_to, resolution_notes, resolution_date, 
                     component_purchase_reason)
                    VALUES 
                    (:id, :employee_id, :title, :description, :priority, :status, :date_submitted,
                     :last_updated, :images, :assigned_to, :resolution_notes, :resolution_date,
                     :component_purchase_reason)
                """), {
                    'id': row[0], 'employee_id': row[1], 'title': row[2], 'description': row[3],
                    'priority': row[4], 'status': status, 'date_submitted': row[6],
                    'last_updated': row[7], 'images': row[8], 'assigned_to': row[9],
                    'resolution_notes': row[10], 'resolution_date': row[11],
                    'component_purchase_reason': row[12]
                })
            mysql_conn.commit()
        
        print(f"  ✅ Migrated {len(rows)} rows from 'complaints' (with status fix)")
        return True
    except Exception as e:
        print(f"  ❌ Error migrating complaints: {e}")
        return False

def migrate_quote_request_vendors_table(sqlite_engine, mysql_engine, rows):
    """Special migration for quote_request_vendors (handles foreign key constraints)."""
    try:
        # Get existing vendor IDs from MySQL
        with mysql_engine.connect() as mysql_conn:
            result = mysql_conn.execute(text("SELECT id FROM vendors"))
            valid_vendor_ids = {row[0] for row in result}
        
        migrated_count = 0
        skipped_count = 0
        
        with mysql_engine.connect() as mysql_conn:
            for row in rows:
                vendor_id = row[2]  # vendor_id is the 3rd column (index 2)
                
                # Only insert if vendor exists
                if vendor_id in valid_vendor_ids:
                    mysql_conn.execute(text("""
                        INSERT INTO quote_request_vendors 
                        (id, quote_request_id, vendor_id, sent_date, has_responded)
                        VALUES 
                        (:id, :quote_request_id, :vendor_id, :sent_date, :has_responded)
                    """), {
                        'id': row[0], 'quote_request_id': row[1], 'vendor_id': row[2],
                        'sent_date': row[3], 'has_responded': row[4]
                    })
                    migrated_count += 1
                else:
                    print(f"    ⚠️  Skipping row with invalid vendor_id: {vendor_id}")
                    skipped_count += 1
            
            mysql_conn.commit()
        
        print(f"  ✅ Migrated {migrated_count} rows from 'quote_request_vendors' ({skipped_count} skipped)")
        return True
    except Exception as e:
        print(f"  ❌ Error migrating quote_request_vendors: {e}")
        return False

def migrate_normal_table(mysql_engine, table_name, columns, rows):
    """Normal migration for tables without special issues."""
    try:
        # Prepare insert statement
        column_names = ", ".join(columns)
        placeholders = ", ".join([f":{col}" for col in columns])
        insert_sql = f"INSERT INTO {table_name} ({column_names}) VALUES ({placeholders})"
        
        # Insert data into MySQL
        with mysql_engine.connect() as mysql_conn:
            for row in rows:
                row_dict = {}
                for i, col in enumerate(columns):
                    row_dict[col] = row[i]
                mysql_conn.execute(text(insert_sql), row_dict)
            mysql_conn.commit()
        
        print(f"  ✅ Migrated {len(rows)} rows from '{table_name}'")
        return True
        
    except Exception as e:
        print(f"  ❌ Error migrating table '{table_name}': {e}")
        return False

def create_mysql_tables():
    """Create all tables in MySQL using the existing models."""
    try:
        from models import Base
        from database import engine as mysql_engine
        
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
    print("🔄 Starting Fixed SQLite to MySQL Migration")
    print("=" * 50)
    
    # Check if SQLite database exists
    if not os.path.exists("it_inventory.db"):
        print("❌ SQLite database 'it_inventory.db' not found")
        print("Make sure you're running this script from the Backend directory")
        sys.exit(1)
    
    # Create backup
    print("\n📋 Step 1: Creating backup...")
    backup_sqlite_database()
    
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
    print("\n📦 Step 4: Migrating data with fixes...")
    success_count = 0
    
    for table in migration_order:
        if table in tables and table != 'alembic_version':  # Skip alembic version table
            print(f"\n  🔄 Migrating '{table}'...")
            if migrate_table_data_fixed(sqlite_engine, mysql_engine, table):
                success_count += 1
    
    # Summary
    print("\n" + "=" * 50)
    print("🎉 Fixed Migration Complete!")
    print(f"✅ Successfully migrated {success_count} tables")
    
    if success_count >= len([t for t in tables if t != 'alembic_version']):
        print("\n🚀 Your application is now ready to use MySQL!")
        print("💡 Make sure your .env file has DB_TYPE=mysql")
        print("🔄 Restart your FastAPI server to use the new MySQL database")
    else:
        print(f"\n⚠️  Some tables may still have issues")
        print("Check the error messages above")

if __name__ == "__main__":
    main() 