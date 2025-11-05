CREATE TABLE nwr_elrs_split AS
WITH
-- Step 1: Ensure each ELR's multilinestring is a single, merged linestring for consistent measurement.
merged_elrs AS (
  SELECT
    gid,
    asset_id,
    start,
    elr,
    ST_LineMerge(geom) AS geom
  FROM
    nwr_elrs
),

-- Step 2: For each waymark, find its fractional distance along the corresponding merged linestring.
-- This gives us the precise locations for our splits.
split_locations AS (
  SELECT
    w.elr,
    w.unit,
    w.value,
    ST_LineLocatePoint(
      e.geom,
      ST_ClosestPoint(e.geom, w.geom)
    ) AS start_fraction
  FROM
    nwr_waymarks AS w
  JOIN
    merged_elrs AS e
    ON w.elr = e.elr
),

-- Step 3: Combine the waymark split points with the start (0.0) and end (1.0) of the entire line.
-- This ensures the entire original line is covered by the new segments.
all_points AS (
  -- Add the waymark locations
  SELECT
    elr,
    unit,
    value,
    start_fraction
  FROM
    split_locations
  UNION ALL
  -- Add the very start of the line
  SELECT
    elr,
    'M' AS unit, -- Always miles
    start AS value, 
    0.0 AS start_fraction
  FROM
    merged_elrs
  UNION ALL
  -- Add the very end of the line
  SELECT
    elr,
    NULL AS unit,
    NULL AS value,
    1.0 AS start_fraction
  FROM
    merged_elrs
),

-- Step 4: Using a window function, pair up consecutive points to form the segments.
-- The LEAD function gets the start_fraction of the *next* point, which becomes the end_fraction for the current segment.
segments AS (
  SELECT
    elr,
    unit,
    value,
    start_fraction,
    LEAD(start_fraction, 1) OVER (PARTITION BY elr ORDER BY start_fraction) AS end_fraction
  FROM
    all_points
)

-- Step 5: Generate the new linestring geometries using the start and end fractions
-- and join back to get original asset details. Create the final table.
SELECT
  ROW_NUMBER() OVER () AS gid,
  e.asset_id,
  s.elr,
  s.unit AS waymark_unit,
  s.value AS waymark_value,
  ST_LineSubstring(e.geom, s.start_fraction, s.end_fraction) AS geom
FROM
  segments AS s
JOIN
  merged_elrs AS e
  ON s.elr = e.elr
WHERE
  s.end_fraction IS NOT NULL
  AND s.start_fraction < s.end_fraction;

CREATE INDEX nwr_elrs_split_elr_idx ON nwr_elrs_split (elr);
CREATE INDEX nwr_elrs_split_geom_idx ON nwr_elrs_split USING GIST (geom);
