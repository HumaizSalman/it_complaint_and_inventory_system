import sqlite3
from datetime import datetime, timedelta
import os
import json

def perform_maintenance():
    try:
        # Connect to the database
        conn = sqlite3.connect('it_inventory.db')
        cursor = conn.cursor()
        
        print("Starting database maintenance...")
        
        # 1. Archive old notifications (older than 30 days)
        archive_date = (datetime.utcnow() - timedelta(days=30)).strftime('%Y-%m-%d')
        cursor.execute("""
            DELETE FROM notifications 
            WHERE created_at < ? AND read = 1
        """, (archive_date,))
        print(f"Archived {cursor.rowcount} old notifications")
        
        # 2. Clean up any orphaned records
        cursor.execute("PRAGMA foreign_key_check")
        orphaned = cursor.fetchall()
        if orphaned:
            print(f"Found {len(orphaned)} orphaned records")
            # Log orphaned records for review
            with open('orphaned_records.log', 'a') as f:
                f.write(f"\n--- Maintenance run: {datetime.now()} ---\n")
                json.dump(orphaned, f, indent=2)
        
        # 3. Optimize database
        print("Optimizing database...")
        cursor.execute("PRAGMA optimize")
        cursor.execute("VACUUM")
        cursor.execute("ANALYZE")
        
        # 4. Check database integrity
        cursor.execute("PRAGMA integrity_check")
        integrity = cursor.fetchone()[0]
        print(f"Database integrity check: {integrity}")
        
        # Commit changes and close
        conn.commit()
        conn.close()
        
        print("Maintenance completed successfully!")
        
    except sqlite3.Error as e:
        print(f"Database error during maintenance: {e}")
    except Exception as e:
        print(f"Unexpected error during maintenance: {e}")

if __name__ == "__main__":
    perform_maintenance() 