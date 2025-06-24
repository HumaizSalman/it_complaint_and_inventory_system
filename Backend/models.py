from sqlalchemy import Column, String, DateTime, ForeignKey, Float, Integer, Text, Boolean, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.ext.hybrid import hybrid_property
from database import Base
import uuid
from datetime import datetime
import enum
import json
from typing import List

class UserRole(enum.Enum):
    EMPLOYEE = "employee"
    ATS = "ats"
    ASSISTANT_MANAGER = "assistant_manager"
    MANAGER = "manager"
    VENDOR = "vendor"
    ADMIN = "admin"

class ComplaintStatus(enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    FORWARDED = "forwarded"
    PENDING_MANAGER_APPROVAL = "pending_manager_approval"
    RESOLVED = "resolved"
    CLOSED = "closed"

class Priority(enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AssetStatus(enum.Enum):
    AVAILABLE = "available"
    ASSIGNED = "assigned"
    MAINTENANCE = "maintenance"
    REPAIR = "repair"
    RETIRED = "retired"

class AssetCondition(enum.Enum):
    NEW = "new"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"
    UNUSABLE = "unusable"

class MaintenanceStatus(enum.Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class QuoteRequestStatus(enum.Enum):
    DRAFT = "draft"
    OPEN = "open"
    PENDING = "pending"
    CLOSED = "closed"
    FULFILLED = "fulfilled"
    CANCELLED = "cancelled"

class QuoteResponseStatus(enum.Enum):
    PENDING_REVIEW = "pending_review"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    NEGOTIATING = "negotiating"

class User(Base):
    __tablename__ = "users"
    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(50), default="employee")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    
    quote_requests = relationship("QuoteRequest", back_populates="created_by")
    quote_responses_reviewed = relationship("QuoteResponse", back_populates="reviewed_by")

class Employee(Base):
    __tablename__ = "employees"
    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    department = Column(String(100), nullable=False)
    role = Column(String(100), nullable=False)
    phone_number = Column(String(20), nullable=True)
    location = Column(String(255), nullable=True)
    date_joined = Column(DateTime, default=datetime.utcnow)
    
    complaints = relationship("Complaint", back_populates="employee", cascade="all, delete-orphan")
    assigned_assets = relationship("Asset", back_populates="assigned_to", foreign_keys="[Asset.assigned_to_id]")
    maintenance_requests = relationship("MaintenanceRequest", back_populates="requested_by")

class Complaint(Base):
    __tablename__ = "complaints"
    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    employee_id = Column(String(36), ForeignKey("employees.id"))
    asset_id = Column(String(36), ForeignKey("assets.id"), nullable=True)
    title = Column(String(255), index=True, nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(String(20), nullable=False)
    status = Column(String(50), default="open")
    date_submitted = Column(DateTime, default=datetime.utcnow)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    images = Column(Text)  # JSON string of base64 image data
    assigned_to = Column(String(36), ForeignKey("users.id"), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    resolution_date = Column(DateTime, nullable=True)
    component_purchase_reason = Column(Text, nullable=True)  # Component purchase details for ATS forwarding
    
    employee = relationship("Employee", back_populates="complaints")
    asset = relationship("Asset")
    replies = relationship("Reply", back_populates="complaint", cascade="all, delete-orphan")
    handler = relationship("User", foreign_keys=[assigned_to])
    
    @hybrid_property
    def images_list(self) -> List[str]:
        """Convert images JSON string to list."""
        if not self.images:
            return []
        try:
            return json.loads(self.images)
        except:
            return []

class Reply(Base):
    __tablename__ = "replies"
    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    complaint_id = Column(String(36), ForeignKey("complaints.id"))
    message = Column(Text, nullable=False)
    from_user = Column(String(255), nullable=False)  # Name or role of sender
    user_id = Column(String(36), ForeignKey("users.id"))  # Actual user ID
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    complaint = relationship("Complaint", back_populates="replies")
    user = relationship("User")

class Asset(Base):
    __tablename__ = "assets"
    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), index=True, nullable=False)
    type = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False)
    serial_number = Column(String(100), unique=True, nullable=False)
    condition = Column(String(20), nullable=False)
    specifications = Column(Text, nullable=True)
    purchase_cost = Column(Float, nullable=False)
    purchase_date = Column(DateTime, nullable=False)
    expected_lifespan = Column(Integer)  # in years
    total_repair_cost = Column(Float, default=0.0)
    next_maintenance_due = Column(DateTime, nullable=True)
    assigned_to_id = Column(String(36), ForeignKey("employees.id"), nullable=True)
    assigned_date = Column(DateTime, nullable=True)
    vendor_id = Column(String(36), ForeignKey("vendors.id"), nullable=True)
    warranty_expiry = Column(DateTime, nullable=True)
    
    assigned_to = relationship("Employee", back_populates="assigned_assets")
    vendor = relationship("Vendor", back_populates="supplied_assets")
    maintenance_history = relationship("MaintenanceRecord", back_populates="asset")

class Vendor(Base):
    __tablename__ = "vendors"
    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(20), nullable=False)
    address = Column(String(255), nullable=True)
    contact_person = Column(String(255), nullable=True)
    service_type = Column(String(100), nullable=False)  # Hardware, Software, Both
    contract_start = Column(DateTime, nullable=True)
    contract_end = Column(DateTime, nullable=True)
    
    supplied_assets = relationship("Asset", back_populates="vendor")
    maintenance_services = relationship("MaintenanceRequest", back_populates="vendor")
    quote_responses = relationship("QuoteResponse", back_populates="vendor")

class MaintenanceRequest(Base):
    __tablename__ = "maintenance_requests"
    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    asset_id = Column(String(36), ForeignKey("assets.id"), nullable=False)
    requested_by_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    assigned_to_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    vendor_id = Column(String(36), ForeignKey("vendors.id"), nullable=True)
    request_date = Column(DateTime, default=datetime.utcnow)
    scheduled_date = Column(DateTime, nullable=True)
    completion_date = Column(DateTime, nullable=True)
    description = Column(Text, nullable=False)
    status = Column(String(20), default="scheduled")
    cost = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    
    asset = relationship("Asset")
    requested_by = relationship("Employee", back_populates="maintenance_requests")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    vendor = relationship("Vendor", back_populates="maintenance_services")

class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"
    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    asset_id = Column(String(36), ForeignKey("assets.id"), nullable=False)
    maintenance_date = Column(DateTime, nullable=False)
    performed_by = Column(String(255), nullable=False)  # Could be vendor name or employee
    description = Column(Text, nullable=False)
    cost = Column(Float, default=0.0)
    next_maintenance_due = Column(DateTime, nullable=True)
    maintenance_type = Column(String(50), nullable=False)  # Preventive, Corrective, etc.
    
    asset = relationship("Asset", back_populates="maintenance_history")

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    read = Column(Boolean, default=False)
    type = Column(String(50), nullable=False)  # Complaint, Asset, Maintenance, etc.
    related_id = Column(String(36), nullable=True)  # ID of related entity
    
    user = relationship("User")

class QuoteRequest(Base):
    __tablename__ = "quote_requests"
    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    requirements = Column(Text, nullable=True)
    budget = Column(Float, nullable=True)
    priority = Column(String(20), nullable=False, default="medium")
    status = Column(String(20), nullable=False, default="draft")
    created_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    due_date = Column(DateTime, nullable=True)
    completed_date = Column(DateTime, nullable=True)
    
    created_by = relationship("User", back_populates="quote_requests")
    responses = relationship("QuoteResponse", back_populates="quote_request", cascade="all, delete-orphan")
    vendor_selections = relationship("QuoteRequestVendor", back_populates="quote_request", cascade="all, delete-orphan")

class QuoteRequestVendor(Base):
    __tablename__ = "quote_request_vendors"
    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    quote_request_id = Column(String(36), ForeignKey("quote_requests.id"), nullable=False)
    vendor_id = Column(String(36), ForeignKey("vendors.id"), nullable=False)
    sent_date = Column(DateTime, default=datetime.utcnow)
    has_responded = Column(Boolean, default=False)
    
    quote_request = relationship("QuoteRequest", back_populates="vendor_selections")
    vendor = relationship("Vendor")
    
    __table_args__ = (
        # Add UniqueConstraint to ensure a vendor can only be added once to a quote request
        # Import UniqueConstraint above if using this constraint
        # UniqueConstraint('quote_request_id', 'vendor_id', name='uq_quote_request_vendor'),
    )

class QuoteResponse(Base):
    __tablename__ = "quote_responses"
    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    quote_request_id = Column(String(36), ForeignKey("quote_requests.id"), nullable=False)
    vendor_id = Column(String(36), ForeignKey("vendors.id"), nullable=False)
    quote_amount = Column(Float, nullable=False)
    description = Column(Text, nullable=False)
    delivery_timeline = Column(String(255), nullable=True)
    status = Column(String(20), nullable=False, default="pending_review")
    submitted_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)
    
    quote_request = relationship("QuoteRequest", back_populates="responses")
    vendor = relationship("Vendor", back_populates="quote_responses")
    reviewed_by = relationship("User", back_populates="quote_responses_reviewed")