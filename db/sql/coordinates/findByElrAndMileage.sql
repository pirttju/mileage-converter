/*
  Finds a single geospatial point by interpolating along a line segment
  based on an ELR and a target distance in kilometers.
*/
SELECT
  ST_X(ST_Transform(result.geom, 4326)) AS longitude,
  ST_Y(ST_Transform(result.geom, 4326)) AS latitude,
  ST_AsText(result.geom) AS point_wkt_27700
FROM (
  SELECT
    ST_LineInterpolatePoint(
      geom,
      -- Calculate the fraction of the line to travel
      ($/target_km/ - start_km) / NULLIF(end_km - start_km, 0)
    ) AS geom
  FROM
    nwr_elrs_split
  WHERE
    elr = $/elr/
    AND start_km <= $/target_km/
    AND end_km >= $/target_km/
  -- This ORDER BY and LIMIT ensures we get the correct segment
  -- in cases where mileage values might overlap slightly at segment breaks.
  ORDER BY start_km DESC
  LIMIT 1
) AS result