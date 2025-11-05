const { ColumnSet } = require("pg-promise").helpers;

class CoordinatesRepository {
  /**
   * @param {Object} db - The database connection object.
   * @param {Object} sql - The pre-loaded SQL queries.
   * @param {Object} pgp - The pg-promise instance.
   */
  constructor(db, sql, pgp) {
    this.db = db;
    this.sql = sql;
    this.pgp = pgp;

    // A ColumnSet defines the columns that can be passed to the database.
    // This is crucial for security and formatting the multi-row insert.
    this.cs = new ColumnSet(
      ["id", "elr", "miles", "chains", "yards", "kilometers", "metres"],
      {
        table: { table: "input_data", schema: "public" }, // dummy table details
      }
    );
  }

  /**
   * Batch converts an array of ELR/mileage objects to coordinates.
   * @param {Array<Object>} data - Array of location objects.
   * @returns {Promise<Array<Object>>} A promise that resolves to an array of converted coordinates.
   */
  async findBatch(data) {
    // Generate the multi-row VALUES string for the query
    const values = this.pgp.helpers.values(data, this.cs);

    // Execute the query with the formatted values
    return this.db.any(this.sql.findBatch, { values });
  }

  /**
   * Finds a single coordinate by its ELR and mileage.
   * The mileage MUST be pre-calculated into a single unit (km).
   * @param {Object} params - The parameters for the query.
   * @param {string} params.elr - The Engineer's Line Reference.
   * @param {number} params.target_km - The target distance along the ELR in kilometers.
   * @returns {Promise<Object|null>} A promise that resolves to the coordinate object or null if not found.
   */
  async findByElrAndMileage({ elr, target_km }) {
    // Use oneOrNone as we expect exactly zero or one result.
    return this.db.oneOrNone(this.sql.findByElrAndMileage, { elr, target_km });
  }
}

module.exports = CoordinatesRepository;
