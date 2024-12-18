from typing import List
from uuid import UUID, uuid4
from pydantic import BaseModel


class ProjectDTO(BaseModel):
    id: UUID = uuid4()
    name: str = ""
    description: str = ""
    access_ids: List[str] = []
