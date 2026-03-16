"""
Base repository pattern for data access.
"""
from abc import ABC, abstractmethod
from typing import Generic, TypeVar, List, Optional, Dict, Any


T = TypeVar('T')


class BaseRepository(ABC, Generic[T]):
    """Base repository with common CRUD operations"""

    def __init__(self):
        self.data: Dict[str, T] = {}

    @abstractmethod
    def save(self, entity: T) -> T:
        """Save entity"""
        pass

    @abstractmethod
    def get(self, id: str) -> Optional[T]:
        """Get entity by ID"""
        pass

    @abstractmethod
    def delete(self, id: str) -> bool:
        """Delete entity"""
        pass

    @abstractmethod
    def list(self, limit: int = 100, offset: int = 0) -> List[T]:
        """List all entities"""
        pass


class InMemoryRepository(BaseRepository[T]):
    """In-memory repository implementation for development"""

    def save(self, entity: T) -> T:
        """Save entity to memory"""
        self.data[entity.id] = entity
        return entity

    def get(self, id: str) -> Optional[T]:
        """Get entity from memory"""
        return self.data.get(id)

    def delete(self, id: str) -> bool:
        """Delete entity from memory"""
        if id in self.data:
            del self.data[id]
            return True
        return False

    def list(self, limit: int = 100, offset: int = 0) -> List[T]:
        """List entities from memory"""
        items = list(self.data.values())
        return items[offset:offset+limit]
