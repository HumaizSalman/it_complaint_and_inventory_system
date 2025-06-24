from pydantic import BaseModel, Field, EmailStr, validator
from datetime import datetime
from typing import List, Optional, Union, Any
import json
from enum import Enum

# Enums for validation
class UserRoleEnum(str, Enum):
    EMPLOYEE = "employee"
    ATS = "ats"
    ASSISTANT_MANAGER = "assistant_manager"
    MANAGER = "manager"
    VENDOR = "vendor"
    ADMIN = "admin"

class PriorityEnum(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ComplaintStatusEnum(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    FORWARDED = "forwarded"
    PENDING_MANAGER_APPROVAL = "pending_manager_approval"
    RESOLVED = "resolved"
    CLOSED = "closed"

class AssetStatusEnum(str, Enum):
    AVAILABLE = "available"
    ASSIGNED = "assigned"
    MAINTENANCE = "maintenance"
    REPAIR = "repair"
    RETIRED = "retired"

class AssetConditionEnum(str, Enum):
    NEW = "new"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"
    UNUSABLE = "unusable"

class MaintenanceStatusEnum(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class QuoteRequestStatusEnum(str, Enum):
    DRAFT = "draft"
    OPEN = "open"
    PENDING = "pending"
    CLOSED = "closed"
    FULFILLED = "fulfilled"
    CANCELLED = "cancelled"

class QuoteResponseStatusEnum(str, Enum):
    PENDING_REVIEW = "pending_review"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    NEGOTIATING = "negotiating"

# Base Schemas
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str
    role: UserRoleEnum

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[UserRoleEnum] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: str
    role: str
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class EmployeeBase(BaseModel):
    name: str
    email: EmailStr
    department: str
    role: str

class EmployeeCreate(EmployeeBase):
    phone_number: Optional[str] = None
    location: Optional[str] = None

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    role: Optional[str] = None
    phone_number: Optional[str] = None
    location: Optional[str] = None

class EmployeeResponse(EmployeeBase):
    id: str
    date_joined: datetime
    phone_number: Optional[str] = None
    location: Optional[str] = None
    temp_password: Optional[str] = None
    username: Optional[str] = None
    
    class Config:
        from_attributes = True

class ReplyBase(BaseModel):
    message: str
    from_user: str

class ReplyCreate(ReplyBase):
    complaint_id: str
    user_id: Optional[str] = None

class ReplyResponse(ReplyBase):
    id: str
    complaint_id: str
    timestamp: datetime
    user_id: Optional[str] = None
    
    class Config:
        from_attributes = True

class ComplaintBase(BaseModel):
    title: str
    description: str
    priority: PriorityEnum

class ComplaintCreate(ComplaintBase):
    employee_id: str
    asset_id: Optional[str] = None
    images: Optional[List[str]] = []

class ComplaintUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[PriorityEnum] = None
    status: Optional[ComplaintStatusEnum] = None
    assigned_to: Optional[str] = None
    resolution_notes: Optional[str] = None
    component_purchase_reason: Optional[str] = None

class ComplaintResponse(ComplaintBase):
    id: str
    employee_id: str
    asset_id: Optional[str] = None
    status: ComplaintStatusEnum
    date_submitted: datetime
    last_updated: datetime
    images: List[str] = []
    assigned_to: Optional[str] = None
    resolution_notes: Optional[str] = None
    resolution_date: Optional[datetime] = None
    component_purchase_reason: Optional[str] = None
    employee: EmployeeResponse
    asset: Optional["AssetResponse"] = None
    replies: List[ReplyResponse] = []
    
    @validator('images', pre=True)
    def parse_images(cls, v):
        """Convert images from JSON string to list"""
        if isinstance(v, str):
            try:
                return json.loads(v) if v else []
            except:
                return []
        elif isinstance(v, list):
            return v
        else:
            return []
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class AssetBase(BaseModel):
    name: str
    type: str
    status: AssetStatusEnum
    serial_number: str
    condition: AssetConditionEnum
    specifications: Optional[str] = None
    purchase_cost: float
    purchase_date: datetime
    expected_lifespan: int

class AssetCreate(AssetBase):
    vendor_id: Optional[str] = None
    warranty_expiry: Optional[datetime] = None

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[AssetStatusEnum] = None
    condition: Optional[AssetConditionEnum] = None
    specifications: Optional[str] = None
    total_repair_cost: Optional[float] = None
    next_maintenance_due: Optional[datetime] = None
    assigned_to_id: Optional[str] = None
    assigned_date: Optional[datetime] = None

class AssetAssign(BaseModel):
    employee_id: str

class AssetResponse(AssetBase):
    id: str
    total_repair_cost: float
    next_maintenance_due: Optional[datetime] = None
    assigned_to_id: Optional[str] = None
    assigned_date: Optional[datetime] = None
    vendor_id: Optional[str] = None
    warranty_expiry: Optional[datetime] = None
    assigned_to: Optional["EmployeeResponse"] = None
    vendor: Optional["VendorResponse"] = None
    
    class Config:
        from_attributes = True

class VendorBase(BaseModel):
    name: str
    email: EmailStr
    phone: str
    service_type: str

class VendorCreate(VendorBase):
    address: Optional[str] = None
    contact_person: Optional[str] = None
    contract_start: Optional[datetime] = None
    contract_end: Optional[datetime] = None

class VendorUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    service_type: Optional[str] = None
    contract_start: Optional[datetime] = None
    contract_end: Optional[datetime] = None

class VendorResponse(VendorBase):
    id: str
    address: Optional[str] = None
    contact_person: Optional[str] = None
    contract_start: Optional[datetime] = None
    contract_end: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Vendor creation response that includes login credentials
class VendorCreateResponse(VendorResponse):
    temp_password: Optional[str] = None
    username: Optional[str] = None

class MaintenanceRequestBase(BaseModel):
    asset_id: str
    description: str
    requested_by_id: str

class MaintenanceRequestCreate(MaintenanceRequestBase):
    vendor_id: Optional[str] = None
    scheduled_date: Optional[datetime] = None

class MaintenanceRequestUpdate(BaseModel):
    assigned_to_id: Optional[str] = None
    vendor_id: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    completion_date: Optional[datetime] = None
    status: Optional[MaintenanceStatusEnum] = None
    cost: Optional[float] = None
    notes: Optional[str] = None

class MaintenanceRequestResponse(MaintenanceRequestBase):
    id: str
    assigned_to_id: Optional[str] = None
    vendor_id: Optional[str] = None
    request_date: datetime
    scheduled_date: Optional[datetime] = None
    completion_date: Optional[datetime] = None
    status: MaintenanceStatusEnum
    cost: float
    notes: Optional[str] = None
    
    class Config:
        from_attributes = True

class MaintenanceRecordBase(BaseModel):
    asset_id: str
    maintenance_date: datetime
    performed_by: str
    description: str
    maintenance_type: str

class MaintenanceRecordCreate(MaintenanceRecordBase):
    cost: Optional[float] = 0.0
    next_maintenance_due: Optional[datetime] = None

class MaintenanceRecordResponse(MaintenanceRecordBase):
    id: str
    cost: float
    next_maintenance_due: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class NotificationBase(BaseModel):
    user_id: str
    message: str
    type: str
    related_id: Optional[str] = None
    
    class Config:
        extra = 'allow'

class NotificationCreate(NotificationBase):
    pass

class NotificationResponse(NotificationBase):
    id: str
    created_at: datetime
    read: bool
    
    class Config:
        from_attributes = True

class QuoteRequestBase(BaseModel):
    title: str
    description: str
    priority: PriorityEnum
    requirements: Optional[str] = None
    budget: Optional[float] = None
    due_date: Optional[datetime] = None

class QuoteRequestCreate(QuoteRequestBase):
    status: Optional[QuoteRequestStatusEnum] = QuoteRequestStatusEnum.DRAFT

class QuoteRequestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    budget: Optional[float] = None
    priority: Optional[PriorityEnum] = None
    status: Optional[QuoteRequestStatusEnum] = None
    due_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None

class QuoteRequestVendorBase(BaseModel):
    vendor_id: str

class QuoteRequestVendorCreate(QuoteRequestVendorBase):
    quote_request_id: str

class QuoteRequestVendorResponse(QuoteRequestVendorBase):
    id: str
    quote_request_id: str
    sent_date: datetime
    has_responded: bool
    vendor: VendorResponse
    
    class Config:
        from_attributes = True

class QuoteResponseBase(BaseModel):
    quote_request_id: str
    vendor_id: str
    quote_amount: float
    description: str
    delivery_timeline: Optional[str] = None

class QuoteResponseCreate(QuoteResponseBase):
    pass

class QuoteResponseUpdate(BaseModel):
    quote_amount: Optional[float] = None
    description: Optional[str] = None
    delivery_timeline: Optional[str] = None
    status: Optional[QuoteResponseStatusEnum] = None
    notes: Optional[str] = None

class QuoteResponseReview(BaseModel):
    status: QuoteResponseStatusEnum
    notes: Optional[str] = None

class QuoteResponseResponse(QuoteResponseBase):
    id: str
    status: QuoteResponseStatusEnum
    submitted_at: datetime
    reviewed_at: Optional[datetime] = None
    reviewed_by_id: Optional[str] = None
    notes: Optional[str] = None
    vendor: VendorResponse
    
    class Config:
        from_attributes = True

class QuoteRequestDetailResponse(QuoteRequestBase):
    id: str
    status: QuoteRequestStatusEnum
    created_by_id: str
    created_at: datetime
    completed_date: Optional[datetime] = None
    vendors: List[QuoteRequestVendorResponse] = []
    responses: List[QuoteResponseResponse] = []
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    id: str
    email: str
    role: str
    employee_id: Optional[str] = None

class TokenData(BaseModel):
    user_id: Optional[str] = None

# Component Purchase Flow schemas
class ATSComplaintForward(BaseModel):
    component_purchase_reason: str
    status: Optional[str] = "forwarded"
    assigned_to: Optional[str] = None

# Update forward references
ComplaintResponse.model_rebuild()
AssetResponse.model_rebuild()