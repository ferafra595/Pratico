-- Prevent duplicate imports when city is NULL in older databases.
UPDATE price_items SET city='' WHERE city IS NULL;
DELETE FROM price_items WHERE rowid NOT IN (SELECT MAX(rowid) FROM price_items GROUP BY source_id,region,code,city);
CREATE UNIQUE INDEX IF NOT EXISTS price_item_identity ON price_items(source_id,region,code,city);
