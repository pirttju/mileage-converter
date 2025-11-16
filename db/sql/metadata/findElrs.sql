SELECT
  a.elr,
  b.line_name,
  ROUND(MIN(a.start_mi),3) AS start_mi,
  ROUND(MAX(a.end_mi),3) AS end_mi,
  ROUND(MIN(a.start_km),3) AS start_km,
  ROUND(MAX(a.end_km),3) AS end_km
FROM nwr_elrs_split a
LEFT JOIN elr_meta b ON a.elr = b.elr
  GROUP BY a.elr, b.line_name
  ORDER BY a.elr;