"""
Base repository interface for common CRUD operations
"""
from abc import ABC, abstractmethod
from typing import Generic, TypeVar, List, Optional, Any, Dict
from sqlalchemy.orm import Session

# Type variables for generic repository
T = TypeVar('T')
CreateSchemaType = TypeVar('CreateSchemaType')
UpdateSchemaType = TypeVar('UpdateSchemaType')


class BaseRepository(ABC, Generic[T, CreateSchemaType, UpdateSchemaType]):
    """Abstract base repository class"""
    
    def __init__(self, model: type[T]):
        self.model = model
    
    @abstractmethod
    def create(self, db: Session, *, obj_in: CreateSchemaType) -> T:
        """Create a new record"""
        pass
    
    @abstractmethod
    def get(self, db: Session, id: int) -> Optional[T]:
        """Get a record by ID"""
        pass
    
    @abstractmethod
    def get_multi(
        self, 
        db: Session, 
        *, 
        skip: int = 0, 
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[T]:
        """Get multiple records with optional filters"""
        pass
    
    @abstractmethod
    def update(
        self, 
        db: Session, 
        *, 
        db_obj: T, 
        obj_in: UpdateSchemaType
    ) -> T:
        """Update an existing record"""
        pass
    
    @abstractmethod
    def delete(self, db: Session, *, id: int) -> T:
        """Delete a record by ID"""
        pass
    
    @abstractmethod
    def count(self, db: Session, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count records with optional filters"""
        pass
    
    def exists(self, db: Session, id: int) -> bool:
        """Check if a record exists by ID"""
        return self.get(db, id) is not None


class SQLAlchemyRepository(BaseRepository[T, CreateSchemaType, UpdateSchemaType]):
    """SQLAlchemy implementation of base repository"""
    
    def create(self, db: Session, *, obj_in: CreateSchemaType) -> T:
        """Create a new record"""
        obj_in_data = obj_in.dict()
        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def get(self, db: Session, id: int) -> Optional[T]:
        """Get a record by ID"""
        return db.query(self.model).filter(self.model.id == id).first()
    
    def get_multi(
        self, 
        db: Session, 
        *, 
        skip: int = 0, 
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[T]:
        """Get multiple records with optional filters"""
        query = db.query(self.model)
        
        if filters:
            for key, value in filters.items():
                if hasattr(self.model, key):
                    query = query.filter(getattr(self.model, key) == value)
        
        return query.offset(skip).limit(limit).all()
    
    def update(
        self, 
        db: Session, 
        *, 
        db_obj: T, 
        obj_in: UpdateSchemaType
    ) -> T:
        """Update an existing record"""
        obj_data = obj_in.dict(exclude_unset=True)
        for field, value in obj_data.items():
            setattr(db_obj, field, value)
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def delete(self, db: Session, *, id: int) -> T:
        """Delete a record by ID"""
        obj = db.query(self.model).get(id)
        if obj:
            db.delete(obj)
            db.commit()
        return obj
    
    def count(self, db: Session, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count records with optional filters"""
        query = db.query(self.model)
        
        if filters:
            for key, value in filters.items():
                if hasattr(self.model, key):
                    query = query.filter(getattr(self.model, key) == value)
        
        return query.count() 