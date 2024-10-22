from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ServerBase(BaseModel):
    name: str
    max_modems: int

class ServerCreate(BaseModel):
    name: str
    max_modems: int
    n_cpu: int
    rootfs: int
    mem: int
    bios_uuid: str
    package_id: int  

class ServerCreateInput(BaseModel):
    name: str
    max_modems: int
    n_cpu: int
    rootfs: int
    mem: int
    bios_uuid: str
    package_id: int

class ServerCreateDB(BaseModel):
    name: str
    max_modems: int
    machine_data: str
    package_id: int

class ServerUpdate(BaseModel):
    name: Optional[str] = None
    max_modems: Optional[int] = None
    n_cpu: Optional[int] = None
    rootfs: Optional[int] = None
    mem: Optional[int] = None
    bios_uuid: Optional[str] = None
    package_id: Optional[int] = None

class ServerInDBBase(ServerBase):
    id: int
    package_id: int
    license_hash: Optional[str] = None
    machine_data: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True
        
class Server(ServerInDBBase):
    pass
