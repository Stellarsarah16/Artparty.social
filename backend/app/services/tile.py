"""
Tile service for tile-related business logic
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from ..repositories.tile import tile_repository
from ..repositories.canvas import canvas_repository
from ..repositories.like import like_repository
from ..repositories.tile_lock import tile_lock_repository
from ..schemas.tile import TileCreate, TileUpdate, TileResponse
from ..models.tile import Tile
from ..models.user import User


class TileService:
    """Service for tile-related business logic"""
    
    def __init__(self):
        self.tile_repository = tile_repository
        self.canvas_repository = canvas_repository
        self.like_repository = like_repository
        self.tile_lock_repository = tile_lock_repository
    
    async def create_tile(self, db: AsyncSession, tile_create: TileCreate, creator: User) -> Tile:
        """Create a new tile with validation"""
        # Validate canvas exists and is active
        canvas = await self.canvas_repository.get(db, tile_create.canvas_id)
        if not canvas or not canvas.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Canvas not found or inactive"
            )
        
        # Check if position is already occupied
        if await self.tile_repository.is_position_occupied(
            db, canvas_id=tile_create.canvas_id, x=tile_create.x, y=tile_create.y
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Position already occupied by another tile"
            )
        
        # Check user tile limit on this canvas
        user_tiles_count = await self.tile_repository.count_user_tiles_on_canvas(
            db, canvas_id=tile_create.canvas_id, creator_id=creator.id
        )
        if user_tiles_count >= canvas.max_tiles_per_user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tile limit reached, unable to create new tile"
            )
        
        # Validate position is within canvas bounds
        # Fixed code - handle non-square canvases properly:
        max_x = (canvas.width + canvas.tile_size - 1) // canvas.tile_size
        max_y = (canvas.height + canvas.tile_size - 1) // canvas.tile_size
        
        if tile_create.x >= max_x or tile_create.y >= max_y:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Position out of bounds. Max position: ({max_x-1}, {max_y-1})"
            )
        
        # Create tile
        tile_data = tile_create.dict()
        tile_data['creator_id'] = creator.id
        tile = Tile(**tile_data)
        
        db.add(tile)
        await db.commit()
        
        # Eagerly load relationships to prevent MissingGreenlet errors
        from sqlalchemy.orm import selectinload
        stmt = select(Tile).options(selectinload(Tile.creator)).where(Tile.id == tile.id)
        result = await db.execute(stmt)
        tile_with_relationships = result.scalar_one_or_none()
        
        return tile_with_relationships
    
    async def get_tile_by_id(self, db: AsyncSession, tile_id: int) -> Optional[Tile]:
        """Get tile by ID with relationships eagerly loaded"""
        from sqlalchemy.orm import selectinload
        stmt = select(Tile).options(selectinload(Tile.creator)).where(Tile.id == tile_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_tile_by_position(self, db: AsyncSession, canvas_id: int, x: int, y: int) -> Optional[Tile]:
        """Get tile by position with relationships eagerly loaded"""
        from sqlalchemy.orm import selectinload
        stmt = select(Tile).options(selectinload(Tile.creator)).where(
            Tile.canvas_id == canvas_id, 
            Tile.x == x, 
            Tile.y == y
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_canvas_tiles(self, db: AsyncSession, canvas_id: int, skip: int = 0, limit: int = 100) -> List[Tile]:
        """Get tiles for a canvas with relationships eagerly loaded"""
        from sqlalchemy.orm import selectinload
        stmt = select(Tile).options(selectinload(Tile.creator)).where(Tile.canvas_id == canvas_id).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()
    
    async def get_user_tiles(self, db: AsyncSession, user_id: int, skip: int = 0, limit: int = 100) -> List[Tile]:
        """Get tiles by user with relationships eagerly loaded"""
        from sqlalchemy.orm import selectinload
        stmt = select(Tile).options(selectinload(Tile.creator)).where(Tile.creator_id == user_id).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()
    
    async def get_tile_neighbors(self, db: AsyncSession, tile_id: int, radius: int = 1) -> List[Tile]:
        """Get neighboring tiles with relationships eagerly loaded"""
        from sqlalchemy.orm import selectinload
        stmt = select(Tile).options(selectinload(Tile.creator)).where(Tile.id == tile_id)
        result = await db.execute(stmt)
        tile = result.scalar_one_or_none()
        
        if not tile:
            return []
        
        # Get neighbors using the repository method but with eager loading
        neighbors = await self.tile_repository.get_tile_neighbors(db, tile_id=tile_id, radius=radius)
        
        # Eagerly load relationships for neighbors
        neighbor_ids = [n.id for n in neighbors]
        if neighbor_ids:
            stmt = select(Tile).options(selectinload(Tile.creator)).where(Tile.id.in_(neighbor_ids))
            result = await db.execute(stmt)
            return result.scalars().all()
        
        return []
    
    async def get_adjacent_neighbors(self, db: AsyncSession, tile_id: int) -> List[Tile]:
        """Get only adjacent neighbors (left, right, top, bottom) of a tile with relationships eagerly loaded"""
        from sqlalchemy.orm import selectinload
        stmt = select(Tile).options(selectinload(Tile.creator)).where(Tile.id == tile_id)
        result = await db.execute(stmt)
        tile = result.scalar_one_or_none()
        
        if not tile:
            return []
        
        # Get adjacent neighbors using the repository method but with eager loading
        neighbors = await self.tile_repository.get_adjacent_neighbors(db, tile_id=tile_id)
        
        # Eagerly load relationships for neighbors
        neighbor_ids = [n.id for n in neighbors]
        if neighbor_ids:
            stmt = select(Tile).options(selectinload(Tile.creator)).where(Tile.id.in_(neighbor_ids))
            result = await db.execute(stmt)
            return result.scalars().all()
        
        return []
    
    async def get_adjacent_neighbors_by_position(self, db: AsyncSession, canvas_id: int, x: int, y: int) -> List[Tile]:
        """Get adjacent neighbors for a position (even if tile doesn't exist)"""
        return await self.tile_repository.get_adjacent_neighbors_by_position(db, canvas_id=canvas_id, x=x, y=y)
    
    async def _check_tile_permissions(self, db: AsyncSession, tile: Tile, current_user: User, action: str = "modify") -> None:
        """Check if user has permission to modify/delete a tile based on canvas collaboration mode"""
        # Get canvas to check collaboration mode
        canvas = await self.canvas_repository.get(db, tile.canvas_id)
        if not canvas:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Canvas not found"
            )
        
        # In free mode, anyone can modify any tile
        if canvas.collaboration_mode == 'free':
            return
        
        # For all other modes, only the creator can modify their tiles
        if tile.creator_id != current_user.id:
            mode_name = canvas.collaboration_mode.replace('-', ' ')
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You can only {action} your own tiles in {mode_name} mode"
            )
    
    async def acquire_tile_lock(self, db: AsyncSession, tile_id: int, current_user: User, minutes: int = 30) -> Dict[str, Any]:
        """Acquire a lock for editing a tile with improved race condition handling"""
        # Check if tile exists with eager loading
        tile = await self.get_tile_by_id(db, tile_id)
        if not tile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tile not found"
            )
        
        # Check permissions based on collaboration mode
        await self._check_tile_permissions(db, tile, current_user, "edit")
        
        # Try to acquire lock with retry logic for race conditions
        max_retries = 3
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                lock = await self.tile_lock_repository.acquire_lock(db, tile_id, current_user.id, minutes)
                if lock:
                    return {
                        "id": lock.id,
                        "tile_id": lock.tile_id,
                        "user_id": lock.user_id,
                        "locked_at": lock.locked_at,
                        "expires_at": lock.expires_at,
                        "is_active": lock.is_active
                    }
                else:
                    # Check if tile is locked by someone else
                    existing_lock = await self.tile_lock_repository.get_by_tile_id(db, tile_id)
                    if existing_lock and existing_lock.user_id != current_user.id:
                        raise HTTPException(
                            status_code=status.HTTP_409_CONFLICT,
                            detail=f"Tile is currently being edited by another user"
                        )
                    else:
                        # This shouldn't happen with the improved repository logic
                        raise HTTPException(
                            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to acquire tile lock - please try again"
                        )
                        
            except HTTPException:
                # Re-raise HTTP exceptions immediately
                raise
            except Exception as e:
                retry_count += 1
                print(f"⚠️ Lock acquisition attempt {retry_count} failed for tile {tile_id}: {str(e)}")
                
                if retry_count >= max_retries:
                    # Final attempt failed
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to acquire tile lock after multiple attempts - please try again"
                    )
                
                # Small delay before retry to reduce contention
                import time
                time.sleep(0.1 * retry_count)  # Exponential backoff
    
    async def release_tile_lock(self, db: AsyncSession, tile_id: int, current_user: User) -> Dict[str, str]:
        """Release a lock for a tile"""
        success = await self.tile_lock_repository.release_lock(db, tile_id, current_user.id)
        if success:
            return {"message": "Tile lock released successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active lock found for this tile"
            )
    
    async def extend_tile_lock(self, db: AsyncSession, tile_id: int, current_user: User, minutes: int = 30) -> Dict[str, str]:
        """Extend a lock for a tile"""
        success = await self.tile_lock_repository.extend_lock(db, tile_id, current_user.id, minutes)
        if success:
            return {"message": "Tile lock extended successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active lock found for this tile"
            )
    
    async def get_tile_lock_status(self, db: AsyncSession, tile_id: int, current_user: User) -> Dict[str, Any]:
        """Get the lock status for a tile"""
        # Check if tile exists with eager loading
        tile = await self.get_tile_by_id(db, tile_id)
        if not tile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tile not found"
            )
        
        lock = await self.tile_lock_repository.get_by_tile_id(db, tile_id)
        
        if not lock:
            return {
                "is_locked": False,
                "can_acquire": True,
                "message": "Tile is available for editing"
            }
        
        # Check if lock is expired
        if lock.is_expired():
            # Clean up expired lock
            await self.tile_lock_repository.cleanup_expired_locks(db)
            return {
                "is_locked": False,
                "can_acquire": True,
                "message": "Tile is available for editing"
            }
        
        # Check if current user owns the lock
        if lock.user_id == current_user.id:
            return {
                "is_locked": True,
                "locked_by_user_id": lock.user_id,
                "expires_at": lock.expires_at.isoformat(),
                "can_acquire": False,
                "message": "You have the lock for this tile"
            }
        else:
            return {
                "is_locked": True,
                "locked_by_user_id": lock.user_id,
                "expires_at": lock.expires_at.isoformat(),
                "can_acquire": False,
                "message": "Tile is being edited by another user"
            }
    
    async def update_tile(self, db: AsyncSession, tile_id: int, tile_update: TileUpdate, current_user: User) -> Optional[Tile]:
        """Update tile with collaboration mode support"""
        try:
            print(f"🔧 TileService: Starting update for tile {tile_id}")
            
            # Eagerly load the tile with relationships to prevent MissingGreenlet errors
            from sqlalchemy.orm import selectinload
            stmt = select(Tile).options(selectinload(Tile.creator)).where(Tile.id == tile_id)
            result = await db.execute(stmt)
            tile = result.scalar_one_or_none()
            
            if not tile:
                print(f"❌ TileService: Tile {tile_id} not found")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Tile not found"
                )
            
            print(f"✅ TileService: Found tile {tile_id}, checking permissions")
            
            # Check permissions based on collaboration mode
            await self._check_tile_permissions(db, tile, current_user, "update")
            
            print(f"✅ TileService: Permissions check passed")
            
            # Check if there's an active lock by another user
            lock = await self.tile_lock_repository.get_by_tile_id(db, tile_id)
            if lock and lock.user_id != current_user.id and not lock.is_expired():
                print(f"❌ TileService: Tile {tile_id} is locked by user {lock.user_id}")
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Tile is currently being edited by another user"
                )
            
            print(f"✅ TileService: Lock check passed")
            
            # If there's an expired lock or no lock, allow the update
            # Clean up any expired lock
            if lock and lock.is_expired():
                print(f"🧹 TileService: Cleaning up expired lock for tile {tile_id}")
                await self.tile_lock_repository.cleanup_expired_locks(db)
            
            print(f"🔄 TileService: Updating tile with data: {tile_update.dict(exclude_unset=True)}")
            
            # Update the tile
            updated_tile = await self.tile_repository.update(db, db_obj=tile, obj_in=tile_update)
            
            print(f"✅ TileService: Tile {tile_id} updated successfully")
            return updated_tile
            
        except HTTPException as e:
            print(f"❌ TileService: HTTP Exception in update_tile: {e.status_code} - {e.detail}")
            raise e
        except Exception as e:
            print(f"❌ TileService: Unexpected error in update_tile: {type(e).__name__}: {str(e)}")
            import traceback
            print(f"📋 TileService: Full traceback: {traceback.format_exc()}")
            raise e
    
    async def delete_tile(self, db: AsyncSession, tile_id: int, current_user: User) -> Optional[Tile]:
        """Delete tile with collaboration mode support"""
        tile = await self.get_tile_by_id(db, tile_id)
        if not tile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tile not found"
            )
        
        # Check permissions based on collaboration mode
        await self._check_tile_permissions(db, tile, current_user, "delete")
        
        # Release any lock on this tile
        await self.tile_lock_repository.release_lock(db, tile_id, current_user.id)
        
        return await self.tile_repository.delete(db, id=tile_id)
    
    async def like_tile(self, db: AsyncSession, tile_id: int, user_id: int) -> bool:
        """Like a tile"""
        # Check if tile exists with eager loading
        tile = await self.get_tile_by_id(db, tile_id)
        if not tile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tile not found"
            )
        
        # Check if user already liked this tile
        if await self.like_repository.user_has_liked_tile(db, user_id=user_id, tile_id=tile_id):
            return False  # Already liked
        
        # Create like
        from ..models.like import Like
        like = Like(user_id=user_id, tile_id=tile_id)
        db.add(like)
        
        # Increment tile like count
        await self.tile_repository.increment_like_count(db, tile_id=tile_id)
        
        await db.commit()
        return True
    
    async def unlike_tile(self, db: AsyncSession, tile_id: int, user_id: int) -> bool:
        """Unlike a tile"""
        # Check if tile exists with eager loading
        tile = await self.get_tile_by_id(db, tile_id)
        if not tile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tile not found"
            )
        
        # Remove like
        like = await self.like_repository.unlike_tile(db, user_id=user_id, tile_id=tile_id)
        if like:
            # Decrement tile like count
            await self.tile_repository.decrement_like_count(db, tile_id=tile_id)
            return True
        
        return False  # Like not found
    
    def create_tile_response(self, tile: Tile) -> TileResponse:
        """Create tile response object"""
        return TileResponse(
            id=tile.id,
            canvas_id=tile.canvas_id,
            creator_id=tile.creator_id,
            x=tile.x,
            y=tile.y,
            pixel_data=tile.pixel_data,
            title=tile.title,
            description=tile.description,
            is_public=tile.is_public,
            like_count=tile.like_count,
            created_at=tile.created_at,
            updated_at=tile.updated_at
        )

    async def get_user_tile_count_on_canvas(self, db: AsyncSession, user_id: int, canvas_id: int) -> int:
        """Get tile count for a user on a specific canvas"""
        return await self.tile_repository.count_user_tiles_on_canvas(db, canvas_id=canvas_id, creator_id=user_id)

    async def get_user_total_tile_count(self, db: AsyncSession, user_id: int) -> int:
        """Get total tile count for a user across all canvases"""
        return await self.tile_repository.count_user_tiles_on_canvas(db, creator_id=user_id)


# Create a singleton instance
tile_service = TileService() 