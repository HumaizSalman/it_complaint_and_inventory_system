from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, and_, or_
from typing import List, Optional
import crud, models, schemas, auth
from database import SessionLocal, engine
from auth import get_current_active_user
from models import User
import os
import uuid
import json
from datetime import datetime, timedelta
import base64
from pathlib import Path
from fastapi import BackgroundTasks
import requests

# Import local modules
import crud
import models
import schemas
from database import SessionLocal, engine, Base
from auth import (
    create_access_token,
    get_current_active_user,
    get_current_user,
    get_user_with_role,
    verify_password,
    get_password_hash,
)
from models import (
    User, Employee, Complaint, Asset, Vendor, 
    QuoteRequest, QuoteRequestVendor, QuoteResponse,
    QuoteRequestStatus, QuoteResponseStatus, Notification
)
# Import email service and password utilities
from email_service import send_employee_credentials, send_vendor_credentials, get_email_configuration_status
from password_utils import generate_employee_password, generate_vendor_password

# Initialize FastAPI app
app = FastAPI(title="IT Inventory Management System", version="1.0.0")

# Configure image upload directory
UPLOAD_DIR = Path("uploads/complaint_images")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Mount static files for serving uploaded images
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database session dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Access token settings
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8  # 8 hours

# User endpoints
@app.post("/token", response_model=schemas.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    try:
        # Authenticate user
        user = db.query(User).filter(User.email == form_data.username).first()
        if not user or not verify_password(form_data.password, user.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"user_id": user.id},
            expires_delta=access_token_expires
        )
        
        # Get employee ID if user is an employee
        employee = None
        if user.role == "employee":
            employee = db.query(Employee).filter(Employee.email == user.email).first()
            
        # Update last login
        user.last_login = datetime.utcnow()
        db.commit()
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "employee_id": employee.id if employee else None
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )

@app.get("/users/me", response_model=schemas.UserResponse)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

# Add a new endpoint to get employee by email
@app.get("/employees/by-email/{email}", response_model=schemas.EmployeeResponse)
async def get_employee_by_email(
    email: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    employee = crud.get_employee_by_email(db, email)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee

@app.get("/employees/all", response_model=List[schemas.EmployeeResponse])
async def get_all_employees(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Debug info
    print(f"Fetching all employees")
    print(f"Current user: ID={current_user.id}, email={current_user.email}, role={current_user.role}")
    
    # Only managers, assistant managers and admins can view all employees
    if current_user.role not in ["admin", "manager", "assistant_manager"]:
        print(f"Authorization failed: User {current_user.email} role {current_user.role} tried to access all employees")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Not authorized to view all employees"
        )
    
    employees = crud.get_employees(db, skip=skip, limit=limit)
    print(f"Found {len(employees)} employees")
    return employees

# Create a new model that extends EmployeeResponse for just the creation response
class EmployeeCreateResponse(schemas.EmployeeResponse):
    temp_password: Optional[str] = None
    username: Optional[str] = None

@app.post("/employees/", response_model=EmployeeCreateResponse)
async def create_employee(
    employee_data: schemas.EmployeeCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Debug info
    print(f"Creating employee: {employee_data.name}, {employee_data.email}")
    print(f"Current user: ID={current_user.id}, email={current_user.email}, role={current_user.role}")
    
    # Only managers and admins can create employees
    if current_user.role not in ["admin", "manager"]:
        print(f"Authorization failed: User {current_user.email} role {current_user.role} tried to create employee")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Not authorized to create employees"
        )
    
    # Check if employee with this email already exists
    existing_employee = crud.get_employee_by_email(db, employee_data.email)
    if existing_employee:
        print(f"Employee with email {employee_data.email} already exists")
        raise HTTPException(status_code=400, detail="Employee with this email already exists")
    
    # Generate secure temporary password
    temp_password = generate_employee_password()
    
    # Create user account for the employee
    user_data = schemas.UserCreate(
        email=employee_data.email,
        password=temp_password,  # Use generated secure password - will be hashed in create_user
        role="employee"
    )
    
    try:
        # Create user first
        user = crud.create_user(db, user_data)
        print(f"Created user with ID: {user.id}, email: {user.email}")
        
        # Then create employee record linked to the user
        employee = crud.create_employee(db, employee_data, user.id)
        print(f"Created employee with ID: {employee.id}, name: {employee.name}")
        
        # Prepare email data
        email_data = {
            "name": employee.name,
            "email": employee.email,
            "temp_password": temp_password
        }
        
        # Send credentials email in background
        background_tasks.add_task(send_employee_credentials, email_data)
        print(f"Queued credentials email for employee: {employee.email}")
        
        # Return employee with additional login credentials
        return {
            **employee.__dict__,
            "temp_password": temp_password,
            "username": employee.email
        }
    except Exception as e:
        print(f"Error creating employee: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create employee: {str(e)}")

@app.put("/employees/{employee_id}", response_model=schemas.EmployeeResponse)
async def update_employee(
    employee_id: str,
    employee_data: schemas.EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Debug info
    print(f"Updating employee with ID: {employee_id}")
    print(f"Current user: ID={current_user.id}, email={current_user.email}, role={current_user.role}")
    
    # Only managers and admins can update employees
    if current_user.role not in ["admin", "manager"]:
        print(f"Authorization failed: User {current_user.email} role {current_user.role} tried to update employee")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Not authorized to update employees"
        )
    
    # First check if employee exists
    employee = crud.get_employee(db, employee_id)
    if not employee:
        print(f"Employee not found with ID: {employee_id}")
        raise HTTPException(status_code=404, detail="Employee not found")
    
    print(f"Found employee: {employee.id}, {employee.name}, {employee.email}")
    
    # If email is being changed, check if the new email is already in use
    if employee_data.email and employee_data.email != employee.email:
        existing_employee = crud.get_employee_by_email(db, employee_data.email)
        if existing_employee and existing_employee.id != employee_id:
            print(f"Employee with email {employee_data.email} already exists")
            raise HTTPException(status_code=400, detail="Email already in use by another employee")
    
    # Update the employee
    update_data = employee_data.dict(exclude_unset=True)
    updated_employee = crud.update_employee(db, employee_id, **update_data)
    
    if not updated_employee:
        raise HTTPException(status_code=500, detail="Failed to update employee")
    
    print(f"Successfully updated employee: {updated_employee.id}, {updated_employee.name}")
    return updated_employee

@app.delete("/employees/{employee_id}")
async def delete_employee(
    employee_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Debug info
    print(f"Deleting employee with ID: {employee_id}")
    print(f"Current user: ID={current_user.id}, email={current_user.email}, role={current_user.role}")
    
    # Only managers and admins can delete employees
    if current_user.role not in ["admin", "manager"]:
        print(f"Authorization failed: User {current_user.email} role {current_user.role} tried to delete employee")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Not authorized to delete employees"
        )
    
    # Check if employee exists
    employee = crud.get_employee(db, employee_id)
    if not employee:
        print(f"Employee not found with ID: {employee_id}")
        raise HTTPException(status_code=404, detail="Employee not found")
    
    print(f"Found employee: {employee.id}, {employee.name}, {employee.email}")
    
    # Delete the employee record
    if not crud.delete_employee(db, employee_id):
        raise HTTPException(status_code=500, detail="Failed to delete employee")
    
    # Also delete associated user account
    user = db.query(User).filter(User.email == employee.email).first()
    if user:
        crud.delete_user(db, user.id)
        print(f"Deleted associated user account: {user.id}, {user.email}")
    
    print(f"Successfully deleted employee: {employee_id}")
    return {"message": "Employee deleted successfully"}

@app.get("/employees/{employee_id}", response_model=schemas.EmployeeResponse)
async def get_employee_by_id(
    employee_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Debug info
    print(f"Fetching employee with ID: {employee_id}")
    print(f"Current user: ID={current_user.id}, email={current_user.email}, role={current_user.role}")
    
    # Get the employee from the database
    employee = crud.get_employee(db, employee_id)
    if not employee:
        print(f"Employee not found with ID: {employee_id}")
        raise HTTPException(status_code=404, detail="Employee not found")
    
    print(f"Found employee: {employee.id}, {employee.name}, {employee.email}")
    
    # Verify access permissions
    # Users can access their own records, or admins/managers can access any employee
    authorized = (
        current_user.role in ["admin", "manager", "assistant_manager"] or 
        current_user.email == employee.email
    )
    
    if not authorized:
        print(f"Authorization failed: User {current_user.email} tried to access employee {employee.email}")
        raise HTTPException(status_code=403, detail="Not authorized to view this employee's details")
    
    return employee

@app.get("/employees/{employee_id}/user", response_model=schemas.UserResponse)
async def get_user_by_employee_id(
    employee_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get user associated with an employee ID."""
    try:
        # First get the employee
        employee = db.query(Employee).filter(Employee.id == employee_id).first()
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found"
            )
        
        # Then get the user with matching email
        user = db.query(User).filter(User.email == employee.email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No user account found for this employee"
            )
        
        return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving user data: {str(e)}"
        )

# Complaint management endpoints - Employee Portal
@app.post("/complaints/", response_model=schemas.ComplaintResponse)
async def create_new_complaint(
    complaint: schemas.ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        # Debug logging
        print(f"Creating complaint with employee_id: {complaint.employee_id}")
        print(f"Current user ID: {current_user.id}, role: {current_user.role}, email: {current_user.email}")
        
        # First, try to get the employee using the provided employee_id
        employee = crud.get_employee(db, complaint.employee_id)
        
        # Debug info about the employee
        if employee:
            print(f"Found employee with provided ID: {employee.id}, {employee.name}, {employee.email}")
            print(f"Current user email: {current_user.email}, employee email: {employee.email}")
        
        # Authorization check - use email comparison for employees
        authorized = (
            current_user.role in ["admin", "ats", "assistant_manager", "manager"] or
            (employee and current_user.email == employee.email)
        )
        
        if not authorized:
            print(f"Authorization failed: User {current_user.email} cannot create complaint for employee {employee.email if employee else 'unknown'}")
            raise HTTPException(
                status_code=403,
                detail="Not authorized to create complaint for this employee"
            )
        
        # Additional validation for title and description
        if not complaint.title or len(complaint.title.strip()) < 5:
            raise HTTPException(status_code=422, detail="Title must be at least 5 characters")
        
        if not complaint.description or len(complaint.description.strip()) < 10:
            raise HTTPException(status_code=422, detail="Description must be at least 10 characters")
            
        # Create the complaint
        new_complaint = crud.create_complaint(db, complaint)
        print(f"Successfully created complaint with ID: {new_complaint.id}")
        return new_complaint
    except HTTPException:
        # Re-raise HTTP exceptions as they already have status codes
        raise
    except Exception as e:
        # Log the error
        print(f"Error creating complaint: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create complaint: {str(e)}")

# New endpoint for creating complaints with image uploads
@app.post("/complaints/with-images/", response_model=schemas.ComplaintResponse)
async def create_complaint_with_images(
    title: str = Form(...),
    description: str = Form(...),
    priority: str = Form(...),
    employee_id: str = Form(...),
    asset_id: str = Form(None),
    images: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new complaint with optional image uploads"""
    try:
        # Validate and save images
        image_paths = []
        if images and len(images) > 0 and images[0].filename:  # Check if images were actually uploaded
            if len(images) > 5:
                raise HTTPException(
                    status_code=400,
                    detail="Maximum 5 images allowed per complaint"
                )
            
            for image in images:
                if not validate_image_file(image):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid file: {image.filename}. Only JPG, PNG, GIF, WEBP files under 5MB are allowed."
                    )
                
                file_path = save_uploaded_image(image)
                image_paths.append(file_path)
        
        # Create complaint data
        complaint_data = schemas.ComplaintCreate(
            title=title,
            description=description,
            priority=priority,
            employee_id=employee_id,
            images=image_paths
        )
        
        # Add asset_id if provided
        if asset_id:
            complaint_data.asset_id = asset_id
        
        # Authorization check
        employee = crud.get_employee(db, employee_id)
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        authorized = (
            current_user.role in ["admin", "ats", "assistant_manager", "manager"] or
            current_user.email == employee.email
        )
        
        if not authorized:
            raise HTTPException(
                status_code=403,
                detail="Not authorized to create complaint for this employee"
            )
        
        # Validation
        if len(title.strip()) < 5:
            raise HTTPException(status_code=422, detail="Title must be at least 5 characters")
        
        if len(description.strip()) < 10:
            raise HTTPException(status_code=422, detail="Description must be at least 10 characters")
        
        # Create complaint
        new_complaint = crud.create_complaint(db, complaint_data)
        return new_complaint
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating complaint with images: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create complaint: {str(e)}")

@app.get("/employees/{employee_id}/complaints", response_model=List[schemas.ComplaintResponse])
async def get_employee_complaints(
    employee_id: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Debug info
    print(f"Fetching complaints for employee_id: {employee_id}")
    print(f"Current user: ID={current_user.id}, email={current_user.email}, role={current_user.role}")
    
    # Verify employee exists
    employee = crud.get_employee(db, employee_id)
    if not employee:
        print(f"Employee not found with ID: {employee_id}")
        raise HTTPException(status_code=404, detail="Employee not found")
    
    print(f"Found employee: {employee.id}, {employee.name}, {employee.email}")
    
    # Verify current user is either the employee or has permission
    # Use email comparison for employees rather than ID comparison
    authorized = (
        current_user.role in ["admin", "ats", "assistant_manager", "manager"] or 
        current_user.email == employee.email or
        current_user.id == employee.id
    )
    
    if not authorized:
        print(f"Authorization failed: User {current_user.email} tried to access {employee.email}'s complaints")
        raise HTTPException(status_code=403, detail="Not authorized to view this employee's complaints")
    
    return crud.get_employee_complaints(db, employee_id, skip, limit)

# Add the DELETE endpoint
@app.delete("/complaints/{complaint_id}")
async def delete_complaint_record(
    complaint_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Debug logging
    print(f"Attempting to delete complaint with ID: {complaint_id}")
    print(f"Current user: ID={current_user.id}, email={current_user.email}, role={current_user.role}")
    
    # Fetch the complaint
    complaint = crud.get_complaint(db, complaint_id)
    if not complaint:
        print(f"Complaint not found with ID: {complaint_id}")
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    # Get the employee associated with the complaint
    employee = crud.get_employee(db, complaint.employee_id)
    if not employee:
        print(f"Employee not found for complaint's employee_id: {complaint.employee_id}")
        raise HTTPException(status_code=404, detail="Employee for this complaint not found")
    
    print(f"Found complaint by employee: {employee.name}, {employee.email}")
    
    # Check permissions - user can delete their own complaints or admin can delete any
    # Use email comparison for employees rather than ID comparison
    authorized = (
        current_user.role == "admin" or 
        current_user.email == employee.email
    )
    
    if not authorized:
        print(f"Authorization failed: User {current_user.email} tried to delete complaint by {employee.email}")
        raise HTTPException(status_code=403, detail="Not authorized to delete this complaint")
    
    # Delete the complaint
    if not crud.delete_complaint(db, complaint_id):
        raise HTTPException(status_code=500, detail="Failed to delete complaint")
    
    print(f"Successfully deleted complaint with ID: {complaint_id}")
    return {"message": "Complaint deleted successfully"}

# Get all complaints
@app.get("/complaints/all", response_model=List[schemas.ComplaintResponse])
async def get_all_complaints(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Only users with appropriate roles can see all complaints
    if current_user.role not in ["ats", "assistant_manager", "manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view all complaints"
        )
    
    return crud.get_complaints(db, skip=skip, limit=limit, status=status)

# Add PATCH endpoint for updating complaints
@app.patch("/complaints/{complaint_id}", response_model=schemas.ComplaintResponse)
async def update_complaint_patch(
    complaint_id: str,
    complaint_update: schemas.ComplaintUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Debug logging
    print(f"PATCH: Updating complaint with ID: {complaint_id}")
    print(f"Current user: ID={current_user.id}, email={current_user.email}, role={current_user.role}")
    print(f"Update data: {complaint_update}")
    
    # Fetch the complaint
    complaint = crud.get_complaint(db, complaint_id)
    if not complaint:
        print(f"Complaint not found with ID: {complaint_id}")
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    # Check permissions based on role
    if current_user.role not in ["admin", "ats", "assistant_manager", "manager"]:
        # Regular employee can only update their own complaints
        employee = crud.get_employee(db, complaint.employee_id)
        if not employee or current_user.email != employee.email:
            print(f"Authorization failed: User {current_user.email} tried to update complaint by {employee.email if employee else 'unknown'}")
            raise HTTPException(status_code=403, detail="Not authorized to update this complaint")
    
    # Update the complaint
    update_data = complaint_update.dict(exclude_unset=True)
    updated_complaint = crud.update_complaint(db, complaint_id, **update_data)
    
    if not updated_complaint:
        raise HTTPException(status_code=500, detail="Failed to update complaint")
    
    print(f"Successfully updated complaint with ID: {updated_complaint.id}")
    return updated_complaint

# Also add PUT endpoint for full updates
@app.put("/complaints/{complaint_id}", response_model=schemas.ComplaintResponse)
async def update_complaint_put(
    complaint_id: str,
    complaint_update: schemas.ComplaintUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Debug logging
    print(f"PUT: Updating complaint with ID: {complaint_id}")
    print(f"Current user: ID={current_user.id}, email={current_user.email}, role={current_user.role}")
    print(f"Update data: {complaint_update}")
    
    # Fetch the complaint
    complaint = crud.get_complaint(db, complaint_id)
    if not complaint:
        print(f"Complaint not found with ID: {complaint_id}")
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    # Check permissions based on role
    if current_user.role not in ["admin", "ats", "assistant_manager", "manager"]:
        # Regular employee can only update their own complaints
        employee = crud.get_employee(db, complaint.employee_id)
        if not employee or current_user.email != employee.email:
            print(f"Authorization failed: User {current_user.email} tried to update complaint by {employee.email if employee else 'unknown'}")
            raise HTTPException(status_code=403, detail="Not authorized to update this complaint")
    
    # Update the complaint
    update_data = complaint_update.dict(exclude_unset=True)
    updated_complaint = crud.update_complaint(db, complaint_id, **update_data)
    
    if not updated_complaint:
        raise HTTPException(status_code=500, detail="Failed to update complaint")
    
    print(f"Successfully updated complaint with ID: {updated_complaint.id}")
    return updated_complaint

# Asset Management Endpoints
@app.get("/assets/", response_model=List[schemas.AssetResponse])
async def get_all_assets(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check permission - any authenticated user can view assets
    assets = crud.get_assets(db, skip=skip, limit=limit, status=status)
    return assets

@app.get("/assets/{asset_id}", response_model=schemas.AssetResponse)
async def get_asset_by_id(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    asset = crud.get_asset(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset

@app.get("/employees/{employee_id}/assets", response_model=List[schemas.AssetResponse])
async def get_employee_assets(
    employee_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Verify user can access this employee's assets
    # Users can access their own assets, or managers/admins can access any employee's assets
    employee = crud.get_employee(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    authorized = (
        current_user.role in ["admin", "manager", "assistant_manager"] or 
        current_user.email == employee.email
    )
    
    if not authorized:
        raise HTTPException(status_code=403, detail="Not authorized to view this employee's assets")
    
    assets = crud.get_employee_assets(db, employee_id)
    return assets

@app.post("/assets/", response_model=schemas.AssetResponse)
async def create_asset(
    asset_data: schemas.AssetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Only managers, assistant managers, and admins can create assets
    if current_user.role not in ["admin", "manager", "assistant_manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Not authorized to create assets"
        )
    
    # Check if an asset with this serial number already exists
    existing_asset = db.query(Asset).filter(Asset.serial_number == asset_data.serial_number).first()
    if existing_asset:
        raise HTTPException(status_code=400, detail="Asset with this serial number already exists")
    
    asset = crud.create_asset(db, asset_data)
    return asset

@app.put("/assets/{asset_id}", response_model=schemas.AssetResponse)
async def update_asset(
    asset_id: str,
    asset_data: schemas.AssetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Only managers, assistant managers, and admins can update assets
    if current_user.role not in ["admin", "manager", "assistant_manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Not authorized to update assets"
        )
    
    # Check if asset exists
    asset = crud.get_asset(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Update the asset
    update_data = asset_data.dict(exclude_unset=True)
    updated_asset = crud.update_asset(db, asset_id, **update_data)
    
    if not updated_asset:
        raise HTTPException(status_code=500, detail="Failed to update asset")
    
    return updated_asset

@app.delete("/assets/{asset_id}")
async def delete_asset(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Only managers and admins can delete assets
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Not authorized to delete assets"
        )
    
    # Check if asset exists
    asset = crud.get_asset(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Delete the asset
    if not crud.delete_asset(db, asset_id):
        raise HTTPException(status_code=500, detail="Failed to delete asset")
    
    return {"message": "Asset deleted successfully"}

@app.post("/assets/{asset_id}/assign", response_model=schemas.AssetResponse)
async def assign_asset_to_employee(
    asset_id: str,
    assign_data: schemas.AssetAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Only managers, assistant managers, and admins can assign assets
    if current_user.role not in ["admin", "manager", "assistant_manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Not authorized to assign assets"
        )
    
    # Check if asset exists
    asset = crud.get_asset(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Check if employee exists
    employee = crud.get_employee(db, assign_data.employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Assign the asset
    updated_asset = crud.assign_asset(db, asset_id, assign_data.employee_id)
    if not updated_asset:
        raise HTTPException(status_code=500, detail="Failed to assign asset")
    
    return updated_asset

@app.put("/assets/{asset_id}/unassign", response_model=schemas.AssetResponse)
async def unassign_asset(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Only managers, assistant managers, and admins can unassign assets
    if current_user.role not in ["admin", "manager", "assistant_manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Not authorized to unassign assets"
        )
    
    # Check if asset exists
    asset = crud.get_asset(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Unassign the asset
    updated_asset = crud.unassign_asset(db, asset_id)
    if not updated_asset:
        raise HTTPException(status_code=500, detail="Failed to unassign asset")
    
    return updated_asset

@app.get("/assets/{asset_id}/maintenance-history", response_model=List[schemas.MaintenanceRecordResponse])
async def get_asset_maintenance_history(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if asset exists
    asset = crud.get_asset(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Get maintenance history
    maintenance_records = crud.get_asset_maintenance_records(db, asset_id)
    return maintenance_records

@app.get("/assets/statistics", response_model=dict)
async def get_asset_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get statistics about assets in the system.
    Returns counts by status, type, and condition.
    """
    # Get all assets
    assets = db.query(Asset).all()
    
    # Calculate statistics
    total_count = len(assets)
    status_counts = {}
    type_counts = {}
    condition_counts = {}
    
    for asset in assets:
        # Count by status
        if asset.status in status_counts:
            status_counts[asset.status] += 1
        else:
            status_counts[asset.status] = 1
            
        # Count by type
        if asset.type in type_counts:
            type_counts[asset.type] += 1
        else:
            type_counts[asset.type] = 1
            
        # Count by condition
        if asset.condition in condition_counts:
            condition_counts[asset.condition] += 1
        else:
            condition_counts[asset.condition] = 1
    
    return {
        "total": total_count,
        "by_status": status_counts,
        "by_type": type_counts,
        "by_condition": condition_counts
    }

# Vendor endpoints
@app.get("/vendor/", response_model=List[schemas.VendorResponse])
async def get_all_vendors(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all vendors"""
    # Check if user has appropriate role to view vendors
    if current_user.role not in ["admin", "manager", "assistant_manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view vendors"
        )
    
    vendors = crud.get_vendors(db, skip=skip, limit=limit)
    return vendors

@app.get("/vendor/{vendor_id}", response_model=schemas.VendorResponse)
async def get_vendor_by_id(
    vendor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a vendor by ID"""
    vendor = crud.get_vendor(db, vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    return vendor

@app.post("/vendor/", response_model=schemas.VendorCreateResponse)
async def create_vendor(
    vendor_data: schemas.VendorCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new vendor with user account and login credentials"""
    # Check if user has appropriate role to create vendors
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create vendors"
        )
    
    # Check if vendor with this email already exists
    existing_vendor = crud.get_vendor_by_email(db, vendor_data.email)
    if existing_vendor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vendor with this email already exists"
        )
    
    # Check if user with this email already exists
    existing_user = crud.get_user_by_email(db, vendor_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Generate secure temporary password
    temp_password = generate_vendor_password()
    
    # Create user account for the vendor
    user_data = schemas.UserCreate(
        email=vendor_data.email,
        password=temp_password,  # Generated secure password - will be hashed in create_user
        role="vendor"
    )
    
    try:
        # Create user first
        user = crud.create_user(db, user_data)
        
        # Then create vendor record
        vendor = crud.create_vendor(db, vendor_data)
        
        # Prepare email data
        email_data = {
            "name": vendor.name,
            "email": vendor.email,
            "temp_password": temp_password
        }
        
        # Send credentials email in background
        background_tasks.add_task(send_vendor_credentials, email_data)
        print(f"Queued credentials email for vendor: {vendor.email}")
        
        # Return vendor with additional login credentials
        return {
            **vendor.__dict__,
            "temp_password": temp_password,
            "username": vendor.email
        }
    except Exception as e:
        # Clean up if something went wrong
        if 'user' in locals():
            try:
                crud.delete_user(db, user.id)
            except:
                pass
        raise HTTPException(status_code=500, detail=f"Failed to create vendor: {str(e)}")

@app.put("/vendor/{vendor_id}", response_model=schemas.VendorResponse)
async def update_vendor(
    vendor_id: str,
    vendor_data: schemas.VendorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a vendor"""
    # Check if user has appropriate role to update vendors
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update vendors"
        )
    
    # Check if vendor exists
    vendor = crud.get_vendor(db, vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Check if trying to update email to one that already exists
    if vendor_data.email and vendor_data.email != vendor.email:
        existing_vendor = crud.get_vendor_by_email(db, vendor_data.email)
        if existing_vendor:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vendor with this email already exists"
            )
    
    update_data = vendor_data.dict(exclude_unset=True)
    updated_vendor = crud.update_vendor(db, vendor_id, **update_data)
    
    return updated_vendor

@app.delete("/vendor/{vendor_id}")
async def delete_vendor(
    vendor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a vendor"""
    # Check if user has appropriate role to delete vendors
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete vendors"
        )
    
    # Check if vendor exists
    vendor = crud.get_vendor(db, vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    crud.delete_vendor(db, vendor_id)
    return {"message": "Vendor deleted successfully"}

# Quote Request endpoints - Manager Portal
@app.get("/quote-requests/", response_model=List[schemas.QuoteRequestDetailResponse])
async def get_all_quote_requests(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all quote requests (for admin and manager roles)"""
    # Only managers and admins can view all quote requests
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view all quote requests"
        )
    
    quote_requests = crud.get_quote_requests(db, skip=skip, limit=limit, status=status)
    return quote_requests

@app.get("/quote-requests/my-requests", response_model=List[schemas.QuoteRequestDetailResponse])
async def get_my_quote_requests(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get quote requests created by the current user"""
    quote_requests = crud.get_user_quote_requests(db, current_user.id, skip=skip, limit=limit, status=status)
    return quote_requests

@app.get("/quote-requests/{quote_request_id}", response_model=schemas.QuoteRequestDetailResponse)
async def get_quote_request_by_id(
    quote_request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific quote request by ID"""
    quote_request = crud.get_quote_request(db, quote_request_id)
    if not quote_request:
        raise HTTPException(status_code=404, detail="Quote request not found")
    
    # Check if user has permission to view this quote request
    is_authorized = (
        current_user.role in ["admin", "manager"] or
        quote_request.created_by_id == current_user.id or
        (current_user.role == "vendor" and any(v.vendor_id == current_user.id for v in quote_request.vendor_selections))
    )
    
    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this quote request"
        )
    
    return quote_request

@app.post("/quote-requests/", response_model=schemas.QuoteRequestDetailResponse)
async def create_new_quote_request(
    quote_request: schemas.QuoteRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new quote request"""
    # Only managers and admins can create quote requests
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create quote requests"
        )
    
    new_quote_request = crud.create_quote_request(db, quote_request, current_user.id)
    return new_quote_request

@app.put("/quote-requests/{quote_request_id}", response_model=schemas.QuoteRequestDetailResponse)
async def update_quote_request(
    quote_request_id: str,
    quote_request_update: schemas.QuoteRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a quote request"""
    db_quote_request = crud.get_quote_request(db, quote_request_id)
    if not db_quote_request:
        raise HTTPException(status_code=404, detail="Quote request not found")
    
    # Check if user has permission to update this quote request
    is_authorized = (
        current_user.role in ["admin", "manager"] or
        db_quote_request.created_by_id == current_user.id
    )
    
    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this quote request"
        )
    
    update_data = quote_request_update.dict(exclude_unset=True)
    updated_quote_request = crud.update_quote_request(db, quote_request_id, **update_data)
    
    return updated_quote_request

@app.delete("/quote-requests/{quote_request_id}")
async def delete_quote_request(
    quote_request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a quote request"""
    db_quote_request = crud.get_quote_request(db, quote_request_id)
    if not db_quote_request:
        raise HTTPException(status_code=404, detail="Quote request not found")
    
    # Check if user has permission to delete this quote request
    is_authorized = (
        current_user.role in ["admin", "manager"] or
        db_quote_request.created_by_id == current_user.id
    )
    
    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this quote request"
        )
    
    if db_quote_request.status not in ["draft", "open", "cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete a quote request that has been fulfilled or is pending responses"
        )
    
    crud.delete_quote_request(db, quote_request_id)
    return {"message": "Quote request deleted successfully"}

# Quote Request Vendor endpoints
@app.post("/quote-requests/{quote_request_id}/vendors", response_model=schemas.QuoteRequestVendorResponse)
async def add_vendor_to_quote_request(
    quote_request_id: str,
    vendor_data: schemas.QuoteRequestVendorBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Add a vendor to a quote request"""
    # Check if quote request exists
    quote_request = crud.get_quote_request(db, quote_request_id)
    if not quote_request:
        raise HTTPException(status_code=404, detail="Quote request not found")
    
    # Check if user has permission to add vendors to this quote request
    is_authorized = (
        current_user.role in ["admin", "manager"] or
        quote_request.created_by_id == current_user.id
    )
    
    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to add vendors to this quote request"
        )
    
    # Check if quote request is in a state where vendors can be added
    if quote_request.status not in ["draft", "open"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add vendors to a quote request that is not in draft or open status"
        )
    
    # Check if vendor exists
    vendor = crud.get_vendor(db, vendor_data.vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Create the vendor selection
    vendor_selection_data = schemas.QuoteRequestVendorCreate(
        quote_request_id=quote_request_id,
        vendor_id=vendor_data.vendor_id
    )
    
    vendor_selection = crud.create_quote_request_vendor(db, vendor_selection_data)
    
    # If the quote request was in draft status, change it to open now that vendors are added
    if quote_request.status == "draft":
        crud.update_quote_request(db, quote_request_id, status="open")
    
    return vendor_selection

@app.delete("/quote-requests/vendors/{vendor_selection_id}")
async def remove_vendor_from_quote_request(
    vendor_selection_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Remove a vendor from a quote request"""
    # Check if vendor selection exists
    vendor_selection = crud.get_quote_request_vendor(db, vendor_selection_id)
    if not vendor_selection:
        raise HTTPException(status_code=404, detail="Vendor selection not found")
    
    # Get the quote request
    quote_request = crud.get_quote_request(db, vendor_selection.quote_request_id)
    if not quote_request:
        raise HTTPException(status_code=404, detail="Quote request not found")
    
    # Check if user has permission to remove vendors from this quote request
    is_authorized = (
        current_user.role in ["admin", "manager"] or
        quote_request.created_by_id == current_user.id
    )
    
    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to remove vendors from this quote request"
        )
    
    # Check if the vendor has already submitted a response
    if vendor_selection.has_responded:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove a vendor that has already submitted a response"
        )
    
    crud.delete_quote_request_vendor(db, vendor_selection_id)
    return {"message": "Vendor removed from quote request successfully"}

# Quote Response endpoints
@app.get("/quote-responses/{quote_response_id}", response_model=schemas.QuoteResponseResponse)
async def get_quote_response_by_id(
    quote_response_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific quote response by ID"""
    quote_response = crud.get_quote_response(db, quote_response_id)
    if not quote_response:
        raise HTTPException(status_code=404, detail="Quote response not found")
    
    # Check if user has permission to view this quote response
    is_authorized = (
        current_user.role in ["admin", "manager"] or
        quote_response.quote_request.created_by_id == current_user.id or
        quote_response.vendor_id == current_user.id
    )
    
    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this quote response"
        )
    
    return quote_response

@app.get("/quote-requests/{quote_request_id}/responses", response_model=List[schemas.QuoteResponseResponse])
async def get_responses_for_quote_request(
    quote_request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all responses for a specific quote request"""
    # Check if quote request exists
    quote_request = crud.get_quote_request(db, quote_request_id)
    if not quote_request:
        raise HTTPException(status_code=404, detail="Quote request not found")
    
    # Check if user has permission to view responses for this quote request
    is_authorized = (
        current_user.role in ["admin", "manager"] or
        quote_request.created_by_id == current_user.id or
        (current_user.role == "vendor" and any(v.vendor_id == current_user.id for v in quote_request.vendor_selections))
    )
    
    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view responses for this quote request"
        )
    
    # If a vendor is requesting, only show their own response
    if current_user.role == "vendor":
        responses = [r for r in quote_request.responses if r.vendor_id == current_user.id]
    else:
        responses = crud.get_quote_responses(db, quote_request_id)
    
    return responses

@app.get("/vendors/{vendor_id}/responses", response_model=List[schemas.QuoteResponseResponse])
async def get_vendor_quote_responses(
    vendor_id: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all quote responses submitted by a specific vendor"""
    # Check if vendor exists
    vendor = crud.get_vendor(db, vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Check if user has permission to view this vendor's responses
    is_authorized = (
        current_user.role in ["admin", "manager"] or
        (current_user.role == "vendor" and vendor.email == current_user.email)
    )
    
    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this vendor's quote requests"
        )
    
    # Get quote requests where this vendor is selected
    quote_requests = crud.get_vendor_quote_requests(db, vendor_id, skip=skip, limit=limit, status=status)
    return quote_requests

# Add vendor-specific quote request endpoint
@app.get("/quotes/requests/vendor/{vendor_id}", response_model=List[schemas.QuoteRequestDetailResponse])
async def get_vendor_quote_requests(
    vendor_id: str,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get quote requests assigned to a specific vendor"""
    # Check if vendor exists
    vendor = crud.get_vendor(db, vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Check if user has permission to view this vendor's quote requests
    is_authorized = (
        current_user.role in ["admin", "manager"] or
        (current_user.role == "vendor" and vendor.email == current_user.email)
    )
    
    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this vendor's quote requests"
        )
    
    # Get quote requests where this vendor is selected
    quote_requests = crud.get_vendor_quote_requests(db, vendor_id, skip=skip, limit=limit, status=status)
    return quote_requests

# Add vendor purchase requests endpoint (legacy support)
@app.get("/vendors/{vendor_id}/requests", response_model=List[dict])
async def get_vendor_purchase_requests(
    vendor_id: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get purchase requests for a vendor (legacy endpoint)"""
    # Check if vendor exists
    vendor = crud.get_vendor(db, vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Check if user has permission to view this vendor's requests
    is_authorized = (
        current_user.role in ["admin", "manager"] or
        (current_user.role == "vendor" and vendor.email == current_user.email)
    )
    
    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this vendor's requests"
        )
    
    # For now, return quote requests formatted as purchase requests for backwards compatibility
    quote_requests = crud.get_vendor_quote_requests(db, vendor_id, skip=skip, limit=limit)
    
    # Transform to match expected format
    purchase_requests = []
    for request in quote_requests:
        purchase_requests.append({
            "id": request.id,
            "title": request.title,
            "description": request.description,
            "priority": request.priority,
            "status": "Pending Quote" if request.status == "open" else request.status,
            "dateCreated": request.created_at.isoformat(),
            "quantity": 1,  # Default quantity
        })
    
    return purchase_requests

# Add the missing quotes respond endpoint
@app.post("/quotes/{request_id}/respond", response_model=schemas.QuoteResponseResponse)
async def submit_quote_response_legacy(
    request_id: str,
    response_data: schemas.QuoteResponseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Submit a response to a quote request (legacy endpoint)"""
    # Ensure the request_id matches the response data
    response_data.quote_request_id = request_id
    
    # Check if quote request exists
    quote_request = crud.get_quote_request(db, request_id)
    if not quote_request:
        raise HTTPException(status_code=404, detail="Quote request not found")
    
    # For vendors: check if they were selected for this quote request
    if current_user.role == "vendor":
        # Get vendor by email to match with vendor_id
        vendor = crud.get_vendor_by_email(db, current_user.email)
        if not vendor:
            raise HTTPException(status_code=404, detail="Vendor profile not found")
        
        # Ensure the vendor is submitting their own response
        if response_data.vendor_id != vendor.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only submit responses for your own vendor account"
            )
        
        # Check if this vendor was selected for the quote request
        is_selected = any(v.vendor_id == vendor.id for v in quote_request.vendor_selections)
        if not is_selected:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This vendor was not selected for this quote request"
            )
    # For managers/admins: they can create responses on behalf of any vendor
    elif current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create quote responses"
        )
    
    # Check if quote request is open for responses
    if quote_request.status not in ["open", "pending"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This quote request is not open for responses"
        )
    
    # Create the response
    quote_response = crud.create_quote_response(db, response_data)
    
    # If the quote request was in "open" status, change it to "pending" now that a response is received
    if quote_request.status == "open":
        crud.update_quote_request(db, request_id, status="pending")
    
    return quote_response

# Add purchase request quote endpoints (legacy support)
@app.post("/purchase-requests/{request_id}/quotes")
async def submit_purchase_request_quote(
    request_id: str,
    quote_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Submit a quote for a purchase request (legacy endpoint)"""
    # Map purchase request to quote request for backwards compatibility
    quote_request = crud.get_quote_request(db, request_id)
    if not quote_request:
        raise HTTPException(status_code=404, detail="Purchase request not found")
    
    # Create quote response data from the legacy format
    response_data = schemas.QuoteResponseCreate(
        quote_request_id=request_id,
        vendor_id=quote_data.get("vendorId", current_user.id),
        quote_amount=float(quote_data.get("quote", 0)),
        description=quote_data.get("response", ""),
        delivery_timeline="Standard delivery"  # Default value
    )
    
    # For vendors: check if they were selected for this quote request
    if current_user.role == "vendor":
        # Get vendor by email to match with vendor_id
        vendor = crud.get_vendor_by_email(db, current_user.email)
        if not vendor:
            raise HTTPException(status_code=404, detail="Vendor profile not found")
        
        # Ensure the vendor is submitting their own response
        if response_data.vendor_id != vendor.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only submit responses for your own vendor account"
            )
        
        # Check if this vendor was selected for the quote request
        is_selected = any(v.vendor_id == vendor.id for v in quote_request.vendor_selections)
        if not is_selected:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This vendor was not selected for this quote request"
            )
    
    # Check if quote request is open for responses
    if quote_request.status not in ["open", "pending"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This quote request is not open for responses"
        )
    
    # Create the response
    quote_response = crud.create_quote_response(db, response_data)
    
    # If the quote request was in "open" status, change it to "pending" now that a response is received
    if quote_request.status == "open":
        crud.update_quote_request(db, request_id, status="pending")
    
    return {"message": "Quote submitted successfully", "quote_response": quote_response}

@app.get("/purchase-requests/{request_id}/quotes")
async def get_purchase_request_quotes(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get quotes for a purchase request (legacy endpoint)"""
    # Map to quote request responses
    quote_request = crud.get_quote_request(db, request_id)
    if not quote_request:
        raise HTTPException(status_code=404, detail="Purchase request not found")
    
    # Get responses and transform to legacy format
    responses = crud.get_quote_responses(db, request_id)
    
    quotes = []
    for response in responses:
        quotes.append({
            "vendorId": response.vendor_id,
            "quote": response.quote_amount,
            "response": response.description,
            "status": response.status
        })
    
    return quotes

@app.post("/purchase-requests/{request_id}/quotes/{vendor_id}/accept")
async def accept_purchase_request_quote(
    request_id: str,
    vendor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Accept a vendor's quote for a purchase request with enhanced notification system"""
    print(f"🎯 Manager {current_user.email} accepting quote for request {request_id} from vendor {vendor_id}")
    
    # Only managers and admins can accept quotes
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to accept quotes"
        )
    
    # Find the quote response
    responses = crud.get_quote_responses(db, request_id)
    quote_response = next((r for r in responses if r.vendor_id == vendor_id), None)
    
    if not quote_response:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # Get the quote request to find related complaint
    quote_request = crud.get_quote_request(db, request_id)
    if not quote_request:
        raise HTTPException(status_code=404, detail="Quote request not found")
    
    print(f"📋 Quote request found: {quote_request.title}")
    
    # Update the response status
    updated_response = crud.review_quote_response(
        db,
        quote_response.id,
        "accepted",
        "Quote accepted by manager",
        current_user.id
    )
    
    # Find related complaint based on component purchase details
    # Look for complaints with matching component_purchase_reason or title
    related_complaint = None
    
    # First try to find complaints that mention the quote request details
    complaints = crud.get_complaints(db)
    for complaint in complaints:
        if (complaint.component_purchase_reason and 
            (quote_request.title.lower() in complaint.component_purchase_reason.lower() or
             quote_request.description.lower() in complaint.component_purchase_reason.lower())):
            related_complaint = complaint
            break
    
    # If no direct match, try to find pending complaints that need component purchases
    if not related_complaint:
        pending_complaints = [c for c in complaints 
                            if c.status in ['pending_manager_approval', 'in_progress'] 
                            and c.component_purchase_reason]
        if pending_complaints:
            # Take the most recent one as fallback
            related_complaint = max(pending_complaints, key=lambda x: x.last_updated)
    
    if related_complaint:
        print(f"🔗 Found related complaint: {related_complaint.id} for employee {related_complaint.employee_id}")
        
        # Get the employee's user ID for notification
        employee = crud.get_employee(db, related_complaint.employee_id)
        if employee:
            # Find the user account for this employee
            user = crud.get_user_by_email(db, employee.email)
            if user:
                # Calculate deadline (14 days from now)
                from datetime import timedelta
                deadline_date = datetime.utcnow() + timedelta(days=14)
                deadline_str = deadline_date.strftime("%B %d, %Y")
                
                # Create notification for the employee
                notification_data = schemas.NotificationCreate(
                    user_id=user.id,
                    message=f"The new component has been ordered and is expected to be installed within 2 weeks (Deadline: {deadline_str}).",
                    type="Component Order",
                    related_id=related_complaint.id
                )
                
                notification = crud.create_notification(db, notification_data)
                print(f"✅ Notification sent to employee {employee.name} ({employee.email})")
                print(f"📧 Notification message: {notification.message}")
                
                # Update complaint status to reflect that components have been ordered
                crud.update_complaint(
                    db, 
                    related_complaint.id, 
                    status="in_progress",
                    resolution_notes=f"Components ordered from {quote_response.vendor.name}. Expected delivery: {deadline_str}"
                )
                print(f"📝 Updated complaint status to in_progress")
            else:
                print(f"⚠️ User account not found for employee {employee.email}")
        else:
            print(f"⚠️ Employee not found for complaint {related_complaint.id}")
    else:
        print("⚠️ No related complaint found for this quote request")
    
    print(f"✅ Quote acceptance completed successfully")
    
    return {
        "message": "Quote accepted successfully", 
        "quote_response": updated_response,
        "notification_sent": related_complaint is not None,
        "related_complaint_id": related_complaint.id if related_complaint else None
    }

@app.post("/purchase-requests/{request_id}/quotes/{vendor_id}/reject")
async def reject_purchase_request_quote(
    request_id: str,
    vendor_id: str,
    rejection_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Reject a vendor's quote for a purchase request with enhanced logging"""
    print(f"❌ Manager {current_user.email} rejecting quote for request {request_id} from vendor {vendor_id}")
    
    # Only managers and admins can reject quotes
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to reject quotes"
        )
    
    # Find the quote response
    responses = crud.get_quote_responses(db, request_id)
    quote_response = next((r for r in responses if r.vendor_id == vendor_id), None)
    
    if not quote_response:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # Get rejection reason
    rejection_reason = rejection_data.get("reason", "Quote rejected by manager")
    print(f"📝 Rejection reason: {rejection_reason}")
    
    # Update the response status
    updated_response = crud.review_quote_response(
        db,
        quote_response.id,
        "rejected",
        rejection_reason,
        current_user.id
    )
    
    print(f"✅ Quote rejection completed successfully")
    
    return {
        "message": "Quote rejected successfully", 
        "quote_response": updated_response,
        "reason": rejection_reason
    }

# Modern Quote Response Management Endpoints

@app.post("/quote-responses/{quote_response_id}/accept")
async def accept_quote_response(
    quote_response_id: str,
    acceptance_data: dict = {},
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Accept a specific quote response with enhanced notification system"""
    print(f"🎯 Manager {current_user.email} accepting quote response {quote_response_id}")
    
    # Only managers and admins can accept quotes
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to accept quotes"
        )
    
    # Get the quote response
    quote_response = crud.get_quote_response(db, quote_response_id)
    if not quote_response:
        raise HTTPException(status_code=404, detail="Quote response not found")
    
    print(f"📋 Quote response found for vendor: {quote_response.vendor.name}")
    print(f"💰 Quote amount: ${quote_response.quote_amount}")
    
    # Update the response status
    acceptance_notes = acceptance_data.get("notes", "Quote accepted by manager")
    updated_response = crud.review_quote_response(
        db,
        quote_response_id,
        "accepted",
        acceptance_notes,
        current_user.id
    )
    
    # Find related complaint based on quote request details
    quote_request = quote_response.quote_request
    related_complaint = None
    
    print(f"🔍 Searching for complaint related to quote request: {quote_request.title}")
    
    # Search for complaints with matching component purchase details
    complaints = crud.get_complaints(db)
    for complaint in complaints:
        if (complaint.component_purchase_reason and 
            (quote_request.title.lower() in complaint.component_purchase_reason.lower() or
             quote_request.description.lower() in complaint.component_purchase_reason.lower())):
            related_complaint = complaint
            print(f"🔗 Found exact match: Complaint {complaint.id}")
            break
    
    # Fallback: find recent complaints needing component purchases
    if not related_complaint:
        pending_complaints = [c for c in complaints 
                            if c.status in ['pending_manager_approval', 'in_progress'] 
                            and c.component_purchase_reason]
        if pending_complaints:
            related_complaint = max(pending_complaints, key=lambda x: x.last_updated)
            print(f"🔗 Using fallback match: Complaint {related_complaint.id}")
    
    if related_complaint:
        print(f"👤 Related complaint employee: {related_complaint.employee_id}")
        
        # Get employee and user for notification
        employee = crud.get_employee(db, related_complaint.employee_id)
        if employee:
            user = crud.get_user_by_email(db, employee.email)
            if user:
                # Calculate 14-day deadline
                from datetime import timedelta
                deadline_date = datetime.utcnow() + timedelta(days=14)
                deadline_str = deadline_date.strftime("%B %d, %Y")
                
                # Create notification
                notification_data = schemas.NotificationCreate(
                    user_id=user.id,
                    message=f"The new component has been ordered and is expected to be installed within 2 weeks (Deadline: {deadline_str}).",
                    type="Component Order",
                    related_id=related_complaint.id
                )
                
                notification = crud.create_notification(db, notification_data)
                print(f"✅ Notification sent to {employee.name} ({employee.email})")
                
                # Update complaint with order details
                crud.update_complaint(
                    db, 
                    related_complaint.id, 
                    status="in_progress",
                    resolution_notes=f"Components ordered from {quote_response.vendor.name}. Expected delivery: {deadline_str}. Order amount: ${quote_response.quote_amount}"
                )
                
                print(f"📝 Updated complaint {related_complaint.id} to in_progress")
            else:
                print(f"⚠️ User account not found for employee {employee.email}")
        else:
            print(f"⚠️ Employee not found for complaint {related_complaint.id}")
    else:
        print("⚠️ No related complaint found - notification not sent")
    
    return {
        "message": "Quote response accepted successfully",
        "quote_response": updated_response,
        "notification_sent": related_complaint is not None,
        "related_complaint_id": related_complaint.id if related_complaint else None,
        "vendor_name": quote_response.vendor.name,
        "quote_amount": quote_response.quote_amount
    }

@app.post("/quote-responses/{quote_response_id}/reject")
async def reject_quote_response(
    quote_response_id: str,
    rejection_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Reject a specific quote response with detailed logging"""
    print(f"❌ Manager {current_user.email} rejecting quote response {quote_response_id}")
    
    # Only managers and admins can reject quotes
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to reject quotes"
        )
    
    # Get the quote response
    quote_response = crud.get_quote_response(db, quote_response_id)
    if not quote_response:
        raise HTTPException(status_code=404, detail="Quote response not found")
    
    rejection_reason = rejection_data.get("reason", "Quote rejected by manager")
    print(f"📝 Rejecting quote from {quote_response.vendor.name}")
    print(f"💰 Rejected amount: ${quote_response.quote_amount}")
    print(f"📝 Reason: {rejection_reason}")
    
    # Update the response status
    updated_response = crud.review_quote_response(
        db,
        quote_response_id,
        "rejected",
        rejection_reason,
        current_user.id
    )
    
    print(f"✅ Quote response rejection completed")
    
    return {
        "message": "Quote response rejected successfully",
        "quote_response": updated_response,
        "reason": rejection_reason,
        "vendor_name": quote_response.vendor.name,
        "quote_amount": quote_response.quote_amount
    }

# General review endpoint that the frontend expects
@app.put("/quote-responses/{quote_response_id}/review")
async def review_quote_response_general(
    quote_response_id: str,
    review_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """General review endpoint for quote responses (accept, reject, or negotiate)"""
    print(f"📝 Manager {current_user.email} reviewing quote response {quote_response_id}")
    
    # Only managers and admins can review quotes
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to review quotes"
        )
    
    # Get the quote response
    quote_response = crud.get_quote_response(db, quote_response_id)
    if not quote_response:
        raise HTTPException(status_code=404, detail="Quote response not found")
    
    # Get review details
    status = review_data.get("status")
    notes = review_data.get("notes", "")
    
    if status not in ["accepted", "rejected", "negotiating"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be 'accepted', 'rejected', or 'negotiating'")
    
    print(f"📋 Quote response for vendor: {quote_response.vendor.name}")
    print(f"💰 Quote amount: ${quote_response.quote_amount}")
    print(f"✅ Status: {status}")
    print(f"📝 Notes: {notes}")
    
    # Update the response status
    updated_response = crud.review_quote_response(
        db,
        quote_response_id,
        status,
        notes,
        current_user.id
    )
    
    # If accepting the quote, trigger notification system
    notification_sent = False
    related_complaint_id = None
    
    if status == "accepted":
        print("🎯 Quote accepted - triggering notification system")
        
        # Find related complaint based on quote request details
        quote_request = quote_response.quote_request
        related_complaint = None
        
        print(f"🔍 Searching for complaint related to quote request: {quote_request.title}")
        
        # Search for complaints with matching component purchase details
        complaints = crud.get_complaints(db)
        for complaint in complaints:
            if (complaint.component_purchase_reason and 
                (quote_request.title.lower() in complaint.component_purchase_reason.lower() or
                 quote_request.description.lower() in complaint.component_purchase_reason.lower())):
                related_complaint = complaint
                print(f"🔗 Found exact match: Complaint {complaint.id}")
                break
        
        # Fallback: find recent complaints needing component purchases
        if not related_complaint:
            pending_complaints = [c for c in complaints 
                                if c.status in ['pending_manager_approval', 'in_progress'] 
                                and c.component_purchase_reason]
            if pending_complaints:
                related_complaint = max(pending_complaints, key=lambda x: x.last_updated)
                print(f"🔗 Using fallback match: Complaint {related_complaint.id}")
        
        if related_complaint:
            print(f"👤 Related complaint employee: {related_complaint.employee_id}")
            
            # Get employee and user for notification
            employee = crud.get_employee(db, related_complaint.employee_id)
            if employee:
                user = crud.get_user_by_email(db, employee.email)
                if user:
                    # Calculate 14-day deadline
                    from datetime import timedelta
                    deadline_date = datetime.utcnow() + timedelta(days=14)
                    deadline_str = deadline_date.strftime("%B %d, %Y")
                    
                    # Create notification
                    notification_data = schemas.NotificationCreate(
                        user_id=user.id,
                        message=f"The new component has been ordered and is expected to be installed within 2 weeks (Deadline: {deadline_str}).",
                        type="Component Order",
                        related_id=related_complaint.id
                    )
                    
                    notification = crud.create_notification(db, notification_data)
                    print(f"✅ Notification sent to {employee.name} ({employee.email})")
                    notification_sent = True
                    related_complaint_id = related_complaint.id
                    
                    # Update complaint with order details
                    crud.update_complaint(
                        db, 
                        related_complaint.id, 
                        status="in_progress",
                        resolution_notes=f"Components ordered from {quote_response.vendor.name}. Expected delivery: {deadline_str}. Order amount: ${quote_response.quote_amount}"
                    )
                    
                    print(f"📝 Updated complaint {related_complaint.id} to in_progress")
                else:
                    print(f"⚠️ User account not found for employee {employee.email}")
            else:
                print(f"⚠️ Employee not found for complaint {related_complaint.id}")
        else:
            print("⚠️ No related complaint found - notification not sent")
    
    print(f"✅ Quote response review completed successfully")
    
    return {
        "message": f"Quote response {status} successfully",
        "quote_response": updated_response,
        "status": status,
        "notes": notes,
        "notification_sent": notification_sent,
        "related_complaint_id": related_complaint_id,
        "vendor_name": quote_response.vendor.name,
        "quote_amount": quote_response.quote_amount
    }

# Helper endpoint to create quote request from complaint
@app.post("/complaints/{complaint_id}/create-quote-request", response_model=schemas.QuoteRequestDetailResponse)
async def create_quote_request_from_complaint(
    complaint_id: str,
    quote_request_data: schemas.QuoteRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a quote request based on a complaint's component purchase requirements"""
    print(f"📋 Creating quote request from complaint {complaint_id}")
    
    # Only managers, assistant managers, and ATS can create quote requests from complaints
    if current_user.role not in ["admin", "manager", "assistant_manager", "ats"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create quote requests from complaints"
        )
    
    # Get the complaint
    complaint = crud.get_complaint(db, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    if not complaint.component_purchase_reason:
        raise HTTPException(status_code=400, detail="Complaint does not have component purchase requirements")
    
    # Create the quote request with enhanced title and description that references the complaint
    enhanced_title = f"{quote_request_data.title} (Complaint: {complaint.title})"
    enhanced_description = f"Component purchase for complaint #{complaint.id}: {complaint.component_purchase_reason}\n\nAdditional details: {quote_request_data.description}"
    
    # Create a new quote request data with enhanced information
    enhanced_request = schemas.QuoteRequestCreate(
        title=enhanced_title,
        description=enhanced_description,
        requirements=quote_request_data.requirements,
        budget=quote_request_data.budget,
        priority=quote_request_data.priority,
        due_date=quote_request_data.due_date,
        status=quote_request_data.status
    )
    
    # Create the quote request
    quote_request = crud.create_quote_request(db, enhanced_request, current_user.id)
    
    print(f"✅ Quote request {quote_request.id} created from complaint {complaint_id}")
    print(f"📝 Title: {enhanced_title}")
    
    # Update complaint to indicate quote request has been created
    crud.update_complaint(
        db,
        complaint_id,
        resolution_notes=f"Quote request {quote_request.id} created for component purchase. Status: {quote_request.status}"
    )
    
    return quote_request

# Check if complaint has associated quote requests
@app.get("/complaints/{complaint_id}/has-quote-requests")
async def check_complaint_has_quote_requests(
    complaint_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Check if a complaint has associated quote requests (vendor codes)"""
    print(f"🔍 Checking if complaint {complaint_id} has quote requests")
    
    # Get the complaint
    complaint = crud.get_complaint(db, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    # Get all quote requests
    quote_requests = crud.get_quote_requests(db)
    
    # Check if any quote request references this complaint
    has_quote_requests = False
    matching_quote_requests = []
    
    # Method 1: Check if complaint title appears in quote request titles
    for quote_request in quote_requests:
        if (quote_request.title and complaint.title.lower() in quote_request.title.lower()):
            has_quote_requests = True
            matching_quote_requests.append({
                "id": quote_request.id,
                "title": quote_request.title,
                "status": quote_request.status,
                "created_at": quote_request.created_at
            })
    
    # Method 2: Check if quote request description mentions the complaint
    if not has_quote_requests:
        for quote_request in quote_requests:
            if (quote_request.description and 
                (f"complaint #{complaint.id}" in quote_request.description.lower() or
                 complaint.title.lower() in quote_request.description.lower())):
                has_quote_requests = True
                matching_quote_requests.append({
                    "id": quote_request.id,
                    "title": quote_request.title,
                    "status": quote_request.status,
                    "created_at": quote_request.created_at
                })
    
    # Method 3: Check if resolution notes mention quote request creation
    if not has_quote_requests and complaint.resolution_notes:
        if "quote request" in complaint.resolution_notes.lower():
            has_quote_requests = True
            # Extract quote request ID from resolution notes if possible
            import re
            quote_id_match = re.search(r'quote request ([a-f0-9-]+)', complaint.resolution_notes.lower())
            if quote_id_match:
                quote_id = quote_id_match.group(1)
                # Verify this quote request exists
                for quote_request in quote_requests:
                    if quote_request.id == quote_id:
                        matching_quote_requests.append({
                            "id": quote_request.id,
                            "title": quote_request.title,
                            "status": quote_request.status,
                            "created_at": quote_request.created_at
                        })
                        break
    
    print(f"📊 Complaint {complaint_id} has quote requests: {has_quote_requests}")
    if matching_quote_requests:
        print(f"🔗 Found {len(matching_quote_requests)} related quote requests")
    
    return {
        "complaint_id": complaint_id,
        "has_quote_requests": has_quote_requests,
        "matching_quote_requests": matching_quote_requests,
        "can_approve": not has_quote_requests,  # Can only approve if no quote requests exist yet
        "message": "Quote requests found" if has_quote_requests else "No quote requests found"
    }

# Admin Portal endpoints
@app.get("/admin/statistics", response_model=dict)
async def get_admin_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get overall statistics for the admin dashboard"""
    # Only admins can access this endpoint
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view admin statistics"
        )
    
    # Get counts from various tables
    employee_count = db.query(Employee).count()
    asset_count = db.query(Asset).count()
    complaint_count = db.query(Complaint).count()
    vendor_count = db.query(Vendor).count()
    
    # Get asset statistics by status
    asset_status_counts = {}
    asset_statuses = db.query(Asset.status, func.count(Asset.id)).group_by(Asset.status).all()
    for status, count in asset_statuses:
        asset_status_counts[status] = count
    
    # Get complaint statistics by status
    complaint_status_counts = {}
    complaint_statuses = db.query(Complaint.status, func.count(Complaint.id)).group_by(Complaint.status).all()
    for status, count in complaint_statuses:
        complaint_status_counts[status] = count
    
    # Get specific complaint counts for different portals
    ats_complaints = db.query(Complaint).filter(
        Complaint.status.in_(['open', 'submitted'])
    ).count()
    
    assistant_manager_complaints = db.query(Complaint).filter(
        Complaint.status == 'forwarded'
    ).count()
    
    manager_complaints = db.query(Complaint).filter(
        Complaint.status.in_(['in_progress', 'pending_approval'])
    ).count()
    
    active_complaints = db.query(Complaint).filter(
        Complaint.status.in_(['open', 'submitted', 'forwarded', 'in_progress', 'pending_approval'])
    ).count()
    
    # Get recent complaints
    recent_complaints = db.query(Complaint)\
        .options(joinedload(Complaint.employee))\
        .order_by(desc(Complaint.date_submitted))\
        .limit(5)\
        .all()
    
    recent_complaint_data = []
    for complaint in recent_complaints:
        recent_complaint_data.append({
            "id": complaint.id,
            "title": complaint.title,
            "status": complaint.status,
            "date_submitted": complaint.date_submitted.isoformat(),
            "employee_name": complaint.employee.name if complaint.employee else "Unknown"
        })
    
    # Get user statistics by role
    user_role_counts = {}
    user_roles = db.query(User.role, func.count(User.id)).group_by(User.role).all()
    for role, count in user_roles:
        user_role_counts[role] = count
    
    return {
        "counts": {
            "employees": employee_count,
            "assets": asset_count,
            "complaints": complaint_count,
            "vendors": vendor_count
        },
        "asset_status": asset_status_counts,
        "complaint_status": complaint_status_counts,
        "user_roles": user_role_counts,
        "recent_complaints": recent_complaint_data,
        "ats_complaints": ats_complaints,
        "assistant_manager_complaints": assistant_manager_complaints,
        "manager_complaints": manager_complaints,
        "active_complaints": active_complaints
    }

@app.post("/admin/create-user", response_model=schemas.UserResponse)
async def admin_create_user(
    user_data: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Admin endpoint to create any type of user"""
    # Only admins can create users of any type
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create users with this endpoint"
        )
    
    # Check if user with this email already exists
    existing_user = crud.get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    # Create the user
    user = crud.create_user(db, user_data)
    return user

# Notification endpoints
@app.get("/notifications", response_model=List[schemas.NotificationResponse])
async def get_user_notifications(
    skip: int = 0,
    limit: int = 100,
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    notifications = crud.get_user_notifications(
        db, 
        current_user.id, 
        skip=skip, 
        limit=limit, 
        unread_only=unread_only
    )
    return notifications

@app.get("/notifications/count", response_model=dict)
async def get_unread_notification_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    unread_notifications = crud.get_user_notifications(
        db, 
        current_user.id, 
        unread_only=True
    )
    return {"count": len(unread_notifications)}

@app.get("/notifications/{notification_id}", response_model=schemas.NotificationResponse)
async def get_notification_by_id(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    notification = crud.get_notification(db, notification_id)
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    # Check user owns this notification
    if notification.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this notification")
    
    return notification

@app.post("/notifications", response_model=schemas.NotificationResponse)
async def create_notification(
    notification_data: schemas.NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Only admin, managers, assistant managers, and ATS can create notifications
    if current_user.role not in ["admin", "manager", "assistant_manager", "ats"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create notifications"
        )
    
    notification = crud.create_notification(db, notification_data)
    return notification

@app.put("/notifications/{notification_id}/read", response_model=schemas.NotificationResponse)
async def mark_notification_as_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    notification = crud.get_notification(db, notification_id)
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    # Check user owns this notification
    if notification.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this notification")
    
    updated_notification = crud.mark_notification_read(db, notification_id)
    return updated_notification

@app.put("/notifications/read-all", response_model=dict)
async def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    success = crud.mark_all_notifications_read(db, current_user.id)
    return {"success": success}

@app.delete("/notifications/{notification_id}", response_model=dict)
async def delete_user_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    notification = crud.get_notification(db, notification_id)
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    # Check user owns this notification
    if notification.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this notification")
    
    success = crud.delete_notification(db, notification_id)
    return {"success": success}

@app.get("/users/by-email/{email}", response_model=schemas.UserResponse)
async def get_user_by_email(
    email: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get user by email address. Used for notification routing."""
    
    # Can only be called by certain roles
    if current_user.role not in ["admin", "manager", "assistant_manager", "ats"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access user data"
        )
    
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user

# ATS Portal - Forward complaint with component details
@app.patch("/complaints/{complaint_id}/forward", response_model=schemas.ComplaintResponse)
async def forward_complaint_with_components(
    complaint_id: str,
    forward_data: schemas.ATSComplaintForward,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Forward a complaint with component purchase details (ATS Portal)"""
    # Debug logging
    print(f"ATS forwarding complaint with ID: {complaint_id}")
    print(f"Current user: ID={current_user.id}, email={current_user.email}, role={current_user.role}")
    print(f"Component purchase reason: {forward_data.component_purchase_reason}")
    
    # Only ATS users can use this endpoint
    if current_user.role != "ats":
        print(f"Authorization failed: User {current_user.email} role {current_user.role} tried to forward complaint")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Only ATS users can forward complaints with component details"
        )
    
    # Fetch the complaint
    complaint = crud.get_complaint(db, complaint_id)
    if not complaint:
        print(f"Complaint not found with ID: {complaint_id}")
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    # Validate component purchase reason
    if not forward_data.component_purchase_reason or len(forward_data.component_purchase_reason.strip()) < 10:
        raise HTTPException(
            status_code=422, 
            detail="Component purchase reason must be at least 10 characters"
        )
    
    # Update the complaint with component details and forward it
    update_data = {
        "component_purchase_reason": forward_data.component_purchase_reason.strip(),
        "status": forward_data.status or "forwarded",
        "assigned_to": forward_data.assigned_to
    }
    
    updated_complaint = crud.update_complaint(db, complaint_id, **update_data)
    
    if not updated_complaint:
        raise HTTPException(status_code=500, detail="Failed to forward complaint")
    
    print(f"Successfully forwarded complaint {complaint_id} with component details")
    return updated_complaint

# ATS Portal - Get complaints assigned to ATS
@app.get("/ats/complaints", response_model=List[schemas.ComplaintResponse])
async def get_ats_complaints(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all complaints visible to ATS users"""
    # Only ATS users can access this endpoint
    if current_user.role != "ats":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only ATS users can access ATS complaints"
        )
    
    # ATS can see all complaints
    complaints = crud.get_complaints(db, skip=skip, limit=limit, status=status)
    return complaints

# Assistant Manager Portal - Get forwarded complaints with component details
@app.get("/assistant-manager/complaints", response_model=List[schemas.ComplaintResponse])
async def get_assistant_manager_complaints(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get complaints for assistant manager review (forwarded complaints with component details)"""
    # Only assistant managers can access this endpoint
    if current_user.role != "assistant_manager":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only assistant managers can access this endpoint"
        )
    
    # Assistant managers can see forwarded complaints and those assigned to them
    query = db.query(Complaint)\
        .options(joinedload(Complaint.employee), joinedload(Complaint.replies))
    
    # Filter for forwarded complaints or those assigned to assistant managers
    query = query.filter(
        (Complaint.status == "forwarded") | 
        (Complaint.assigned_to == current_user.id)
    )
    
    if status:
        query = query.filter(Complaint.status == status)
    
    complaints = query.order_by(desc(Complaint.date_submitted)).offset(skip).limit(limit).all()
    
    # Parse images from JSON string to list for each complaint
    for complaint in complaints:
        if isinstance(complaint.images, str):
            try:
                complaint.images = json.loads(complaint.images)
            except:
                complaint.images = []
    
    return complaints

# Assistant Manager Portal - Get approval history
@app.get("/assistant-manager/approval-history", response_model=List[schemas.ComplaintResponse])
async def get_assistant_manager_approval_history(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get approval history for assistant manager (complaints they have approved or rejected)"""
    # Only assistant managers can access this endpoint
    if current_user.role != "assistant_manager":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only assistant managers can access this endpoint"
        )
    
    # Get complaints that have been handled by the assistant manager
    # Look for complaints where the resolution_notes contains "assistant_manager" approval/rejection
    query = db.query(Complaint)\
        .options(joinedload(Complaint.employee), joinedload(Complaint.replies))\
        .filter(
            and_(
                Complaint.resolution_notes.isnot(None),
                or_(
                    Complaint.resolution_notes.contains("Approved by assistant_manager"),
                    Complaint.resolution_notes.contains("Rejected by assistant_manager"),
                    Complaint.status.in_(["in_progress", "closed", "resolved", "pending_manager_approval"])
                )
            )
        )
    
    complaints = query.order_by(desc(Complaint.last_updated)).offset(skip).limit(limit).all()
    
    # Parse images from JSON string to list for each complaint
    for complaint in complaints:
        if isinstance(complaint.images, str):
            try:
                complaint.images = json.loads(complaint.images)
            except:
                complaint.images = []
    
    return complaints

# Manager Portal - Get complaints approved by assistant manager
@app.get("/manager/complaints", response_model=List[schemas.ComplaintResponse])
async def get_manager_complaints(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get complaints for manager review (approved by assistant manager with component details)"""
    # Only managers can access this endpoint
    if current_user.role != "manager":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers can access this endpoint"
        )
    
    # Managers should see complaints that need their approval (forwarded by assistant managers)
    query = db.query(Complaint)\
        .options(joinedload(Complaint.employee), joinedload(Complaint.replies))
    
    # Filter for complaints that need manager approval
    if status:
        query = query.filter(Complaint.status == status)
    else:
        # Default filter: show only complaints forwarded to manager for approval by Assistant Manager
        # Removed 'forwarded' status so complaints forwarded by ATS only appear on Assistant Manager dashboard
        query = query.filter(
            Complaint.status.in_([
                'pending_manager_approval',
                'in_progress',
                'pending_approval'
            ])
        )
    
    complaints = query.order_by(desc(Complaint.date_submitted)).offset(skip).limit(limit).all()
    
    # Parse images from JSON string to list for each complaint
    for complaint in complaints:
        if isinstance(complaint.images, str):
            try:
                complaint.images = json.loads(complaint.images)
            except:
                complaint.images = []
        elif complaint.images is None:
            complaint.images = []
    
    return complaints

# Get complaint with component details by ID (accessible by ATS, Assistant Manager, Manager)
@app.get("/complaints/{complaint_id}/component-details", response_model=schemas.ComplaintResponse)
async def get_complaint_with_component_details(
    complaint_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific complaint with component purchase details"""
    # Only ATS, assistant managers, and managers can access component details
    if current_user.role not in ["ats", "assistant_manager", "manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view component details"
        )
    
    complaint = crud.get_complaint(db, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    return complaint

# Add new endpoint after existing vendor endpoints

@app.get("/vendor/by-email/{email}", response_model=schemas.VendorResponse)
async def get_vendor_by_email(
    email: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a vendor by email address"""
    vendor = crud.get_vendor_by_email(db, email)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    return vendor

# Assistant Manager Portal - Forward complaint to manager
@app.patch("/complaints/{complaint_id}/forward-to-manager", response_model=schemas.ComplaintResponse)
async def forward_complaint_to_manager(
    complaint_id: str,
    forward_data: schemas.ComplaintUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Forward a complaint from assistant manager to manager (Assistant Manager Portal)"""
    # Debug logging
    print(f"Assistant Manager forwarding complaint with ID: {complaint_id}")
    print(f"Current user: ID={current_user.id}, email={current_user.email}, role={current_user.role}")
    
    # Only assistant managers can use this endpoint
    if current_user.role != "assistant_manager":
        print(f"Authorization failed: User {current_user.email} role {current_user.role} tried to forward complaint to manager")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Only assistant managers can forward complaints to managers"
        )
    
    # Fetch the complaint
    complaint = crud.get_complaint(db, complaint_id)
    if not complaint:
        print(f"Complaint not found with ID: {complaint_id}")
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    # Update the complaint status to pending_manager_approval
    update_data = {
        "status": "pending_manager_approval",
        "assigned_to": forward_data.assigned_to,
        "resolution_notes": forward_data.resolution_notes or f"Forwarded to manager by {current_user.email}"
    }
    
    # Add any additional fields from forward_data
    if forward_data.priority:
        update_data["priority"] = forward_data.priority
    
    updated_complaint = crud.update_complaint(db, complaint_id, **update_data)
    
    if not updated_complaint:
        raise HTTPException(status_code=500, detail="Failed to forward complaint to manager")
    
    print(f"Successfully forwarded complaint {complaint_id} to manager with status pending_manager_approval")
    return updated_complaint

@app.patch("/complaints/{complaint_id}/reject", response_model=schemas.ComplaintResponse)
async def reject_complaint_with_notification(
    complaint_id: str,
    rejection_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Reject a complaint and notify ATS with enhanced logic"""
    print(f"❌ {current_user.role.title()} {current_user.email} rejecting complaint {complaint_id}")
    
    # Only managers and assistant managers can reject complaints
    if current_user.role not in ["admin", "manager", "assistant_manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to reject complaints"
        )
    
    rejection_reason = rejection_data.get("reason", "").strip()
    if not rejection_reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rejection reason is required"
        )
    
    # Get the complaint
    complaint = crud.get_complaint(db, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    print(f"📝 Rejection reason: {rejection_reason}")
    
    # Update complaint status to in_progress (not closed) with rejection notes
    rejection_notes = f"Rejected by {current_user.role.replace('_', ' ').title()}: {rejection_reason}"
    
    updated_complaint = crud.update_complaint(
        db,
        complaint_id,
        status="in_progress",  # Keep in progress instead of closing
        resolution_notes=f"{complaint.resolution_notes or ''}\n{rejection_notes}".strip(),
        assigned_to=None  # Unassign from current user
    )
    
    if not updated_complaint:
        raise HTTPException(status_code=500, detail="Failed to update complaint")
    
    # Notify ATS users about the rejection
    try:
        # Get all ATS users
        ats_users = db.query(User).filter(User.role == "ats").all()
        
        notification_message = f"Complaint {complaint_id} has been rejected by {current_user.role.replace('_', ' ').title()}. Reason: {rejection_reason}"
        
        for ats_user in ats_users:
            notification_data = schemas.NotificationCreate(
                user_id=ats_user.id,
                message=notification_message,
                type="Complaint Rejection",
                related_id=complaint_id
            )
            
            crud.create_notification(db, notification_data)
            print(f"📧 Notification sent to ATS user: {ats_user.email}")
        
        print(f"✅ Rejection notifications sent to {len(ats_users)} ATS users")
        
    except Exception as e:
        print(f"⚠️ Error sending rejection notifications: {e}")
        # Don't fail the whole operation if notifications fail
    
    print(f"✅ Complaint {complaint_id} rejected successfully")
    
    return updated_complaint

# Email Configuration Admin Endpoints
@app.get("/admin/email-configuration", response_model=dict)
async def get_email_configuration_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get email service configuration status"""
    # Only admins can check email configuration
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view email configuration"
        )
    
    return get_email_configuration_status()

@app.post("/admin/test-email")
async def test_email_functionality(
    test_data: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Test email functionality by sending a test credentials email"""
    # Only admins can test email functionality
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to test email functionality"
        )
    
    # Validate test data
    test_email = test_data.get("email")
    test_name = test_data.get("name", "Test User")
    user_type = test_data.get("type", "employee")  # 'employee' or 'vendor'
    
    if not test_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address is required for testing"
        )
    
    # Prepare test email data
    email_data = {
        "name": test_name,
        "email": test_email,
        "temp_password": "TestPassword123!"
    }
    
    try:
        # Send test email in background
        if user_type == "vendor":
            background_tasks.add_task(send_vendor_credentials, email_data)
        else:
            background_tasks.add_task(send_employee_credentials, email_data)
        
        return {
            "message": f"Test {user_type} credentials email queued successfully",
            "test_email": test_email,
            "user_type": user_type
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to queue test email: {str(e)}"
        )

# Helper functions for image handling
def save_uploaded_image(file: UploadFile) -> str:
    """Save uploaded image and return the file path"""
    # Generate unique filename
    file_extension = file.filename.split('.')[-1].lower()
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save the file
    with open(file_path, "wb") as buffer:
        content = file.file.read()
        buffer.write(content)
    
    # Return relative path for storage in database
    return f"uploads/complaint_images/{unique_filename}"

def validate_image_file(file: UploadFile) -> bool:
    """Validate that the uploaded file is an image and within size limit"""
    # Check file extension
    allowed_extensions = {'jpg', 'jpeg', 'png', 'gif', 'webp'}
    if not file.filename:
        return False
    
    file_extension = file.filename.split('.')[-1].lower()
    if file_extension not in allowed_extensions:
        return False
    
    # Check file size (5MB limit)
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > 5 * 1024 * 1024:  # 5MB in bytes
        return False
    
    return True

# Image upload endpoint
@app.post("/upload-complaint-images/")
async def upload_complaint_images(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """Upload multiple images for complaint"""
    if len(files) > 5:  # Limit to 5 images per complaint
        raise HTTPException(
            status_code=400,
            detail="Maximum 5 images allowed per complaint"
        )
    
    uploaded_files = []
    
    for file in files:
        if not validate_image_file(file):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file: {file.filename}. Only JPG, PNG, GIF, WEBP files under 5MB are allowed."
            )
        
        try:
            file_path = save_uploaded_image(file)
            uploaded_files.append({
                "filename": file.filename,
                "path": file_path
            })
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to save file {file.filename}: {str(e)}"
            )
    
    return {"uploaded_files": uploaded_files}

# Authentication and middleware
oauth2_scheme = auth.oauth2_scheme

@app.post("/complaints/{complaint_id}/resolve", response_model=schemas.ComplaintResponse)
async def resolve_complaint_with_notification(
    complaint_id: str,
    resolution_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Resolve a complaint and automatically send notification to the employee.
    This endpoint combines complaint resolution with notification creation.
    """
    print(f"🔧 Resolving complaint {complaint_id} with notification")
    print(f"Current user: {current_user.email} (role: {current_user.role})")
    
    # Only ATS users can resolve complaints
    if current_user.role != "ats":
        print(f"❌ Authorization failed: User {current_user.email} role {current_user.role} tried to resolve complaint")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only ATS users can resolve complaints"
        )
    
    # Get the complaint with employee details
    complaint = db.query(Complaint)\
        .options(joinedload(Complaint.employee))\
        .filter(Complaint.id == complaint_id)\
        .first()
    
    if not complaint:
        print(f"❌ Complaint not found: {complaint_id}")
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    print(f"📋 Found complaint: {complaint.title}")
    print(f"👤 Employee: {complaint.employee.name} ({complaint.employee.email})")
    
    # Update complaint to resolved using direct attribute setting
    resolution_notes = resolution_data.get("resolution_notes", "Resolved by ATS team")
    
    try:
        # Update complaint fields directly
        complaint.status = "resolved"
        complaint.resolution_notes = resolution_notes
        complaint.resolution_date = datetime.utcnow()
        complaint.last_updated = datetime.utcnow()
        
        # Commit the complaint update
        db.commit()
        db.refresh(complaint)
        print(f"✅ Complaint updated to resolved status")
        
    except Exception as e:
        print(f"❌ Failed to update complaint: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to resolve complaint")
    
    # Create notification for the employee
    try:
        # Get the user associated with this employee
        user = db.query(User).filter(User.email == complaint.employee.email).first()
        
        if not user:
            print(f"⚠️  No user found for employee email: {complaint.employee.email}")
            # Still return the resolved complaint even if notification fails
            return complaint
        
        print(f"👤 Found user: {user.id} for employee {complaint.employee.email}")
        
        # Create notification
        notification_data = schemas.NotificationCreate(
            user_id=user.id,
            message=f"Your complaint '{complaint.title}' has been resolved by the ATS team.",
            type="complaint_resolved",
            related_id=complaint_id
        )
        
        notification = crud.create_notification(db, notification_data)
        print(f"📧 Notification created successfully: {notification.id}")
        
    except Exception as e:
        print(f"⚠️  Failed to create notification: {str(e)}")
        # Don't fail the complaint resolution if notification fails
        pass
    
    # Handle images field conversion before returning
    if hasattr(complaint, 'images') and isinstance(complaint.images, str):
        try:
            import json
            complaint.images = json.loads(complaint.images)
        except:
            complaint.images = []
    elif not hasattr(complaint, 'images') or complaint.images is None:
        complaint.images = []
    
    print(f"🎉 Complaint {complaint_id} resolved successfully with notification")
    return complaint

# AI Prediction endpoints
@app.get("/assets/{asset_id}/complaints", response_model=List[schemas.ComplaintResponse])
async def get_asset_complaints(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all complaints related to a specific asset"""
    # Only managers, assistant managers, admins, and ATS can access asset complaints
    if current_user.role not in ["admin", "manager", "assistant_manager", "ats"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access asset complaints"
        )
    
    complaints = db.query(Complaint)\
        .options(joinedload(Complaint.employee))\
        .filter(Complaint.asset_id == asset_id)\
        .order_by(Complaint.date_submitted.desc())\
        .all()
    
    # Process images for each complaint
    for complaint in complaints:
        if hasattr(complaint, 'images') and isinstance(complaint.images, str):
            try:
                complaint.images = json.loads(complaint.images)
            except:
                complaint.images = []
        elif not hasattr(complaint, 'images') or complaint.images is None:
            complaint.images = []
    
    return complaints

@app.post("/assets/{asset_id}/ai-prediction")
async def get_asset_ai_prediction(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get AI-powered prediction for asset lifespan based on complaint history"""
    
    # Only managers, assistant managers, and admins can access AI predictions
    if current_user.role not in ["admin", "manager", "assistant_manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access AI predictions"
        )
    
    # Get asset details
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Get all complaints for this asset
    complaints = db.query(Complaint)\
        .options(joinedload(Complaint.employee))\
        .filter(Complaint.asset_id == asset_id)\
        .order_by(Complaint.date_submitted.desc())\
        .all()
    
    # If no complaints, return early without calling AI
    if not complaints:
        return {
            "asset_id": asset_id,
            "asset_name": asset.name,
            "prediction": generate_no_complaints_prediction(asset),
            "complaint_count": 0,
            "generated_at": datetime.utcnow().isoformat(),
            "confidence": "high",
            "note": "No complaint history - prediction based on asset age and condition"
        }
    
    # Prepare complaint history summary for AI analysis
    complaint_summary = []
    for complaint in complaints:
        complaint_summary.append({
            "title": complaint.title,
            "description": complaint.description,
            "priority": complaint.priority,
            "status": complaint.status,
            "date_submitted": complaint.date_submitted.strftime("%Y-%m-%d"),
            "resolution_notes": complaint.resolution_notes or "Not resolved"
        })
    
    # Prepare asset information
    asset_info = {
        "name": asset.name,
        "type": asset.type,
        "condition": asset.condition,
        "purchase_date": asset.purchase_date.strftime("%Y-%m-%d") if asset.purchase_date else "Unknown",
        "purchase_cost": float(asset.purchase_cost) if asset.purchase_cost else 0,
        "expected_lifespan": asset.expected_lifespan if hasattr(asset, 'expected_lifespan') else 5,
        "total_repair_cost": float(asset.total_repair_cost) if hasattr(asset, 'total_repair_cost') and asset.total_repair_cost else 0,
        "complaint_count": len(complaint_summary)
    }
    
    # Prepare the prompt for Perplexity AI
    prompt = f"""
    You are an IT asset management expert. Analyze this asset's complaint history and provide a CONCISE prediction.

    Asset: {asset_info['name']} ({asset_info['type']})
    Condition: {asset_info['condition']} | Purchase Date: {asset_info['purchase_date']}
    Complaints: {asset_info['complaint_count']}

    Recent Issues:
    {chr(10).join([f"- {c['date_submitted']}: {c['title']} ({c['priority']} priority)" for c in complaint_summary[:5]])}

    Provide a brief analysis with:
    1. Predicted remaining lifespan (in months)
    2. Top risk factors
    3. Key maintenance recommendations
    4. Replacement recommendation (yes/no with reason)

    Keep response under 200 words, focus on actionable insights.
    """
    
    try:
        # Call Perplexity AI API
        PERPLEXITY_API_KEY = "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"
        
        headers = {
            "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": "llama-3.1-sonar-small-128k-online",
            "messages": [
                {
                    "role": "system", 
                    "content": "You are an IT asset management expert. Provide concise, actionable predictions under 200 words."
                },
                {
                    "role": "user", 
                    "content": prompt
                }
            ],
            "max_tokens": 300,
            "temperature": 0.2,
            "top_p": 0.9
        }
        
        response = requests.post(
            "https://api.perplexity.ai/chat/completions",
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code == 200:
            ai_response = response.json()
            prediction_text = ai_response["choices"][0]["message"]["content"]
            
            return {
                "asset_id": asset_id,
                "asset_name": asset.name,
                "prediction": prediction_text,
                "complaint_count": len(complaint_summary),
                "generated_at": datetime.utcnow().isoformat(),
                "confidence": "high" if len(complaint_summary) >= 3 else "medium" if len(complaint_summary) >= 1 else "low"
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"AI service error: {response.status_code} - {response.text}"
            )
            
    except requests.exceptions.RequestException as e:
        # Fallback to basic analysis if AI service is unavailable
        fallback_prediction = generate_fallback_prediction(asset_info, complaint_summary)
        return {
            "asset_id": asset_id,
            "asset_name": asset.name,
            "prediction": fallback_prediction,
            "complaint_count": len(complaint_summary),
            "generated_at": datetime.utcnow().isoformat(),
            "confidence": "low",
            "note": "AI service unavailable, using fallback analysis"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating AI prediction: {str(e)}"
        )

def generate_no_complaints_prediction(asset):
    """Generate prediction for assets with no complaint history"""
    from datetime import datetime
    
    # Calculate age
    if asset.purchase_date:
        # Convert both to date objects to ensure compatible types
        purchase_date = asset.purchase_date.date() if hasattr(asset.purchase_date, 'date') else asset.purchase_date
        current_date = datetime.now().date()
        age_years = (current_date - purchase_date).days / 365.25
    else:
        age_years = 0
    
    # Expected lifespan based on asset type and condition
    expected_lifespan = asset.expected_lifespan if hasattr(asset, 'expected_lifespan') else 5
    remaining_years = max(0.5, expected_lifespan - age_years)
    
    # Adjust based on condition
    condition_multiplier = {
        'new': 1.2,
        'good': 1.0,
        'fair': 0.8,
        'poor': 0.6
    }.get(asset.condition, 1.0)
    
    predicted_months = int(remaining_years * 12 * condition_multiplier)
    
    return f"""**ASSET PREDICTION - No Complaint History**

**Predicted Remaining Lifespan: {predicted_months} months**

**Analysis:**
- Current age: {age_years:.1f} years
- Condition: {asset.condition}
- Asset type: {asset.type}

**Key Points:**
✅ No recorded complaints - excellent reliability indicator
✅ Regular maintenance appears effective
✅ Asset performing within expected parameters

**Recommendations:**
- Continue current maintenance schedule
- Monitor for early signs of wear
- Plan replacement in {predicted_months // 12} year(s)
- Consider this asset as a reliability benchmark

**Risk Level: LOW** - Clean complaint history suggests reliable operation."""

def generate_fallback_prediction(asset_info, complaint_summary):
    """Generate a basic prediction when AI service is unavailable"""
    from datetime import datetime
    
    # Calculate basic metrics
    complaint_count = len(complaint_summary)
    high_priority_complaints = len([c for c in complaint_summary if c.get('priority') == 'high'])
    recent_complaints = len([c for c in complaint_summary if 
                           datetime.strptime(c['date_submitted'], '%Y-%m-%d') > datetime.now() - timedelta(days=90)])
    
    # Basic scoring algorithm
    base_score = 36  # 36 months base lifespan
    
    # Reduce based on complaints
    score_reduction = complaint_count * 2 + high_priority_complaints * 4 + recent_complaints * 3
    
    # Adjust based on condition
    condition_multiplier = {
        'new': 1.2,
        'good': 1.0,
        'fair': 0.8,
        'poor': 0.5
    }.get(asset_info['condition'], 1.0)
    
    predicted_months = max(1, int((base_score - score_reduction) * condition_multiplier))
    
    return f"""**FALLBACK ANALYSIS - AI Service Unavailable**

**Predicted Remaining Lifespan: {predicted_months} months**

**Analysis Summary:**
- Total complaints: {complaint_count}
- High priority issues: {high_priority_complaints}
- Recent complaints (90 days): {recent_complaints}
- Current condition: {asset_info['condition']}

**Recommendations:**
- Monitor closely due to complaint history
- Regular maintenance checks recommended
- Budget for replacement in {predicted_months // 12} year(s)

**Risk Assessment:** {"HIGH" if predicted_months < 6 else "MEDIUM" if predicted_months < 18 else "LOW"}

Note: Basic analysis only. Try again when AI service is available."""

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)