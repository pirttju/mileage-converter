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
  
  -- IMPERIAL CALCULATIONS (Based on interpolated Mileage)
  -- The integer mile post
  floor(nearby_lines.calc_mi)::integer AS miles, 
  -- Extract the decimal part of the mile, multiply by 80 for chains
  ROUND((nearby_lines.calc_mi - floor(nearby_lines.calc_mi)) * 80)::integer AS chains,
  -- Extract the decimal part of the mile, multiply by 1760 for yards
  ROUND((nearby_lines.calc_mi - floor(nearby_lines.calc_mi)) * 1760)::integer AS yards,

  -- METRIC CALCULATIONS (Based on interpolated Kilometerage)
  -- The integer kilometer post
  floor(nearby_lines.calc_km)::integer AS kilometres,
  -- Extract the decimal part of the km, multiply by 1000 for metres
  ROUND((nearby_lines.calc_km - floor(nearby_lines.calc_km)) * 1000)::integer AS metres,
  -- Physical distance from the input point to the rail line (perpendicular distance)
  ROUND(nearby_lines.distance_to_line_in_metres) AS distance_off_line,
  -- Point on the rail line
  ST_X(ST_Transform(nearby_lines.closest_geom, ${srid})) AS x,
  ST_Y(ST_Transform(nearby_lines.closest_geom, ${srid})) AS y
FROM
  inputs AS i
LEFT JOIN LATERAL (
    SELECT DISTINCT ON (s.elr)
      s.elr,
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