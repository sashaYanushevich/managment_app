import random
import string
from typing import Any, Dict, Optional, Union, List, Tuple

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate

class CRUDUser:
    async def get(self, db: AsyncSession, id: int) -> Optional[User]:
        result = await db.execute(select(User).filter(User.id == id))
        return result.scalars().first()

    async def get_by_login(self, db: AsyncSession, login: str) -> Optional[User]:
        result = await db.execute(select(User).filter(User.login == login))
        return result.scalars().first()

    async def get_multi(self, db: AsyncSession, skip: int = 0, limit: int = 100) -> List[User]:
        result = await db.execute(select(User).offset(skip).limit(limit))
        return result.scalars().all()

    async def create(self, db: AsyncSession, obj_in: UserCreate) -> User:
        db_obj = User(
            email=obj_in.email,
            login=obj_in.login,
            hashed_password=get_password_hash(obj_in.password),
            name=obj_in.name,
            is_active=True,
            is_admin=False,
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def get_by_email(self, db: AsyncSession, email: str) -> Optional[User]:
        result = await db.execute(select(User).filter(User.email == email))
        return result.scalars().first()

    async def update(
        self, db: AsyncSession, db_obj: User, obj_in: Union[UserUpdate, Dict[str, Any]]
    ) -> User:
        update_data = obj_in.dict(exclude_unset=True)
        if "password" in update_data:
            hashed_password = get_password_hash(update_data["password"])
            update_data["hashed_password"] = hashed_password
            del update_data["password"]
        for field in update_data:
            setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def authenticate(self, db: AsyncSession, login: str, password: str) -> Optional[User]:
        user = await self.get_by_login(db, login=login)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user
    
    async def remove(self, db: AsyncSession, id: int) -> User:
        obj = await self.get(db, id=id)
        if obj:
            await db.delete(obj)
            await db.commit()
        return obj

    async def is_active(self, user: User) -> bool:
        return user.is_active

    async def is_admin(self, user: User) -> bool:
        return user.is_admin
    
    def generate_password(self):
        characters = string.ascii_letters + string.digits + string.punctuation
        return ''.join(random.choice(characters) for _ in range(12))
    
    async def reset_password(self, db: AsyncSession, email: str) -> Tuple[User, str]:
        user = await self.get_by_email(db, email=email)
        if not user:
            return None, None
        
        new_password = self.generate_password()
        hashed_password = get_password_hash(new_password)
        
        user.hashed_password = hashed_password
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
        return user, new_password

crud_user = CRUDUser()
