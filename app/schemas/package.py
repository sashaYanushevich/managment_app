from typing import Optional, List
from datetime import date, datetime, timezone
from pydantic import BaseModel, Field
from .server import Server

class PackageBase(BaseModel):
    comment: Optional[str] = None
    max_modems: Optional[int] = None
    start_date: Optional[datetime] = None
    expiry: Optional[datetime] = None

class PackageCreate(BaseModel):
    customer_id: int
    comment: str
    max_modems: int
    start_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expiry: datetime

    class Config:
        from_attributes = True

class PackageUpdate(BaseModel):
    customer_id: Optional[int]
    comment: Optional[str]
    max_modems: Optional[int]
    expiry: Optional[date]

class PackageInDBBase(PackageBase):
    id: int
    customer_id: int

    class Config:
        from_attributes = True

class Package(PackageInDBBase):
    free_modems: Optional[int] = None
    servers: List[Server] = []

    class Config:
        from_attributes = True

Package.model_rebuild()
