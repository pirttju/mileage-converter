const pgp = require("pg-promise")({
  // Initialization Options
});

const CoordinatesRepository = require("./repos/coordinates");
const MileagesRepository = require("./repos/mileages");
const MetadataRepository = require("./repos/metadata");

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
  metadata: new MetadataRepository(
    db,
    {
      findElrs: sql("sql/metadata/findElrs.sql"),
    },
    pgp
  ),
};

module.exports = { db, repos, pgp };
