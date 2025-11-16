# elr-converter

Translates geospatial locations to Engineer's Line References (ELRs) and mileages (and vice versa).

# Requirements

Recent versions of:

- Node.js
- PostgreSQL
- PostGIS
- GDAL

Geospatial data (https://raildata.org.uk/):

- NWR Track Model

# Data Preparation

## Importing Shapefiles

Use GDAL's ogr2ogr utility to import Shapefiles to PostGIS:

```bash
ogr2ogr -f PostgreSQL PG:"dbname=gis host=localhost port=5432 user=gis" NWR_Waymarks.shp -lco GEOMETRY_NAME=geom -lco FID=gid -lco SPATIAL_INDEX=GIST -nln nwr_waymarks -overwrite
ogr2ogr -f PostgreSQL PG:"dbname=gis host=localhost port=5432 user=gis" NWR_ELRs.shp -lco GEOMETRY_NAME=geom -lco FID=gid -lco SPATIAL_INDEX=GIST -nln nwr_elrs -overwrite
ogr2ogr -f PostgreSQL PG:"dbname=gis host=localhost port=5432 user=gis" NWR_TrackCentreLines.shp -lco GEOMETRY_NAME=geom -lco FID=gid -lco SPATIAL_INDEX=GIST -nln nwr_trackcentrelines -overwrite
```

## Converting Data

Run sql files that initialise the database and convert the data:

```bash
psql -d gis -U gis -f init.sql
psql -d gis -U gis -f split_nwr_elrs.sql
psql -d gis -U gis -f update_nwr_elrs_split.sql
```

## Copy Metadata

Columns elr, line_name of the elr_meta table shall contain the unique ELRs and their line names. This data has been derived from the Railway Codes website (http://www.railwaycodes.org.uk/elrs/elr0.shtm) and therefore not included in this repository.

# Installation

Run npm install on project directory to install packages:

```bash
npm install
```

# ENV File

Create .env file for database user and password information:

```ini
# .env file
EXPRESS_PORT=3001
# PostgreSQL Configuration
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=gis
DB_USER=gis
DB_PASSWORD=pass
```
