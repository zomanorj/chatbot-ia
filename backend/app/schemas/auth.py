import uuid
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field, StringConstraints

from app.models import Role

NormalizedEmail = Annotated[EmailStr, AfterValidator(str.lower)]
Password = Annotated[str, Field(min_length=8, max_length=128)]
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]


class RegisterRequest(BaseModel):
    email: NormalizedEmail
    password: Password
    full_name: Name
    organization_name: Name


class LoginRequest(BaseModel):
    email: NormalizedEmail
    password: Annotated[str, Field(min_length=1, max_length=128)]


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str


class OrganizationRead(BaseModel):
    id: uuid.UUID
    name: str
    role: Role


class MeResponse(BaseModel):
    user: UserRead
    organizations: list[OrganizationRead]
