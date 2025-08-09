BEGIN;

-- Backfill NULLs to sane defaults
UPDATE canvases
SET 
  palette_type = COALESCE(palette_type, 'classic'),
  collaboration_mode = COALESCE(collaboration_mode, 'free'),
  auto_save_interval = COALESCE(auto_save_interval, 60),
  is_public = COALESCE(is_public, TRUE),
  is_moderated = COALESCE(is_moderated, FALSE);

-- Set DEFAULTs for new rows
ALTER TABLE canvases ALTER COLUMN palette_type SET DEFAULT 'classic';
ALTER TABLE canvases ALTER COLUMN collaboration_mode SET DEFAULT 'free';
ALTER TABLE canvases ALTER COLUMN auto_save_interval SET DEFAULT 60;
ALTER TABLE canvases ALTER COLUMN is_public SET DEFAULT TRUE;
ALTER TABLE canvases ALTER COLUMN is_moderated SET DEFAULT FALSE;

-- Optional: enforce NOT NULL to match application expectations
-- (safe after backfilling above)
ALTER TABLE canvases ALTER COLUMN palette_type SET NOT NULL;
ALTER TABLE canvases ALTER COLUMN collaboration_mode SET NOT NULL;
ALTER TABLE canvases ALTER COLUMN auto_save_interval SET NOT NULL;
ALTER TABLE canvases ALTER COLUMN is_public SET NOT NULL;
ALTER TABLE canvases ALTER COLUMN is_moderated SET NOT NULL;

COMMIT;
