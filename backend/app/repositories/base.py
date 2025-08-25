"""
Base repository interface for common CRUD operations
"""
from abc import ABC, abstractmethod
from typing import Generic, TypeVar, List, Optional, Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

# Type variables for generic repository
T = TypeVar('T')
CreateSchemaType = TypeVar('CreateSchemaType')
UpdateSchemaType = TypeVar('UpdateSchemaType')


class BaseRepository(ABC, Generic[T, CreateSchemaType, UpdateSchemaType]):
    """Abstract base repository class"""
    
    def __init__(self, model: type[T]):
        self.model = model
    
    @abstractmethod
    async def create(self, db: AsyncSession, *, obj_in: CreateSchemaType) -> T:
        """Create a new record"""
        pass
    
    @abstractmethod
    async def get(self, db: AsyncSession, id: int) -> Optional[T]:
        """Get a record by ID"""
        pass
    
    @abstractmethod
    async def get_multi(
        self, 
        db: AsyncSession, 
        *, 
        skip: int = 0, 
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[T]:
        """Get multiple records with optional filters"""
        pass
    
    @abstractmethod
    async def update(
        self, 
        db: AsyncSession, 
        *, 
        db_obj: T, 
        obj_in: UpdateSchemaType
    ) -> T:
        """Update an existing record"""
        pass
    
    @abstractmethod
    async def delete(self, db: AsyncSession, *, id: int) -> T:
        """Delete a record by ID"""
        pass
    
    @abstractmethod
    async def count(self, db: AsyncSession, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count records with optional filters"""
        pass
    
    async def exists(self, db: AsyncSession, id: int) -> bool:
        """Check if a record exists by ID"""
        return await self.get(db, id) is not None


class SQLAlchemyRepository(BaseRepository[T, CreateSchemaType, UpdateSchemaType]):
    """SQLAlchemy implementation of base repository"""
    
    async def create(self, db: AsyncSession, *, obj_in: CreateSchemaType) -> T:
        """Create a new record"""
        obj_in_data = obj_in.dict()
        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj
    
    async def get(self, db: AsyncSession, id: int) -> Optional[T]:
        """Get a record by ID"""
        stmt = select(self.model).where(self.model.id == id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_multi(
        self, 
        db: AsyncSession, 
        *, 
        skip: int = 0, 
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[T]:
        """Get multiple records with optional filters"""
        stmt = select(self.model)
        
        if filters:
            for key, value in filters.items():
                if hasattr(self.model, key):
                    stmt = stmt.where(getattr(self.model, key) == value)
        
        stmt = stmt.offset(skip).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()
    
    async def update(
        self, 
        db: AsyncSession, 
        *, 
        db_obj: T, 
        obj_in: UpdateSchemaType
    ) -> T:
        """Update an existing record"""
        try:
            print(f"🔧 BaseRepository: Starting update for {self.model.__name__} with ID {getattr(db_obj, 'id', 'unknown')}")
            
            obj_data = obj_in.dict(exclude_unset=True)
            print(f"📝 BaseRepository: Update data: {obj_data}")
            
            for field, value in obj_data.items():
                print(f"🔄 BaseRepository: Setting {field} = {value}")
                setattr(db_obj, field, value)
            
            print(f"💾 BaseRepository: Adding object to database")
            db.add(db_obj)
            
            print(f"✅ BaseRepository: Committing changes")
            await db.commit()
            
            print(f"🔄 BaseRepository: Refreshing object")
            await db.refresh(db_obj)
            
            print(f"✅ BaseRepository: Update completed successfully")
            return db_obj
            
        except Exception as e:
            print(f"❌ BaseRepository: Error in update: {type(e).__name__}: {str(e)}")
            import traceback
            print(f"📋 BaseRepository: Full traceback: {traceback.format_exc()}")
            raise e
    
    async def delete(self, db: AsyncSession, *, id: int) -> T:
        """Delete a record by ID"""
        stmt = select(self.model).where(self.model.id == id)
        result = await db.execute(stmt)
        obj = result.scalar_one_or_none()
        if obj:
            await db.delete(obj)
            await db.commit()
        return obj
    
    async def count(self, db: AsyncSession, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count records with optional filters"""
        stmt = select(self.model)
        
        if filters:
            for key, value in filters.items():
                if hasattr(self.model, key):
                    stmt = stmt.where(getattr(self.model, key) == value)
        
        result = await db.execute(stmt)
        return len(result.scalars().all()) 