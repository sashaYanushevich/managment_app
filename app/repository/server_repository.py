from typing import List, Any, Dict, Union, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload, joinedload
from app.models.package import Package
from app.models.server import Server
from app.schemas.server import ServerCreate, ServerCreateDB, ServerUpdate

class CRUDServer:
    async def get(self, db: AsyncSession, id: int) -> Optional[Server]:
        result = await db.execute(
            select(Server)
            .options(
                joinedload(Server.package).joinedload(Package.servers)
            )
            .filter(Server.id == id)
        )
        return result.scalars().first()

    async def create(self, db: AsyncSession, *, obj_in: ServerCreateDB) -> Server:
        db_obj = Server(**obj_in.dict())
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(self, db: AsyncSession, *, db_obj: Server, obj_in: Union[ServerUpdate, Dict[str, Any]]) -> Server:
        update_data = obj_in.dict(exclude_unset=True)
        for field in update_data:
            setattr(db_obj, field, update_data[field])
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def remove(self, db: AsyncSession, *, id: int) -> Server:
        obj = await self.get(db, id=id)
        if obj:
            await db.delete(obj)
            await db.commit()
        return obj
    
    async def get_multi_by_package(self, db: AsyncSession, package_id: int, customer_id: int) -> List[Server]:
        result = await db.execute(
            select(Server)
            .join(Package)
            .filter(Server.package_id == package_id, Package.customer_id == customer_id)
        )
        return result.scalars().all()


crud_server = CRUDServer()
