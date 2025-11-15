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
  const { x, y, radius } = req.query;

  if (!x || !y) {
    return res.status(400).json({ error: "Missing required parameters: x, y" });
  }

  const lon = parseFloat(x);
  const lat = parseFloat(y);
  // Use provided radius or default to 100 m
  const searchRadius = parseInt(radius, 10) || 100;

  if (isNaN(lon) || isNaN(lat)) {
    return res.status(400).json({ error: "Invalid coordinate values." });
  }

  try {
    const results = await repos.mileages.findByCoordinate({
      x: lon,
      y: lat,
      radius: searchRadius,
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

  try {
    const results = await repos.mileages.findBatch(locations);
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
  const { elr, miles, chains, yards, kilometres, metres } = req.query;

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

  try {
    // Pass the raw query parameters directly to the repository method
    const result = await repos.coordinates.findByElrAndMileage(req.query);

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

  try {
    const results = await repos.coordinates.findBatch(locations);
    res.json(results);
  } catch (error) {
    console.error("API Error:", error);
    res
      .status(500)
      .json({ error: "An error occurred during the batch conversion." });
  }
});

module.exports = app;
