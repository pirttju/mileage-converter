/*
  Finds all ELRs and their interpolated mileages within a given radius
  of a single input coordinate (lon/lat).
*/
SELECT
  s.elr,
  -- Imperial Calculations
  FLOOR(mileage.calc_mi)::integer AS miles,
  ROUND((mileage.calc_mi - FLOOR(mileage.calc_mi)) * 80)::integer AS chains,
  ROUND((mileage.calc_mi - FLOOR(mileage.calc_mi)) * 1760)::integer AS yards,
  -- Metric Calculations
  FLOOR(mileage.calc_km)::integer AS kilometers,
  ROUND((mileage.calc_km - FLOOR(mileage.calc_km)) * 1000)::integer AS metres,
  -- Distance from the original point to the line
  ROUND(ST_Distance(s.geom, pt.input_geom)) AS distance
FROM
  nwr_elrs_split AS s,
  -- Create and transform the input point on the fly
  (SELECT ST_Transform(ST_SetSRID(ST_MakePoint($/lon/, $/lat/), 4326), 27700)) AS pt(input_geom),
  -- Calculate the interpolated mileages
  (SELECT
    (s.start_mi + ((s.end_mi - s.start_mi) * ST_LineLocatePoint(s.geom, ST_ClosestPoint(s.geom, pt.input_geom)))) AS calc_mi,
    (s.start_km + ((s.end_km - s.start_km) * ST_LineLocatePoint(s.geom, ST_ClosestPoint(s.geom, pt.input_geom)))) AS calc_km
  ) AS mileage
WHERE
  -- Use ST_DWithin for a performant, index-based radius search
  ST_DWithin(s.geom, pt.input_geom, $/radius/)
ORDER BY
  distance