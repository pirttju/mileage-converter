// Set the environment to 'test'
process.env.NODE_ENV = "test";

const request = require("supertest");
const { expect } = require("chai");
const app = require("../app");

const TEST_LON = 1.14128;
const TEST_LAT = 51.09552;

// The expected results for the coordinate above.
const EXPECTED_ELR = "FTC";
const EXPECTED_MILES = 4;
const EXPECTED_CHAINS = 50;
const EXPECTED_KILOMETRES = 8;
const EXPECTED_METRES = 1003;

// A coordinate far from any railway line.
const FAR_AWAY_ID = "far-away";
const FAR_AWAY_LON = -12.0;
const FAR_AWAY_LAT = 50.0;

describe("Mileages API", () => {
  // === Test for GET /mileages (Single Feature) ===
  describe("GET /mileages", () => {
    it("should return a 200 OK and an array of nearby mileages for a valid coordinate", async () => {
      const response = await request(app)
        .get(`/mileages?x=${TEST_LON}&y=${TEST_LAT}`)
        .expect("Content-Type", /json/)
        .expect(200);

      expect(response.body).to.be.an("array").and.not.be.empty;

      // Find the expected ELR in the list of results (it should be the closest).
      const result = response.body.find((r) => r.elr === EXPECTED_ELR);
      expect(result).to.not.be.undefined;

      // Assert that the mileage is calculated correctly
      expect(result.miles).to.equal(EXPECTED_MILES);
      expect(result.chains).to.be.closeTo(EXPECTED_CHAINS, 1); // Allow for rounding
      expect(result.kilometres).to.equal(EXPECTED_KILOMETRES);
      expect(result.metres).to.be.closeTo(EXPECTED_METRES, 20); // Allow for rounding
    });

    it("should return a 200 OK and an array without a coordinate far from any line", async () => {
      const response = await request(app)
        .get(`/mileages?id=${FAR_AWAY_ID}&x=${FAR_AWAY_LON}&y=${FAR_AWAY_LAT}`)
        .expect(200);

      expect(response.body).to.be.an("array").and.not.be.empty;

      // Filter results for the unsuccessful input ID
      const notFoundResults = response.body.filter(
        (r) => r.input_feature_id === "far-away"
      );
      // The query returns results with null ELRs for non-matches, so we check that
      // our specific 'not_found' ID did not successfully match to any line.
      const notFoundMatch = notFoundResults.find((r) => r.elr !== null);
      expect(notFoundMatch).to.be.undefined;
    });

    it("should return a 400 Bad Request if the x or y parameter is missing", async () => {
      // Test missing 'y'
      await request(app).get(`/mileages?x=${TEST_LON}`).expect(400);

      // Test missing 'x'
      await request(app).get(`/mileages?y=${TEST_LAT}`).expect(400);
    });
  });

  // === Test for POST /mileages (Batch) ===
  describe("POST /mileages", () => {
    it("should return a 200 OK and correctly process a batch of mixed-validity coordinates", async () => {
      const batchPayload = [
        { id: "found", x: TEST_LON, y: TEST_LAT },
        { id: "not_found", x: FAR_AWAY_LON, y: FAR_AWAY_LAT },
      ];

      const response = await request(app)
        .post("/mileages")
        .send(batchPayload)
        .expect("Content-Type", /json/)
        .expect(200);
      expect(response.body).to.be.an("array").and.not.be.empty;

      // Filter results for the successful input ID
      const foundResults = response.body.filter((r) => r.id === "found");
      expect(foundResults).to.not.be.empty;

      // Check the successful conversion within the results
      const result = foundResults.find((r) => r.elr === EXPECTED_ELR);
      expect(result).to.not.be.undefined;
      expect(result.miles).to.equal(EXPECTED_MILES);
      expect(result.kilometres).to.equal(EXPECTED_KILOMETRES);

      // Filter results for the unsuccessful input ID
      const notFoundResults = response.body.filter((r) => r.id === "not_found");
      expect(notFoundResults).to.not.be.empty;

      // The query returns results with null ELRs for non-matches, so we check that
      // our specific 'not_found' ID did not successfully match to any line.
      const notFoundMatch = notFoundResults.find((r) => r.elr !== null);
      expect(notFoundMatch).to.be.undefined;
    });

    it("should return a 400 Bad Request if the payload is not an array", async () => {
      const badPayload = { x: TEST_LON, y: TEST_LAT };
      await request(app).post("/mileages").send(badPayload).expect(400);
    });
  });
});
