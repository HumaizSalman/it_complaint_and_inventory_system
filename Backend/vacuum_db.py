import sqlite3
import os

def vacuum_database():
    try:
        # Connect to the database
        conn = sqlite3.connect('it_inventory.db')
        
        # Enable foreign key support
        conn.execute("PRAGMA foreign_keys = ON")
        
        # Get the current size
        current_size = os.path.getsize('it_inventory.db')
        print(f"Current database size: {current_size / 1024 / 1024:.2f} MB")
        
        # Vacuum the database
        print("Vacuuming database...")
        conn.execute("VACUUM")
        
        # Analyze the database
        print("Analyzing database...")
        conn.execute("ANALYZE")
        
        # Get the new size
        new_size = os.path.getsize('it_inventory.db')
        print(f"New database size: {new_size / 1024 / 1024:.2f} MB")
        print(f"Reduced by: {(current_size - new_size) / 1024 / 1024:.2f} MB")
        
        # Close the connection
        conn.close()
        print("Database optimization completed successfully!")
        
    except sqlite3.Error as e:
        print(f"An error occurred: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    vacuum_database() 