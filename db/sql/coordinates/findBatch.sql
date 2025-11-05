WITH input_data (id, elr, miles, chains, yards, kilometers, metres) AS (
  $/values:raw/
),
inputs AS (
  SELECT *, ROW_NUMBER() OVER () AS input_order
  FROM input_data
)
SELECT
  i.id,
  i.elr,
  i.miles,
  i.chains,
  i.yards,
  i.kilometers,
  i.metres,
  ST_X(ST_Transform(result.calculated_geom, 4326)) AS longitude,
  ST_Y(ST_Transform(result.calculated_geom, 4326)) AS latitude,
  ST_AsText(result.calculated_geom) AS point_wkt_27700
FROM
  inputs AS i
-- LEFT JOIN ensures we get a row for every input, even if no match is found
LEFT JOIN LATERAL (
  -- This subquery finds the single correct segment and interpolates the point.
  SELECT
    ST_LineInterpolatePoint(
      s.geom,
      CASE
        WHEN target.unit_system = 'imperial'
          THEN (target.target_distance - s.start_mi) / NULLIF(s.end_mi - s.start_mi, 0)
        ELSE (target.target_distance - s.start_km) / NULLIF(s.end_km - s.start_km, 0)
      END
    ) AS calculated_geom
  FROM
    -- This internal subquery calculates the target distance once, correctly handling NULLs
    (SELECT
        CASE
          WHEN (COALESCE(i.miles, 0) + COALESCE(i.chains, 0) + COALESCE(i.yards, 0)) > 0 THEN 'imperial'
          ELSE 'metric'
        END AS unit_system,
        CASE
          WHEN (COALESCE(i.miles, 0) + COALESCE(i.chains, 0) + COALESCE(i.yards, 0)) > 0
          THEN COALESCE(i.miles, 0) + COALESCE(i.chains, 0)/80.0 + COALESCE(i.yards, 0)/1760.0
          ELSE COALESCE(i.kilometers, 0) + COALESCE(i.metres, 0)/1000.0
        END AS target_distance
    ) AS target,
    nwr_elrs_split AS s
  WHERE
    s.elr = i.elr AND
    CASE
      WHEN target.unit_system = 'imperial'
        THEN target.target_distance >= s.start_mi AND target.target_distance <= s.end_mi
      ELSE target.target_distance >= s.start_km AND target.target_distance <= s.end_km
    END
  -- This ORDER BY handles boundary conditions correctly
  ORDER BY
    CASE
      WHEN target.unit_system = 'imperial' THEN s.start_mi
      ELSE s.start_km
    END DESC
  LIMIT 1
  -- The ON TRUE is required for LATERAL joins
) AS result ON TRUE
ORDER BY
  i.input_order