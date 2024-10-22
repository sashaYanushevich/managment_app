from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Any
from datetime import datetime
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import selectinload, joinedload

from app import schemas, models
from app.api import deps
from app.db.session import get_db
from app.repository import server as crud_server, package as crud_package
from app.core import external_api  # Модуль для работы со сторонним API
from app.core.config import settings

limiter = Limiter(key_func=get_remote_address)

router = APIRouter()

@router.post("/", response_model=schemas.Server)
@limiter.limit("5/30minutes")
async def create_server(
    request: Request,
    *,
    db: AsyncSession = Depends(get_db),
    server_in: schemas.ServerCreateInput,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Создать новый сервер.
    """
    # Получаем выбранный пакет
    package = await crud_package.get(db, id=server_in.package_id)
    if not package or package.customer_id != current_user.id:
        raise HTTPException(status_code=400, detail="Пакет не найден или недоступен")

    # Проверяем лимит модемов
    servers = await crud_server.get_multi_by_package(db, package_id=package.id, customer_id=current_user.id)
    total_modems = sum(server.max_modems for server in servers)
    if total_modems + server_in.max_modems > package.max_modems:
        raise HTTPException(status_code=400, detail="Превышен лимит модемов в пакете.")

    # Собираем machine_data
    machine_data = f"n_cpu={server_in.n_cpu},rootfs={server_in.rootfs},mem={server_in.mem},bios_uuid={server_in.bios_uuid}"

    # Подготавливаем данные для создания сервера в базе данных
    server_create_db = schemas.ServerCreateDB(
        name=server_in.name,
        max_modems=server_in.max_modems,
        machine_data=machine_data,
        package_id=server_in.package_id
    )

    # Создаем сервер в базе данных
    server = await crud_server.create(db, obj_in=server_create_db)

    # Вызов стороннего API для создания лицензии
    try:
        license_data = await external_api.issue_license(
            date_expiry=package.expiry.strftime("%Y-%m-%d") if package.expiry else None,
            max_modems=server.max_modems,
            machine_data=server.machine_data,
            customer_id=current_user.login,
            comment=server.name
        )
        # Сохраняем hash лицензии в базе данных
        server.license_hash = license_data.get("license_hash")
        await db.commit()
        await db.refresh(server)
    except Exception as e:
        # Если возникла ошибка при создании лицензии, удаляем сервер
        await crud_server.remove(db, id=server.id)
        raise HTTPException(status_code=400, detail=str(e))

    return server

@router.get("/{server_id}", response_model=schemas.Server)
async def read_server_number(
    *,
    db: AsyncSession = Depends(get_db),
    server_id: int,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Получить сервер по номеру.
    """
    server = await crud_server.get(db, id=server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Сервер не найден")
    
    if server.package.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="У вас нет доступа к этому серверу")
    
    return server

@router.get("/", response_model=List[schemas.Server])
async def read_servers(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Получить список серверов текущего пользователя.
    """
    # Получаем все пакеты пользователя
    packages = await crud_package.get_by_customer_id(db, customer_id=current_user.id)
    if not packages:
        return []

    # Получаем ID пакетов пользователя
    package_ids = [pkg.id for pkg in packages]

    # Запрашиваем серверы с подгрузкой связанных пакетов
    result = await db.execute(
        select(models.Server)
        .options(selectinload(models.Server.package))
        .filter(models.Server.package_id.in_(package_ids))
    )
    servers = result.scalars().all()

    return servers

@router.put("/{server_id}", response_model=schemas.Server)
async def update_server(
    *,
    db: AsyncSession = Depends(get_db),
    server_id: int,
    server_in: schemas.ServerUpdate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Обновить сервер.
    """
    server = await crud_server.get(db, id=server_id)
    if not server or server.package.customer_id != current_user.id:
        raise HTTPException(status_code=404, detail="Сервер не найден")

    # Если меняются параметры сервера, проверяем лимиты и обновляем лицензию
    if server_in.max_modems and server_in.max_modems != server.max_modems:
        package = server.package
        total_modems = sum(s.max_modems for s in package.servers if s.id != server.id)
        if total_modems + server_in.max_modems > package.max_modems:
            raise HTTPException(status_code=400, detail="Превышен лимит модемов в пакете.")

        # Обновляем лицензию через сторонний API
        try:
            await external_api.revoke_license(license_hash=server.license_hash)
            license_data = await external_api.issue_license(
                date_expiry=package.expiry.strftime("%Y-%m-%d") if package.expiry else None,
                max_modems=server_in.max_modems,
                machine_data=server.machine_data,
                customer_id=current_user.login,
                comment=server.name
            )
            server.license_hash = license_data.get("license_hash")
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    server = await crud_server.update(db, db_obj=server, obj_in=server_in)
    return server

@router.delete("/{server_id}", response_model=schemas.Server)
async def delete_server(
    *,
    db: AsyncSession = Depends(get_db),
    server_id: int,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Удалить сервер.
    """
    server = await crud_server.get(db, id=server_id)
    if not server or server.package.customer_id != current_user.id:
        raise HTTPException(status_code=404, detail="Сервер не найден")

    # Отзываем лицензию через сторонний API
    try:
        await external_api.revoke_license(license_hash=server.license_hash)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    server = await crud_server.remove(db, id=server_id)
    return server
