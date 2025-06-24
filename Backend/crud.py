from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, and_
from models import (
    User, Employee, Complaint, Reply, Asset, Vendor, 
    MaintenanceRequest, MaintenanceRecord, Notification,
    QuoteRequest, QuoteRequestVendor, QuoteResponse
)
from schemas import (
    UserCreate, EmployeeCreate, ComplaintCreate, ReplyCreate, 
    AssetCreate, VendorCreate, MaintenanceRequestCreate,
    MaintenanceRecordCreate, NotificationCreate,
    QuoteRequestCreate, QuoteRequestVendorCreate, QuoteResponseCreate
)
from auth import get_password_hash
import uuid
from datetime import datetime
import json
from typing import List, Optional

# User CRUD operations
def get_user(db: Session, user_id: str):
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(User).offset(skip).limit(limit).all()

def create_user(db: Session, user_data: UserCreate):
    # Hash the password before storing
    hashed_password = get_password_hash(user_data.password)
    user_id = str(uuid.uuid4())
    db_user = User(
        id=user_id,
        email=user_data.email,
        password=hashed_password,  # Store the hashed password
        role=user_data.role,
        created_at=datetime.utcnow()
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: str, **kwargs):
    db_user = db.query(User).filter(User.id == user_id).first()
    if db_user:
        for key, value in kwargs.items():
            if key == 'password':
                value = get_password_hash(value)
            setattr(db_user, key, value)
        db.commit()
        db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: str):
    db_user = db.query(User).filter(User.id == user_id).first()
    if db_user:
        db.delete(db_user)
        db.commit()
        return True
    return False

# Employee CRUD operations
def get_employee(db: Session, employee_id: str):
    return db.query(Employee).filter(Employee.id == employee_id).first()

def get_employee_by_email(db: Session, email: str):
    return db.query(Employee).filter(Employee.email == email).first()

def get_employees(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Employee).offset(skip).limit(limit).all()

def create_employee(db: Session, employee_data: EmployeeCreate, user_id: str):
    db_employee = Employee(
        id=user_id,
        name=employee_data.name,
        email=employee_data.email,
        department=employee_data.department,
        role=employee_data.role,
        phone_number=employee_data.phone_number,
        location=employee_data.location,
        date_joined=datetime.utcnow()
    )
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    return db_employee

def update_employee(db: Session, employee_id: str, **kwargs):
    db_employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if db_employee:
        for key, value in kwargs.items():
            setattr(db_employee, key, value)
        db.commit()
        db.refresh(db_employee)
    return db_employee

def delete_employee(db: Session, employee_id: str):
    db_employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if db_employee:
        db.delete(db_employee)
        db.commit()
        return True
    return False

# Complaint CRUD operations
def get_complaint(db: Session, complaint_id: str):
    complaint = db.query(Complaint)\
        .options(
            joinedload(Complaint.employee),
            joinedload(Complaint.asset),
            joinedload(Complaint.replies)
        )\
        .filter(Complaint.id == complaint_id)\
        .first()
    
    # ⚠️ DO NOT modify complaint.images directly as it marks the object as dirty
    # Instead, let the Pydantic model handle the conversion in the response
    # The ComplaintResponse schema has proper handling for this
    
    return complaint

def get_complaints(db: Session, skip: int = 0, limit: int = 100, status: Optional[str] = None):
    query = db.query(Complaint)\
        .options(
            joinedload(Complaint.employee),
            joinedload(Complaint.asset),
            joinedload(Complaint.replies)
        )
    
    if status:
        query = query.filter(Complaint.status == status)
    
    complaints = query.order_by(desc(Complaint.date_submitted)).offset(skip).limit(limit).all()
    
    # ⚠️ DO NOT modify complaint.images directly as it marks objects as dirty
    # Instead, let the Pydantic model handle the conversion in the response
    # The ComplaintResponse schema has proper handling for this
    
    return complaints

def get_employee_complaints(db: Session, employee_id: str, skip: int = 0, limit: int = 100):
    complaints = db.query(Complaint)\
        .options(
            joinedload(Complaint.employee),
            joinedload(Complaint.asset),
            joinedload(Complaint.replies)
        )\
        .filter(Complaint.employee_id == employee_id)\
        .order_by(desc(Complaint.date_submitted))\
        .offset(skip)\
        .limit(limit)\
        .all()
    
    # ⚠️ DO NOT modify complaint.images directly as it marks objects as dirty
    # Instead, let the Pydantic model handle the conversion in the response
    # The ComplaintResponse schema has proper handling for this
    
    return complaints

def create_complaint(db: Session, complaint_data: ComplaintCreate):
    # Convert images list to JSON string
    images_json = json.dumps(complaint_data.images) if complaint_data.images else "[]"
    
    db_complaint = Complaint(
        id=str(uuid.uuid4()),
        employee_id=complaint_data.employee_id,
        title=complaint_data.title,
        description=complaint_data.description,
        priority=complaint_data.priority,
        status="open",
        date_submitted=datetime.utcnow(),
        last_updated=datetime.utcnow(),
        images=images_json,
        asset_id=complaint_data.asset_id
    )
    db.add(db_complaint)
    db.commit()
    db.refresh(db_complaint)
    
    # ⚠️ DO NOT modify db_complaint.images to list here as it marks object as dirty
    # Let the Pydantic response model handle the conversion instead
    
    return db_complaint

def update_complaint(db: Session, complaint_id: str, **kwargs):
    db_complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if db_complaint:
        # Make a copy of kwargs to avoid modifying the original
        update_data = kwargs.copy()
        
        print(f"🔍 DEBUG: Original update_data: {update_data}")
        
        # Handle images field properly to prevent SQL errors
        if 'images' in update_data:
            images_value = update_data['images']
            print(f"🔍 DEBUG: Images value type: {type(images_value)}, value: {images_value}")
            
            if images_value == [] or images_value is None:
                # Remove empty images from update to avoid SQL error
                print("⚠️ Removing empty/null images from update_data to prevent SQL error")
                del update_data['images']
            elif isinstance(images_value, list):
                # Convert non-empty list to JSON string
                update_data['images'] = json.dumps(images_value)
                print(f"✅ Converted images list to JSON string: {update_data['images']}")
            elif isinstance(images_value, str):
                # Already a string, validate it's valid JSON or set to empty
                try:
                    json.loads(images_value)  # Test if valid JSON
                    print(f"✅ Images already valid JSON string: {images_value}")
                except:
                    print("⚠️ Invalid JSON string in images, setting to empty array")
                    update_data['images'] = "[]"
            else:
                # Unknown type, convert to empty JSON array
                print(f"⚠️ Unknown images type {type(images_value)}, setting to empty array")
                update_data['images'] = "[]"
        
        print(f"🔍 DEBUG: Final update_data: {update_data}")
        
        # Update fields - now including images if it's properly formatted
        for key, value in update_data.items():
            if hasattr(db_complaint, key):
                print(f"🔄 Setting {key} = {value}")
                setattr(db_complaint, key, value)
        
        # Always update the last_updated field
        db_complaint.last_updated = datetime.utcnow()
        
        # If status changing to resolved, set resolution date
        if kwargs.get("status") == "resolved" and not db_complaint.resolution_date:
            db_complaint.resolution_date = datetime.utcnow()
        
        # Extra safety check: ensure images field is properly handled before commit
        if hasattr(db_complaint, 'images') and isinstance(db_complaint.images, list):
            print(f"⚠️ CRITICAL: Found list in db_complaint.images before commit: {db_complaint.images}")
            db_complaint.images = json.dumps(db_complaint.images) if db_complaint.images else "[]"
            print(f"✅ Fixed images field to: {db_complaint.images}")
            
        try:
            print("💾 Attempting database commit...")
            db.commit()
            print("✅ Database commit successful!")
            db.refresh(db_complaint)
        except Exception as e:
            print(f"❌ Database error during complaint update: {e}")
            print(f"❌ Final db_complaint.images type: {type(db_complaint.images)}")
            print(f"❌ Final db_complaint.images value: {db_complaint.images}")
            db.rollback()
            raise e
        
        # ⚠️ DO NOT convert images back to list here as it marks the object as dirty
        # Let the Pydantic response model handle the conversion instead
                
    return db_complaint

def delete_complaint(db: Session, complaint_id: str):
    db_complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if db_complaint:
        db.delete(db_complaint)
        db.commit()
        return True
    return False

# Reply CRUD operations
def get_reply(db: Session, reply_id: str):
    return db.query(Reply).filter(Reply.id == reply_id).first()

def get_complaint_replies(db: Session, complaint_id: str):
    return db.query(Reply)\
        .filter(Reply.complaint_id == complaint_id)\
        .order_by(Reply.timestamp)\
        .all()

def create_reply(db: Session, reply_data: ReplyCreate):
    db_reply = Reply(
        id=str(uuid.uuid4()),
        complaint_id=reply_data.complaint_id,
        message=reply_data.message,
        from_user=reply_data.from_user,
        user_id=reply_data.user_id,
        timestamp=datetime.utcnow()
    )
    db.add(db_reply)
    
    # Update the complaint's last_updated timestamp
    complaint = db.query(Complaint).filter(Complaint.id == reply_data.complaint_id).first()
    if complaint:
        complaint.last_updated = datetime.utcnow()
    
    try:
        db.commit()
        db.refresh(db_reply)
    except Exception as e:
        print(f"❌ Database error during reply creation: {e}")
        db.rollback()
        raise e
    
    return db_reply

def delete_reply(db: Session, reply_id: str):
    db_reply = db.query(Reply).filter(Reply.id == reply_id).first()
    if db_reply:
        db.delete(db_reply)
        db.commit()
        return True
    return False

# Asset CRUD operations
def get_asset(db: Session, asset_id: str):
    return db.query(Asset)\
        .options(joinedload(Asset.assigned_to), joinedload(Asset.vendor))\
        .filter(Asset.id == asset_id)\
        .first()

def get_assets(db: Session, skip: int = 0, limit: int = 100, status: Optional[str] = None):
    query = db.query(Asset)\
        .options(joinedload(Asset.assigned_to), joinedload(Asset.vendor))
    
    if status:
        query = query.filter(Asset.status == status)
    
    return query.order_by(Asset.name).offset(skip).limit(limit).all()

def get_employee_assets(db: Session, employee_id: str):
    return db.query(Asset)\
        .options(joinedload(Asset.vendor))\
        .filter(Asset.assigned_to_id == employee_id)\
        .all()

def create_asset(db: Session, asset_data: AssetCreate):
    db_asset = Asset(
        id=str(uuid.uuid4()),
        name=asset_data.name,
        type=asset_data.type,
        status=asset_data.status,
        serial_number=asset_data.serial_number,
        condition=asset_data.condition,
        specifications=asset_data.specifications,
        purchase_cost=asset_data.purchase_cost,
        purchase_date=asset_data.purchase_date,
        expected_lifespan=asset_data.expected_lifespan,
        total_repair_cost=0.0,
        vendor_id=asset_data.vendor_id,
        warranty_expiry=asset_data.warranty_expiry
    )
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset

def update_asset(db: Session, asset_id: str, **kwargs):
    db_asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if db_asset:
        for key, value in kwargs.items():
            setattr(db_asset, key, value)
        db.commit()
        db.refresh(db_asset)
    return db_asset

def assign_asset(db: Session, asset_id: str, employee_id: str):
    db_asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if db_asset:
        db_asset.assigned_to_id = employee_id
        db_asset.assigned_date = datetime.utcnow()
        db_asset.status = "assigned"
        db.commit()
        db.refresh(db_asset)
    return db_asset

def unassign_asset(db: Session, asset_id: str):
    db_asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if db_asset:
        db_asset.assigned_to_id = None
        db_asset.assigned_date = None
        db_asset.status = "available"
        db.commit()
        db.refresh(db_asset)
    return db_asset

def delete_asset(db: Session, asset_id: str):
    db_asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if db_asset:
        db.delete(db_asset)
        db.commit()
        return True
    return False

# Vendor CRUD operations
def get_vendor(db: Session, vendor_id: str):
    return db.query(Vendor).filter(Vendor.id == vendor_id).first()

def get_vendor_by_email(db: Session, email: str):
    return db.query(Vendor).filter(Vendor.email == email).first()

def get_vendors(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Vendor).offset(skip).limit(limit).all()

def create_vendor(db: Session, vendor_data: VendorCreate):
    db_vendor = Vendor(
        id=str(uuid.uuid4()),
        name=vendor_data.name,
        email=vendor_data.email,
        phone=vendor_data.phone,
        address=vendor_data.address,
        contact_person=vendor_data.contact_person,
        service_type=vendor_data.service_type,
        contract_start=vendor_data.contract_start,
        contract_end=vendor_data.contract_end
    )
    db.add(db_vendor)
    db.commit()
    db.refresh(db_vendor)
    return db_vendor

def update_vendor(db: Session, vendor_id: str, **kwargs):
    db_vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if db_vendor:
        for key, value in kwargs.items():
            setattr(db_vendor, key, value)
        db.commit()
        db.refresh(db_vendor)
    return db_vendor

def delete_vendor(db: Session, vendor_id: str):
    """Safely delete a vendor by first handling dependent records to
    avoid foreign-key constraint violations.

    Behaviour:
    1. Remove vendor from quote requests (delete QuoteRequestVendor rows).
    2. Delete any quote responses made by this vendor (no longer relevant once the
       vendor is gone).
    3. Null-out the vendor reference on assets and maintenance requests so those
       records are preserved but no longer linked to the removed vendor.

    Returns True if a vendor was found and deleted, else False.
    """

    db_vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()

    if not db_vendor:
        return False

    # 1. Delete QuoteRequestVendor associations
    db.query(QuoteRequestVendor).filter(QuoteRequestVendor.vendor_id == vendor_id).delete()

    # 2. Delete QuoteResponses submitted by this vendor
    db.query(QuoteResponse).filter(QuoteResponse.vendor_id == vendor_id).delete()

    # 3. Null-out vendor link on Assets
    db.query(Asset).filter(Asset.vendor_id == vendor_id).update({Asset.vendor_id: None})

    # 4. Null-out vendor link on MaintenanceRequests
    db.query(MaintenanceRequest).filter(MaintenanceRequest.vendor_id == vendor_id).update({MaintenanceRequest.vendor_id: None})

    # Finally, delete the vendor itself
    db.delete(db_vendor)
    db.commit()
    return True

# Maintenance Request CRUD operations
def get_maintenance_request(db: Session, request_id: str):
    return db.query(MaintenanceRequest)\
        .options(
            joinedload(MaintenanceRequest.asset),
            joinedload(MaintenanceRequest.requested_by),
            joinedload(MaintenanceRequest.vendor)
        )\
        .filter(MaintenanceRequest.id == request_id)\
        .first()

def get_maintenance_requests(db: Session, skip: int = 0, limit: int = 100, status: Optional[str] = None):
    query = db.query(MaintenanceRequest)\
        .options(
            joinedload(MaintenanceRequest.asset),
            joinedload(MaintenanceRequest.requested_by),
            joinedload(MaintenanceRequest.vendor)
        )
    
    if status:
        query = query.filter(MaintenanceRequest.status == status)
    
    return query.order_by(desc(MaintenanceRequest.request_date)).offset(skip).limit(limit).all()

def get_asset_maintenance_requests(db: Session, asset_id: str):
    return db.query(MaintenanceRequest)\
        .options(
            joinedload(MaintenanceRequest.requested_by),
            joinedload(MaintenanceRequest.vendor)
        )\
        .filter(MaintenanceRequest.asset_id == asset_id)\
        .order_by(desc(MaintenanceRequest.request_date))\
        .all()

def create_maintenance_request(db: Session, request_data: MaintenanceRequestCreate):
    db_request = MaintenanceRequest(
        id=str(uuid.uuid4()),
        asset_id=request_data.asset_id,
        requested_by_id=request_data.requested_by_id,
        vendor_id=request_data.vendor_id,
        request_date=datetime.utcnow(),
        scheduled_date=request_data.scheduled_date,
        description=request_data.description,
        status="scheduled"
    )
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    return db_request

def update_maintenance_request(db: Session, request_id: str, **kwargs):
    db_request = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == request_id).first()
    if db_request:
        for key, value in kwargs.items():
            setattr(db_request, key, value)
        
        # If status changing to completed, set completion date
        if kwargs.get("status") == "completed" and not db_request.completion_date:
            db_request.completion_date = datetime.utcnow()
            
            # Update the asset's next maintenance due date if provided
            if db_request.asset and kwargs.get("next_maintenance_due"):
                db_request.asset.next_maintenance_due = kwargs["next_maintenance_due"]
            
            # Update asset total repair cost
            if db_request.asset and kwargs.get("cost"):
                db_request.asset.total_repair_cost += kwargs["cost"]
        
        db.commit()
        db.refresh(db_request)
    return db_request

def delete_maintenance_request(db: Session, request_id: str):
    db_request = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == request_id).first()
    if db_request:
        db.delete(db_request)
        db.commit()
        return True
    return False

# Maintenance Record CRUD operations
def get_maintenance_record(db: Session, record_id: str):
    return db.query(MaintenanceRecord).filter(MaintenanceRecord.id == record_id).first()

def get_asset_maintenance_records(db: Session, asset_id: str):
    return db.query(MaintenanceRecord)\
        .filter(MaintenanceRecord.asset_id == asset_id)\
        .order_by(desc(MaintenanceRecord.maintenance_date))\
        .all()

def create_maintenance_record(db: Session, record_data: MaintenanceRecordCreate):
    db_record = MaintenanceRecord(
        id=str(uuid.uuid4()),
        asset_id=record_data.asset_id,
        maintenance_date=record_data.maintenance_date,
        performed_by=record_data.performed_by,
        description=record_data.description,
        cost=record_data.cost,
        next_maintenance_due=record_data.next_maintenance_due,
        maintenance_type=record_data.maintenance_type
    )
    db.add(db_record)
    
    # Update the asset's next maintenance due date and repair cost
    asset = db.query(Asset).filter(Asset.id == record_data.asset_id).first()
    if asset:
        if record_data.next_maintenance_due:
            asset.next_maintenance_due = record_data.next_maintenance_due
        if record_data.cost:
            asset.total_repair_cost += record_data.cost
    
    db.commit()
    db.refresh(db_record)
    return db_record

def delete_maintenance_record(db: Session, record_id: str):
    db_record = db.query(MaintenanceRecord).filter(MaintenanceRecord.id == record_id).first()
    if db_record:
        # Update the asset's repair cost
        asset = db.query(Asset).filter(Asset.id == db_record.asset_id).first()
        if asset and db_record.cost:
            asset.total_repair_cost -= db_record.cost
        
        db.delete(db_record)
        db.commit()
        return True
    return False

# Notification CRUD operations
def get_notification(db: Session, notification_id: str):
    return db.query(Notification).filter(Notification.id == notification_id).first()

def get_user_notifications(db: Session, user_id: str, skip: int = 0, limit: int = 100, unread_only: bool = False):
    query = db.query(Notification).filter(Notification.user_id == user_id)
    
    if unread_only:
        query = query.filter(Notification.read == False)
    
    return query.order_by(desc(Notification.created_at)).offset(skip).limit(limit).all()

def create_notification(db: Session, notification_data: NotificationCreate):
    db_notification = Notification(
        id=str(uuid.uuid4()),
        user_id=notification_data.user_id,
        message=notification_data.message,
        type=notification_data.type,
        related_id=notification_data.related_id,
        created_at=datetime.utcnow(),
        read=False
    )
    db.add(db_notification)
    db.commit()
    db.refresh(db_notification)
    return db_notification

def mark_notification_read(db: Session, notification_id: str):
    db_notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if db_notification:
        db_notification.read = True
        db.commit()
        db.refresh(db_notification)
    return db_notification

def mark_all_notifications_read(db: Session, user_id: str):
    db.query(Notification)\
        .filter(Notification.user_id == user_id, Notification.read == False)\
        .update({Notification.read: True})
    db.commit()
    return True

def delete_notification(db: Session, notification_id: str):
    db_notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if db_notification:
        db.delete(db_notification)
        db.commit()
        return True
    return False

# Quote Request CRUD operations
def get_quote_request(db: Session, quote_request_id: str):
    return db.query(QuoteRequest)\
        .options(
            joinedload(QuoteRequest.created_by),
            joinedload(QuoteRequest.vendor_selections).joinedload(QuoteRequestVendor.vendor),
            joinedload(QuoteRequest.responses).joinedload(QuoteResponse.vendor)
        )\
        .filter(QuoteRequest.id == quote_request_id)\
        .first()

def get_quote_requests(db: Session, skip: int = 0, limit: int = 100, status: Optional[str] = None):
    query = db.query(QuoteRequest)\
        .options(
            joinedload(QuoteRequest.created_by),
            joinedload(QuoteRequest.vendor_selections).joinedload(QuoteRequestVendor.vendor),
            joinedload(QuoteRequest.responses).joinedload(QuoteResponse.vendor)
        )
    
    if status:
        query = query.filter(QuoteRequest.status == status)
    
    return query.order_by(desc(QuoteRequest.created_at)).offset(skip).limit(limit).all()

def get_user_quote_requests(db: Session, user_id: str, skip: int = 0, limit: int = 100, status: Optional[str] = None):
    query = db.query(QuoteRequest)\
        .options(
            joinedload(QuoteRequest.created_by),
            joinedload(QuoteRequest.vendor_selections).joinedload(QuoteRequestVendor.vendor),
            joinedload(QuoteRequest.responses).joinedload(QuoteResponse.vendor)
        )\
        .filter(QuoteRequest.created_by_id == user_id)
    
    if status:
        query = query.filter(QuoteRequest.status == status)
    
    return query.order_by(desc(QuoteRequest.created_at)).offset(skip).limit(limit).all()

def create_quote_request(db: Session, request_data: QuoteRequestCreate, user_id: str):
    db_request = QuoteRequest(
        id=str(uuid.uuid4()),
        title=request_data.title,
        description=request_data.description,
        requirements=request_data.requirements,
        budget=request_data.budget,
        priority=request_data.priority,
        status=request_data.status or "draft",
        created_by_id=user_id,
        created_at=datetime.utcnow(),
        due_date=request_data.due_date
    )
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    return db_request

def update_quote_request(db: Session, quote_request_id: str, **kwargs):
    db_request = db.query(QuoteRequest).filter(QuoteRequest.id == quote_request_id).first()
    if db_request:
        for key, value in kwargs.items():
            setattr(db_request, key, value)
        
        db.commit()
        db.refresh(db_request)
    return db_request

def delete_quote_request(db: Session, quote_request_id: str):
    db_request = db.query(QuoteRequest).filter(QuoteRequest.id == quote_request_id).first()
    if db_request:
        db.delete(db_request)
        db.commit()
        return True
    return False

# Quote Request Vendor CRUD operations
def get_quote_request_vendor(db: Session, quote_request_vendor_id: str):
    return db.query(QuoteRequestVendor)\
        .options(joinedload(QuoteRequestVendor.vendor))\
        .filter(QuoteRequestVendor.id == quote_request_vendor_id)\
        .first()

def get_quote_request_vendors(db: Session, quote_request_id: str):
    return db.query(QuoteRequestVendor)\
        .options(joinedload(QuoteRequestVendor.vendor))\
        .filter(QuoteRequestVendor.quote_request_id == quote_request_id)\
        .all()

def create_quote_request_vendor(db: Session, vendor_data: QuoteRequestVendorCreate):
    # Check if this vendor is already added to this quote request
    existing = db.query(QuoteRequestVendor)\
        .filter(
            QuoteRequestVendor.quote_request_id == vendor_data.quote_request_id,
            QuoteRequestVendor.vendor_id == vendor_data.vendor_id
        ).first()
    
    if existing:
        return existing
    
    db_vendor_selection = QuoteRequestVendor(
        id=str(uuid.uuid4()),
        quote_request_id=vendor_data.quote_request_id,
        vendor_id=vendor_data.vendor_id,
        sent_date=datetime.utcnow(),
        has_responded=False
    )
    db.add(db_vendor_selection)
    db.commit()
    db.refresh(db_vendor_selection)
    return db_vendor_selection

def delete_quote_request_vendor(db: Session, quote_request_vendor_id: str):
    db_vendor_selection = db.query(QuoteRequestVendor).filter(QuoteRequestVendor.id == quote_request_vendor_id).first()
    if db_vendor_selection:
        db.delete(db_vendor_selection)
        db.commit()
        return True
    return False

# Quote Response CRUD operations
def get_quote_response(db: Session, quote_response_id: str):
    return db.query(QuoteResponse)\
        .options(
            joinedload(QuoteResponse.quote_request),
            joinedload(QuoteResponse.vendor),
            joinedload(QuoteResponse.reviewed_by)
        )\
        .filter(QuoteResponse.id == quote_response_id)\
        .first()

def get_quote_responses(db: Session, quote_request_id: str):
    return db.query(QuoteResponse)\
        .options(
            joinedload(QuoteResponse.vendor),
            joinedload(QuoteResponse.reviewed_by)
        )\
        .filter(QuoteResponse.quote_request_id == quote_request_id)\
        .order_by(QuoteResponse.submitted_at)\
        .all()

def get_vendor_quote_responses(db: Session, vendor_id: str, skip: int = 0, limit: int = 100):
    return db.query(QuoteResponse)\
        .options(
            joinedload(QuoteResponse.quote_request),
            joinedload(QuoteResponse.reviewed_by)
        )\
        .filter(QuoteResponse.vendor_id == vendor_id)\
        .order_by(desc(QuoteResponse.submitted_at))\
        .offset(skip)\
        .limit(limit)\
        .all()

def create_quote_response(db: Session, response_data: QuoteResponseCreate):
    # Check if this vendor already has a response for this quote request
    existing = db.query(QuoteResponse)\
        .filter(
            QuoteResponse.quote_request_id == response_data.quote_request_id,
            QuoteResponse.vendor_id == response_data.vendor_id
        ).first()
    
    if existing:
        # Update existing response
        for key, value in response_data.dict().items():
            if value is not None:
                setattr(existing, key, value)
        existing.submitted_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        
        # Update the QuoteRequestVendor record
        vendor_selection = db.query(QuoteRequestVendor)\
            .filter(
                QuoteRequestVendor.quote_request_id == response_data.quote_request_id,
                QuoteRequestVendor.vendor_id == response_data.vendor_id
            ).first()
        
        if vendor_selection:
            vendor_selection.has_responded = True
            db.commit()
        
        return existing
    
    # Create new response
    db_response = QuoteResponse(
        id=str(uuid.uuid4()),
        quote_request_id=response_data.quote_request_id,
        vendor_id=response_data.vendor_id,
        quote_amount=response_data.quote_amount,
        description=response_data.description,
        delivery_timeline=response_data.delivery_timeline,
        status="pending_review",
        submitted_at=datetime.utcnow()
    )
    db.add(db_response)
    
    # Update the QuoteRequestVendor record
    vendor_selection = db.query(QuoteRequestVendor)\
        .filter(
            QuoteRequestVendor.quote_request_id == response_data.quote_request_id,
            QuoteRequestVendor.vendor_id == response_data.vendor_id
        ).first()
    
    if vendor_selection:
        vendor_selection.has_responded = True
        
    db.commit()
    db.refresh(db_response)
    return db_response

def update_quote_response(db: Session, quote_response_id: str, **kwargs):
    db_response = db.query(QuoteResponse).filter(QuoteResponse.id == quote_response_id).first()
    if db_response:
        for key, value in kwargs.items():
            setattr(db_response, key, value)
        db.commit()
        db.refresh(db_response)
    return db_response

def review_quote_response(db: Session, quote_response_id: str, status: str, notes: Optional[str], reviewer_id: str):
    db_response = db.query(QuoteResponse).filter(QuoteResponse.id == quote_response_id).first()
    if db_response:
        db_response.status = status
        db_response.notes = notes
        db_response.reviewed_by_id = reviewer_id
        db_response.reviewed_at = datetime.utcnow()
        
        # If accepting this quote, update the quote request status
        if status == "accepted":
            quote_request = db.query(QuoteRequest).filter(QuoteRequest.id == db_response.quote_request_id).first()
            if quote_request:
                quote_request.status = "fulfilled"
                quote_request.completed_date = datetime.utcnow()
        
        db.commit()
        db.refresh(db_response)
    return db_response

def delete_quote_response(db: Session, quote_response_id: str):
    db_response = db.query(QuoteResponse).filter(QuoteResponse.id == quote_response_id).first()
    if db_response:
        db.delete(db_response)
        db.commit()
        return True
    return False

# Add after the existing quote request functions

def get_vendor_quote_requests(db: Session, vendor_id: str, skip: int = 0, limit: int = 100, status: str = None):
    """Get quote requests where a specific vendor is selected"""
    query = db.query(QuoteRequest).join(QuoteRequestVendor).filter(
        QuoteRequestVendor.vendor_id == vendor_id
    )
    
    if status:
        query = query.filter(QuoteRequest.status == status)
    
    # Eagerly load related data
    query = query.options(
        joinedload(QuoteRequest.created_by),
        joinedload(QuoteRequest.vendor_selections),
        joinedload(QuoteRequest.responses)
    )
    
    return query.order_by(desc(QuoteRequest.created_at)).offset(skip).limit(limit).all()