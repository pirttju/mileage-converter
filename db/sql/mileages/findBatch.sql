WITH input_data (id, lon, lat) AS (
  $/values:raw/
),
inputs AS (
  SELECT *, ROW_NUMBER() OVER () AS input_order
  FROM input_data
)
SELECT
  i.id AS input_feature_id,
  nearby_lines.elr,
  -- Imperial Calculations (Miles, Chains, Yards)
  FLOOR(nearby_lines.calc_mi)::integer AS miles,
  ROUND((nearby_lines.calc_mi - FLOOR(nearby_lines.calc_mi)) * 80)::integer AS chains,
  ROUND((nearby_lines.calc_mi - FLOOR(nearby_lines.calc_mi)) * 1760)::integer AS yards,
  -- Metric Calculations (Kilometers, Metres)
  FLOOR(nearby_lines.calc_km)::integer AS kilometers,
  ROUND((nearby_lines.calc_km - FLOOR(nearby_lines.calc_km)) * 1000)::integer AS metres,
  ROUND(nearby_lines.distance_to_line_in_metres) AS distance
FROM
  inputs AS i
-- Use LEFT JOIN to ensure all input rows are kept, even if they have no matches.
LEFT JOIN LATERAL (
    -- This subquery guarantees only the single closest segment per ELR is returned.
    SELECT DISTINCT ON (s.elr)
      s.elr,
      (s.start_mi + ((s.end_mi - s.start_mi) * ST_LineLocatePoint(s.geom, ST_ClosestPoint(s.geom, input_geom)))) AS calc_mi,
      (s.start_km + ((s.end_km - s.start_km) * ST_LineLocatePoint(s.geom, ST_ClosestPoint(s.geom, input_geom)))) AS calc_km,
      ST_Distance(s.geom, input_geom) as distance_to_line_in_metres
    FROM
      nwr_elrs_split AS s,
      -- Transform the current input point's geometry on the fly.
      (SELECT ST_Transform(ST_SetSRID(ST_MakePoint(i.lon, i.lat), 4326), 27700)) AS pt(input_geom)
    WHERE
      ST_DWithin(s.geom, pt.input_geom, 100.0)
    -- This ORDER BY is essential for the DISTINCT ON to work correctly.
    ORDER BY
      s.elr, s.geom <-> pt.input_geom
  ) AS nearby_lines ON TRUE -- ON TRUE is the required syntax for a LEFT JOIN with a LATERAL subquery

ORDER BY
  i.input_order,
  nearby_lines.distance_to_line_in_metres