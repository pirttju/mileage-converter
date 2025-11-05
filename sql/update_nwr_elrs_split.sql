ALTER TABLE nwr_elrs_split ADD COLUMN start_km numeric;
ALTER TABLE nwr_elrs_split ADD COLUMN end_km numeric;
ALTER TABLE nwr_elrs_split ADD COLUMN start_mi numeric;
ALTER TABLE nwr_elrs_split ADD COLUMN end_mi numeric;

-- Update kilometer range
-- The format of waymark_value is miles and yards separated by a dot (mm.yyyy) when waymark_unit is M
WITH km AS (
  SELECT
    gid,
    sign(waymark_value) * (split_part(waymark_value::text, '.', 1)::numeric * 1609.344
      + substring(split_part(waymark_value::text, '.', 2),1,4)::numeric * 0.9144) / 1000 AS start_km
  FROM nwr_elrs_split
  WHERE waymark_unit = 'M'
)
UPDATE nwr_elrs_split SET start_km = km.start_km FROM km WHERE km.gid = nwr_elrs_split.gid;

UPDATE nwr_elrs_split SET start_km = waymark_value WHERE waymark_unit = 'K';

UPDATE nwr_elrs_split SET end_km = start_km + ST_Length(geom) / 1000;

-- Update mile range
-- The format of waymark_value is miles and yards separated by a dot (mm.yyyy) when waymark_unit is M
WITH mi AS (
  SELECT
    gid,
    sign(waymark_value) * (split_part(waymark_value::text, '.', 1)::numeric
      + substring(split_part(waymark_value::text, '.', 2),1,4)::numeric / 1760) AS start_mi
  FROM nwr_elrs_split
  WHERE waymark_unit = 'M'
)
UPDATE nwr_elrs_split SET start_mi = mi.start_mi FROM mi WHERE mi.gid = nwr_elrs_split.gid;

UPDATE nwr_elrs_split SET start_mi = waymark_value * 0.621371192 WHERE waymark_unit = 'K';

UPDATE nwr_elrs_split SET end_mi = start_mi + ST_Length(geom) / 1000 * 0.621371192;
