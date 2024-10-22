from typing import Optional
from pydantic import BaseModel

class UserBase(BaseModel):
    email: Optional[str] = None
    login: Optional[str] = None
    name: Optional[str] = None

class UserCreate(UserBase):
    email: str
    login: str
    password: str

class UserUpdate(BaseModel):
    email: Optional[str]
    name: Optional[str]
    is_active: Optional[bool] = True
    password: Optional[str] = None

class UserInDBBase(UserBase):
    id: int
    is_active: bool
    is_admin: bool

    class Config:
        from_attributes = True

class User(UserInDBBase):
    pass

class UserInDB(UserInDBBase):
    hashed_password: str
