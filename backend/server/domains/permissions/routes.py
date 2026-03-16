from fastapi import APIRouter, HTTPException
from typing import Optional
from server.domains.permissions.services import RoleService, UserRoleService
from server.domains.permissions.repositories import RoleRepository, PermissionRepository, UserRoleRepository

router = APIRouter(prefix="", tags=["permissions"])
role_service = RoleService(RoleRepository(), PermissionRepository())
user_role_service = UserRoleService(UserRoleRepository(), RoleRepository())

@router.post("/roles")
def create_role(company_id: str, name: str, description: Optional[str] = None):
    try:
        role = role_service.create_role(company_id, name, description)
        return {"status": "success", "data": role}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/roles/{role_id}")
def get_role(role_id: str):
    try:
        role = role_service.get_role(role_id)
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
        return {"status": "success", "data": role}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/roles/{role_id}")
def delete_role(role_id: str):
    try:
        role_service.delete_role(role_id)
        return {"status": "success", "message": "Role deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/user-roles")
def assign_role(user_id: str, role_id: str, company_id: Optional[str] = None):
    try:
        result = user_role_service.assign_role(user_id, role_id, company_id)
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/users/{user_id}/roles")
def get_user_roles(user_id: str):
    try:
        roles = user_role_service.get_user_roles(user_id)
        return {"status": "success", "data": roles}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/roles/{role_id}")
def update_role(role_id: str, name: Optional[str] = None, description: Optional[str] = None):
    try:
        updates = {}
        if name:
            updates['name'] = name
        if description:
            updates['description'] = description
        role = role_service.update_role(role_id, updates)
        return {"status": "success", "data": role}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
