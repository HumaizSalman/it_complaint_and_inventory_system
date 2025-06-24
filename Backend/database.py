import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Load environment variables from .env file
load_dotenv()

# Get database connection parameters from environment variables
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "it_inventory_db")
DB_TYPE = os.getenv("DB_TYPE", "sqlite").lower()  # Default to SQLite

# Create SQLite database URL as fallback
SQLITE_DATABASE_URL = "sqlite:///./it_inventory.db"

# Try to use MySQL if requested, fall back to SQLite
if DB_TYPE == "mysql":
    try:
        # Create MySQL database URL
        DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        
        # Test connection
        test_engine = create_engine(DATABASE_URL, pool_pre_ping=True)
        with test_engine.connect() as conn:
            pass  # Just testing connection
        
        print("Using MySQL database")
    except Exception as e:
        print(f"MySQL connection failed: {e}")
        print("Falling back to SQLite database")
        DATABASE_URL = SQLITE_DATABASE_URL
        DB_TYPE = "sqlite"
else:
    print("Using SQLite database")
    DATABASE_URL = SQLITE_DATABASE_URL
    DB_TYPE = "sqlite"

# Create the SQLAlchemy engine with appropriate parameters for the DB type
if DB_TYPE == "sqlite":
    # SQLite-specific parameters
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False
    )
else:
    # MySQL-specific parameters
    engine = create_engine(
        DATABASE_URL,
        echo=False,
        pool_pre_ping=True
    )

# Create a SessionLocal class for database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create a Base class for declarative models
Base = declarative_base() 