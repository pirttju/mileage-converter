WITH input_data (id, lon, lat, distance) AS (
  VALUES
  $/values:raw/
),
inputs AS (
  SELECT *, ROW_NUMBER() OVER () AS input_order
  FROM input_data
)
SELECT
  i.id,
  nearby_lines.elr,
  
  -- IMPERIAL CALCULATIONS (Anchored to Start Mile)
  -- Use the segment's start mile as the integer base
  floor(nearby_lines.start_mi)::integer AS miles, 
  -- Calculate the full difference from that start mile (allows values > 80)
  ROUND((nearby_lines.calc_mi - floor(nearby_lines.start_mi)) * 80)::integer AS chains,
  -- Calculate the full difference from that start mile (allows values > 1760)
  ROUND((nearby_lines.calc_mi - floor(nearby_lines.start_mi)) * 1760)::integer AS yards,

  -- METRIC CALCULATIONS
  -- Logic: 
  -- If 'M', we normalise (e.g., 2.2km becomes 2km, 200m).
  -- If 'K' (or other), we anchor to the start marker (e.g., Start 1.0 + 1.2km dist becomes 1km, 1200m).
  CASE 
    WHEN nearby_lines.waymark_unit = 'M' THEN floor(nearby_lines.calc_km)::integer
    ELSE floor(nearby_lines.start_km)::integer 
  END AS kilometres,

  CASE 
    WHEN nearby_lines.waymark_unit = 'M' THEN ROUND((nearby_lines.calc_km - floor(nearby_lines.calc_km)) * 1000)::integer
    ELSE ROUND((nearby_lines.calc_km - floor(nearby_lines.start_km)) * 1000)::integer 
  END AS metres,

  -- Physical distance from the input point to the rail line (perpendicular distance)
  ROUND(nearby_lines.distance_to_line_in_metres) AS distance,
  -- Point on the rail line
  ST_X(ST_Transform(nearby_lines.closest_geom, ${srid})) AS x,
  ST_Y(ST_Transform(nearby_lines.closest_geom, ${srid})) AS y
FROM
  inputs AS i
LEFT JOIN LATERAL (
    SELECT DISTINCT ON (s.elr)
      s.elr,
      s.waymark_unit,
      -- WE MUST SELECT THE START VALUES TO USE AS ANCHORS
      s.start_mi,
      s.start_km,

      -- 1. Calculate the position fraction (0.0 start, 1.0 end) along the segment
      ST_LineLocatePoint(s.geom, ST_ClosestPoint(s.geom, pt.input_geom)) AS frac,
      
      -- 2. Interpolate Mile: Start + (Fraction * (End - Start))
      s.start_mi + (ST_LineLocatePoint(s.geom, ST_ClosestPoint(s.geom, pt.input_geom)) * (s.end_mi - s.start_mi)) AS calc_mi,
      
      -- 3. Interpolate KM: Start + (Fraction * (End - Start))
      s.start_km + (ST_LineLocatePoint(s.geom, ST_ClosestPoint(s.geom, pt.input_geom)) * (s.end_km - s.start_km)) AS calc_km,
      
      ST_ClosestPoint(s.geom, pt.input_geom) AS closest_geom,
      ST_Distance(s.geom, pt.input_geom) AS distance_to_line_in_metres
    FROM
      nwr_elrs_split AS s,
      (SELECT ST_Transform(ST_SetSRID(ST_MakePoint(i.lon, i.lat), ${srid}), 27700)) AS pt(input_geom)
    WHERE
      ST_DWithin(s.geom, pt.input_geom, i.distance)
    ORDER BY
      s.elr, s.geom <-> pt.input_geom
  ) AS nearby_lines ON TRUE 
ORDER BY
  i.input_order,
  nearby_lines.distance_to_line_in_metres;