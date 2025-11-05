require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const rateLimit = require("express-rate-limit");

// Load the database connection and the repositories object
const { db, repos } = require("./db");

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
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again after a minute.",
});
app.use(limiter);

// --- API Routes ---

/**
 * Converts a geospatial location to mileage.
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
  const { elr, miles, chains, yards, kilometres, metres } = req.query;

  if (!elr) {
    return res.status(400).json({ error: "Missing required parameter: elr" });
  }

  let target_km = -1;
  const MILE_TO_KM = 1.609344;

  // Prioritize imperial units if present
  if (miles || chains || yards) {
    const totalMiles =
      (parseFloat(miles) || 0) +
      (parseFloat(chains) || 0) / 80.0 +
      (parseFloat(yards) || 0) / 1760.0;
    target_km = totalMiles * MILE_TO_KM;
  }
  // Otherwise, use metric units
  else if (kilometres || metres) {
    target_km =
      (parseFloat(kilometres) || 0) + (parseFloat(metres) || 0) / 1000.0;
  } else {
    return res.status(400).json({
      error:
        "Must provide mileage parameters (miles/chains/yards or kilometres/metres).",
    });
  }

  if (target_km < 0) {
    return res
      .status(400)
      .json({ error: "Invalid or missing mileage values." });
  }

  try {
    const result = await repos.coordinates.findByElrAndMileage({
      elr,
      target_km,
    });

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
 * Batch converts geospatial locations to mileages.
 * POST /mileages
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

// --- Server ---
app.listen(port, () => {
  console.log(`ELR-Converter API listening at port ${port}`);
});
