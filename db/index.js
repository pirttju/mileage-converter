const pgp = require("pg-promise")({
  // Initialization Options
});

const CoordinatesRepository = require("./repos/coordinates");
const MileagesRepository = require("./repos/mileages");

const { QueryFile } = pgp;
const path = require("path");

// Helper function to create a QueryFile object
function sql(file) {
  const fullPath = path.join(__dirname, file);
  return new QueryFile(fullPath, { minify: true });
}

// --- Database Connection ---
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
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
      findByCoordinate: sql("sql/mileages/findByCoordinate.sql"),
      findBatch: sql("sql/mileages/findBatch.sql"),
    },
    pgp
  ),
};

module.exports = { db, repos, pgp };
