"""
Backfill canvas defaults and set non-nullable defaults

Revision ID: 20250809_backfill_canvas_defaults
Revises: 99130406ee22
Create Date: 2025-08-09
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250809_backfill_canvas_defaults'
down_revision = '99130406ee22'
branch_labels = None
depends_on = None

def upgrade():
    conn = op.get_bind()
    conn.execute(sa.text("""
        UPDATE canvases
        SET 
          palette_type = COALESCE(palette_type, 'classic'),
          collaboration_mode = COALESCE(collaboration_mode, 'free'),
          auto_save_interval = COALESCE(auto_save_interval, 60),
          is_public = COALESCE(is_public, TRUE),
          is_moderated = COALESCE(is_moderated, FALSE);

        ALTER TABLE canvases ALTER COLUMN palette_type SET DEFAULT 'classic';
        ALTER TABLE canvases ALTER COLUMN collaboration_mode SET DEFAULT 'free';
        ALTER TABLE canvases ALTER COLUMN auto_save_interval SET DEFAULT 60;
        ALTER TABLE canvases ALTER COLUMN is_public SET DEFAULT TRUE;
        ALTER TABLE canvases ALTER COLUMN is_moderated SET DEFAULT FALSE;

        ALTER TABLE canvases ALTER COLUMN palette_type SET NOT NULL;
        ALTER TABLE canvases ALTER COLUMN collaboration_mode SET NOT NULL;
        ALTER TABLE canvases ALTER COLUMN auto_save_interval SET NOT NULL;
        ALTER TABLE canvases ALTER COLUMN is_public SET NOT NULL;
        ALTER TABLE canvases ALTER COLUMN is_moderated SET NOT NULL;
    """))


def downgrade():
    conn = op.get_bind()
    conn.execute(sa.text("""
        ALTER TABLE canvases ALTER COLUMN is_moderated DROP NOT NULL;
        ALTER TABLE canvases ALTER COLUMN is_public DROP NOT NULL;
        ALTER TABLE canvases ALTER COLUMN auto_save_interval DROP NOT NULL;
        ALTER TABLE canvases ALTER COLUMN collaboration_mode DROP NOT NULL;
        ALTER TABLE canvases ALTER COLUMN palette_type DROP NOT NULL;

        ALTER TABLE canvases ALTER COLUMN is_moderated DROP DEFAULT;
        ALTER TABLE canvases ALTER COLUMN is_public DROP DEFAULT;
        ALTER TABLE canvases ALTER COLUMN auto_save_interval DROP DEFAULT;
        ALTER TABLE canvases ALTER COLUMN collaboration_mode DROP DEFAULT;
        ALTER TABLE canvases ALTER COLUMN palette_type DROP DEFAULT;
    """))
