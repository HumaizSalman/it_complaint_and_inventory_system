"""
Fix Script for Truncated Status Values
This script fixes the status values that were truncated during MySQL migration.
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

def fix_truncated_status_values():
    """Fix truncated status values in complaints table."""
    engine = create_mysql_connection()
    
    print("🔧 Fixing truncated status values...")
    
    try:
        with engine.connect() as conn:
            # Check current problematic status values
            result = conn.execute(text("""
                SELECT DISTINCT status FROM complaints 
                WHERE status LIKE 'pending_manager_appr%'
            """))
            
            problematic_statuses = [row[0] for row in result]
            print(f"Found problematic statuses: {problematic_statuses}")
            
            if 'pending_manager_appr' in problematic_statuses:
                # Fix the truncated status
                result = conn.execute(text("""
                    UPDATE complaints 
                    SET status = 'pending_manager_approval' 
                    WHERE status = 'pending_manager_appr'
                """))
                
                affected_rows = result.rowcount
                conn.commit()
                print(f"✅ Fixed {affected_rows} rows with 'pending_manager_appr' status")
            
            # Check for any other truncated statuses and fix them
            truncated_fixes = {
                'pending_manager_appr': 'pending_manager_approval',
                'pending_assistant_man': 'pending_assistant_manager_approval',
                'in_progress': 'in_progress',  # This one should be fine
                'resolved': 'resolved',        # This one should be fine
                'forwarded': 'forwarded',      # This one should be fine
                'open': 'open',                # This one should be fine
                'closed': 'closed'             # This one should be fine
            }
            
            for old_status, new_status in truncated_fixes.items():
                if old_status != new_status:  # Only update if different
                    result = conn.execute(text(f"""
                        UPDATE complaints 
                        SET status = :new_status 
                        WHERE status = :old_status
                    """), {'new_status': new_status, 'old_status': old_status})
                    
                    if result.rowcount > 0:
                        conn.commit()
                        print(f"✅ Fixed {result.rowcount} rows: '{old_status}' -> '{new_status}'")
            
            # Verify the fix
            result = conn.execute(text("SELECT DISTINCT status FROM complaints"))
            all_statuses = [row[0] for row in result]
            print(f"\n📊 Current status values in database: {all_statuses}")
            
        print("\n🎉 Status value fix completed!")
        return True
        
    except Exception as e:
        print(f"❌ Error fixing status values: {e}")
        return False

def main():
    print("🔧 MySQL Status Value Fix Script")
    print("=" * 40)
    
    if fix_truncated_status_values():
        print("\n✅ All status values have been fixed!")
        print("🔄 Restart your FastAPI server to see the changes")
    else:
        print("\n❌ Failed to fix status values")

if __name__ == "__main__":
    main() 