require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const rateLimit = require("express-rate-limit");

// --- Swagger UI Setup ---
const swaggerUi = require("swagger-ui-express");
const yaml = require("js-yaml");
const fs = require("fs");
const path = require("path");

// Load the database connection and the repositories object
const { db, repos } = require("./db");

// Load OpenAPI Specification once at startup
let openapiSpecification;
try {
  openapiSpecification = yaml.load(
    fs.readFileSync(path.join(__dirname, "openapi.yaml"), "utf8")
  );
} catch (e) {
  console.error("Failed to load or parse openapi.yaml:", e);
  // Exit if the spec can't be loaded, as the API docs will be broken.
  process.exit(1);
}

// Test the database connection
db.connect()
  .then((obj) => {
    console.log("Successfully connected to the database.");
    obj.done(); // success, release the connection;
  })
  .catch((error) => {
    console.error("ERROR connecting to the database:", error.message || error);
  });

// --- Express App Setup ---
const app = express();
const port = process.env.EXPRESS_PORT || 3000;
app.use(bodyParser.json());

// --- Rate Limiting Setup ---
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again after a minute.",
});
app.use(limiter);
app.set("trust proxy", 1);

// --- Swagger & API Documentation Routes ---
const swaggerRouter = express.Router();
swaggerRouter.use("/", swaggerUi.serve);
swaggerRouter.get("/", swaggerUi.setup(openapiSpecification));
app.use("/api-docs", swaggerRouter);

// --- API Routes ---
app.get("/", async (req, res) => {
  return res.status(200).send("Hello!");
});

/**
 * Converts a geospatial location to ELRs and mileages.
 * GET /mileages
 */
app.get("/mileages", async (req, res) => {
  const { id, x, y, distance, srs_name } = req.query;

  if (!x || !y) {
    return res.status(400).json({ error: "Missing required parameters: x, y" });
  }

  const lon = parseFloat(x);
  const lat = parseFloat(y);

  // Use provided radius or default to 100 m, and do range checks
  const searchDistance = parseInt(distance, 10) || 100;

  if (searchDistance > 1000) {
    searchDistance = 1000;
  }

  if (searchDistance < 1) {
    searchDistance = 1;
  }

  if (isNaN(lon) || isNaN(lat)) {
    return res.status(400).json({ error: "Invalid coordinate values." });
  }

  let srid = 4326;

  if (String(srs_name).toLowerCase === "epsg:4326") {
    srid = 4326;
  } else if (String(srs_name).toLowerCase() === "epsg:27700") {
    srid = 27700;
  }

  try {
    const results = await repos.mileages.findByCoordinate({
      id: id,
      x: lon,
      y: lat,
      distance: searchDistance,
      srid: srid,
    });
    res.json(results);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: "An error occurred during the conversion." });
  }
});

/**
 * Batch converts geospatial locations to ELRs and mileages.
 * POST /mileages
 */
app.post("/mileages", async (req, res) => {
  const { srs_name } = req.query;
  const locations = req.body;

  if (!Array.isArray(locations) || locations.length === 0) {
    return res
      .status(400)
      .json({ error: "Request body must be a non-empty array." });
  }
  if (locations.length > 1000) {
    return res
      .status(400)
      .json({ error: "Batch size cannot exceed 1000 features." });
  }

  let srid = 4326;

  if (String(srs_name).toLowerCase === "epsg:4326") {
    srid = 4326;
  } else if (String(srs_name).toLowerCase() === "epsg:27700") {
    srid = 27700;
  }

  try {
    const results = await repos.mileages.findBatch(locations, srid);
    res.json(results);
  } catch (error) {
    console.error("API Error:", error);
    res
      .status(500)
      .json({ error: "An error occurred during the batch conversion." });
  }
});

/**
 * Converts mileage to a geospatial location.
 * GET /coordinates
 */
app.get("/coordinates", async (req, res) => {
  // Directly use the query parameters without modification
  const { elr, miles, chains, yards, kilometres, metres, srs_name } = req.query;

  // --- VALIDATION ---
  if (!elr) {
    return res.status(400).json({ error: "Missing required parameter: elr" });
  }

  // Check that at least one mileage part is provided
  if (!miles && !chains && !yards && !kilometres && !metres) {
    return res.status(400).json({
      error:
        "Must provide at least one mileage parameter: miles, chains, yards, kilometres or metres.",
    });
  }

  let srid = 4326;

  if (String(srs_name).toLowerCase === "epsg:4326") {
    srid = 4326;
  } else if (String(srs_name).toLowerCase() === "epsg:27700") {
    srid = 27700;
  }

  try {
    // Pass the raw query parameters directly to the repository method
    const result = await repos.coordinates.findByElrAndMileage(req.query, srid);

    if (result) {
      res.json(result);
    } else {
      res
        .status(404)
        .json({ error: "Location not found for the given ELR and mileage." });
    }
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: "An error occurred during the conversion." });
  }
});

/**
 * Batch converts mileages to geospatial locations.
 * POST /coordinates
 */
app.post("/coordinates", async (req, res) => {
  const { srs_name } = req.query;
  const locations = req.body;

  if (!Array.isArray(locations) || locations.length === 0) {
    return res
      .status(400)
      .json({ error: "Request body must be a non-empty array." });
  }
  if (locations.length > 1000) {
    return res
      .status(400)
      .json({ error: "Batch size cannot exceed 1000 features." });
  }

  let srid = 4326;

  if (String(srs_name).toLowerCase === "epsg:4326") {
    srid = 4326;
  } else if (String(srs_name).toLowerCase() === "epsg:27700") {
    srid = 27700;
  }

  try {
    const results = await repos.coordinates.findBatch(locations, srid);
    res.json(results);
  } catch (error) {
    console.error("API Error:", error);
    res
      .status(500)
      .json({ error: "An error occurred during the batch conversion." });
  }
});

/**
 * Requests metadata containing a list of ELRs and their starting and ending points.
 * GET /metadata
 */
app.get("/metadata", async (req, res) => {
  const { elr } = req.query;

  // --- VALIDATION ---
  /*
  if (!elr) {
    return res.status(400).json({ error: "Missing required parameter: elr" });
  }
  */

  try {
    const result = await repos.metadata.findElrs();

    if (result) {
      res.json(result);
    } else {
      if (!elr) {
        res.status(404).json({ error: "Metadata not found." });
      } else {
        res
          .status(404)
          .json({ error: "Metadata not found for the given ELR." });
      }
    }
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: "An error occurred." });
  }
});

module.exports = app;
