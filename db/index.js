const pgp = require("pg-promise")({
  // Initialization Options
});

const CoordinatesRepository = require("./repos/coordinates");
const MileagesRepository = require("./repos/mileages");

const { QueryFile } = pgp;
const path = require("path");

function sql(file) {
  const fullPath = path.join(__dirname, file);
  return new QueryFile(fullPath, { minify: true });
}

// --- Database Connection ---
const dbConfig = {
  /* ... config ... */
};
const db = pgp(dbConfig);

// --- Create and Attach Repositories ---
const repos = {
  coordinates: new CoordinatesRepository(
    db,
    {
      findByElrAndMileage: sql("sql/coordinates/findByElrAndMileage.sql"),
      findBatch: sql("sql/coordinates/findBatch.sql"),
    },
    pgp
  ),
  mileages: new MileagesRepository(
    db,
    {
      findBatch: sql("sql/mileages/findBatch.sql"),
    },
    pgp
  ),
};

module.exports = { db, repos, pgp };
