# app/crud/crud_package.py

from typing import Any, Dict, Optional, Union, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.package import Package
from app.schemas.package import PackageCreate, PackageUpdate

class CRUDPackage:
    async def get(self, db: AsyncSession, id: int) -> Optional[Package]:
        result = await db.execute(
            select(Package)
            .options(selectinload(Package.servers))
            .filter(Package.id == id)
        )
        return result.scalars().first()

    async def get_multi(self, db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Package]:
        result = await db.execute(
            select(Package)
            .options(selectinload(Package.servers))
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().unique().all()

    async def get_by_customer_id(self, db: AsyncSession, customer_id: int) -> List[Package]:
        result = await db.execute(
            select(Package)
            .options(selectinload(Package.servers))
            .filter(Package.customer_id == customer_id)
        )
        return result.scalars().unique().all()

    
    async def create(self, db: AsyncSession, obj_in: PackageCreate) -> Package:
        db_obj = Package(**obj_in.dict())
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(
        self, db: AsyncSession, db_obj: Package, obj_in: Union[PackageUpdate, Dict[str, Any]]
    ) -> Package:
        update_data = obj_in.dict(exclude_unset=True)
        for field in update_data:
            setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def remove(self, db: AsyncSession, id: int) -> Package:
        obj = await self.get(db, id=id)
        if obj:
            await db.delete(obj)
            await db.commit()
        return obj

crud_package = CRUDPackage()
