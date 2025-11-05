const { ColumnSet } = require("pg-promise").helpers;

class MileagesRepository {
  /**
   * @param {Object} db - The database connection object.
   * @param {Object} sql - The pre-loaded SQL queries.
   * @param {Object} pgp - The pg-promise instance.
   */
  constructor(db, sql, pgp) {
    this.db = db;
    this.sql = sql;
    this.pgp = pgp;

    // Define the columns for the data expected by the SQL query.
    // We map the API's 'x' and 'y' to 'lon' and 'lat'.
    this.cs = new ColumnSet(
      [
        "id",
        { name: "lon", prop: "x" }, // map property 'x' to column 'lon'
        { name: "lat", prop: "y" }, // map property 'y' to column 'lat'
      ],
      {
        table: { table: "input_data", schema: "public" }, // dummy table details
      }
    );
  }

  /**
   * Batch converts an array of coordinate objects to mileages.
   * @param {Array<Object>} data - Array of location objects, e.g., [{id, x, y}].
   * @returns {Promise<Array<Object>>} A promise that resolves to an array of converted mileages.
   */
  async findBatch(data) {
    // Generate the multi-row VALUES string.
    // pg-promise will automatically use the mapping from the ColumnSet.
    const values = this.pgp.helpers.values(data, this.cs);

    // Execute the query
    return this.db.any(this.sql.findBatch, { values });
  }

  /**
   * Finds mileages for a single coordinate within a given radius.
   * @param {Object} params - The parameters for the query.
   * @param {number} params.x - The longitude.
   * @param {number} params.y - The latitude.
   * @param {number} params.radius - The search radius in metres.
   * @returns {Promise<Array<Object>>} A promise that resolves to an array of nearby mileage results.
   */
  async findByCoordinate({ x, y, radius }) {
    return this.db.any(this.sql.findByCoordinate, { lon: x, lat: y, radius });
  }
}

module.exports = MileagesRepository;
