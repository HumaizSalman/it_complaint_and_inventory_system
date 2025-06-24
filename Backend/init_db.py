import os
from dotenv import load_dotenv
import pymysql
from sqlalchemy import create_engine
import sys

# Load environment variables from .env file
load_dotenv()

# Get database connection parameters from environment variables
DB_TYPE = os.getenv("DB_TYPE", "sqlite").lower()
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_NAME = os.getenv("DB_NAME", "it_inventory_db")

def create_mysql_database():
    """Create the database if it doesn't exist."""
    try:
        # Connect to MySQL server without specifying a database
        connection = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            port=DB_PORT
        )
        
        with connection.cursor() as cursor:
            # Create database if it doesn't exist
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
            print(f"Database '{DB_NAME}' created or already exists.")
            
            # Grant privileges
            cursor.execute(f"GRANT ALL PRIVILEGES ON {DB_NAME}.* TO '{DB_USER}'@'%'")
            cursor.execute("FLUSH PRIVILEGES")
            print("Privileges granted.")
            
        connection.close()
        return True
    except Exception as e:
        print(f"Error creating MySQL database: {e}")
        return False

def init_tables():
    """Initialize the database tables."""
    try:
        from database import engine
        from models import Base
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully!")
        return True
    except Exception as e:
        print(f"Error initializing tables: {e}")
        return False

if __name__ == "__main__":
    print(f"Using database type: {DB_TYPE}")
    
    if DB_TYPE == "mysql":
        print("Creating MySQL database...")
        if not create_mysql_database():
            print("Failed to create MySQL database. Check your MySQL server and credentials.")
            sys.exit(1)
    
    print("Initializing database tables...")
    if init_tables():
        print("Database initialization completed successfully!")
    else:
        print("Failed to initialize database tables. Exiting.")
        sys.exit(1) 