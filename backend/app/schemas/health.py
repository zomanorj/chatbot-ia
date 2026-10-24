from typing import Literal

from pydantic import BaseModel

Status = Literal["ok", "error"]


class Liveness(BaseModel):
    status: Status


class Readiness(BaseModel):
    status: Status
    checks: dict[str, Status]
