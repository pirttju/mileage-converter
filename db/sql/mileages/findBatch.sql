WITH input_data (id, lon, lat, radius) AS (
  VALUES
  $/values:raw/
),
inputs AS (
  SELECT *, ROW_NUMBER() OVER () AS input_order
  FROM input_data
)
SELECT
  i.id AS input_feature_id,
  nearby_lines.elr,
  -- Imperial Calculations from physical distance
  nearby_lines.miles, -- The integer part of the block
  ROUND(nearby_lines.physical_dist_metres / 20.1168)::integer AS chains, -- 1 chain = 20.1168 metres
  ROUND(nearby_lines.physical_dist_metres / 0.9144)::integer AS yards,   -- 1 yard = 0.9144 metres
  -- Metric Calculations from physical distance
  nearby_lines.kilometres, -- The integer part of the block
  ROUND(nearby_lines.physical_dist_metres)::integer AS metres,
  ROUND(nearby_lines.distance_to_line_in_metres) AS distance
FROM
  inputs AS i
-- Use LEFT JOIN to ensure all input rows are kept, even if they have no matches.
LEFT JOIN LATERAL (
    -- This subquery now calculates PHYSICAL offsets, not nominal ones.
    SELECT DISTINCT ON (s.elr)
      s.elr,
      -- The integer "block" is the integer part of the segment's start value.
      floor(s.start_mi)::integer AS miles,
      floor(s.start_km)::integer AS kilometres,
      -- The offset is the PHYSICAL distance from the start of the segment's geometry.
      ST_LineLocatePoint(s.geom, ST_ClosestPoint(s.geom, input_geom)) * ST_Length(s.geom) AS physical_dist_metres,
      ST_Distance(s.geom, input_geom) as distance_to_line_in_metres
    FROM
      nwr_elrs_split AS s,
      -- Transform the current input point's geometry on the fly.
      (SELECT ST_Transform(ST_SetSRID(ST_MakePoint(i.lon, i.lat), 4326), 27700)) AS pt(input_geom)
    WHERE
      ST_DWithin(s.geom, pt.input_geom, i.radius)
    -- This ORDER BY is essential for the DISTINCT ON to work correctly.
    ORDER BY
      s.elr, s.geom <-> pt.input_geom
  ) AS nearby_lines ON TRUE -- ON TRUE is the required syntax for a LEFT JOIN with a LATERAL subquery

ORDER BY
  i.input_order,
  nearby_lines.distance_to_line_in_metres;