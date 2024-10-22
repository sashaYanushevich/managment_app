from typing import List, Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.future import select

from app import schemas, repository, models
from app.api import deps
from app.db.session import get_db

router = APIRouter()

@router.post("/")
async def create_package(
    package: schemas.PackageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_admin),
):
    db_package = models.Package(**package.dict())
    db.add(db_package)
    await db.commit()
    await db.refresh(db_package)
    return db_package

@router.get("/", response_model=List[schemas.Package])
async def read_packages(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Получить список всех пакетов.
    """
    packages = await repository.package.get_multi(db)
    return packages

@router.get("/my", response_model=List[schemas.Package])
async def read_my_packages(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Получить список пакетов текущего пользователя.
    """
    packages = await repository.package.get_by_customer_id(db, customer_id=current_user.id)
    for package in packages:
        used_modems = sum(server.max_modems for server in package.servers)
        package.free_modems = package.max_modems - used_modems
    return packages

@router.get("/{package_id}", response_model=schemas.Package)
async def read_package(
    package_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
):
    query = select(models.Package).options(selectinload(models.Package.servers)).filter(models.Package.id == package_id)
    result = await db.execute(query)
    package = result.scalar_one_or_none()

    if package is None:
        raise HTTPException(status_code=404, detail="Package not found")
    
    if package.customer_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return package

@router.put("/{package_id}", response_model=schemas.Package)
async def update_package(
    package_id: int,
    package_in: schemas.PackageUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Обновить пакет.
    """
    package = await repository.package.get(db, id=package_id)
    if not package:
        raise HTTPException(status_code=404, detail="Пакет не найден")
    package = await repository.package.update(db, db_obj=package, obj_in=package_in)
    return package

@router.delete("/{package_id}", response_model=schemas.Package)
async def delete_package(
    package_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Удалить пакет.
    """
    package = await repository.package.get(db, id=package_id)
    if not package:
        raise HTTPException(status_code=404, detail="Пакет не найден")
    package = await repository.package.remove(db, id=package_id)
    return package
