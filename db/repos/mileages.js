class MileagesRepository {
  /**
   * @param {Object} db - The database connection object.
   * @param {Object} sql - The pre-loaded SQL queries.
   * @param {Object} pgp - The pg-promise instance.
   */
  constructor(db, sql, pgp) {
    this.db = db;
    this.sql = sql;
    this.pgp = pgp; // pgp is the initialized instance

    // Access ColumnSet from the passed-in pgp object
    this.cs = new pgp.helpers.ColumnSet(
      [
        { name: "id", def: null },
        { name: "lon", prop: "x", cast: "numeric" },
        { name: "lat", prop: "y", cast: "numeric" },
        { name: "distance", def: 100, cast: "integer" },
      ],
      {
        table: "input_data",
      }
    );
  }

  /**
   * Finds mileages for a single coordinate within a given radius.
   */
  async findByCoordinate({ id, x, y, distance }) {
    // Create an array with a single item and call the batch method.
    const data = [{ id, x, y, distance }];
    return this.findBatch(data);
  }

  /**
   * Batch converts an array of coordinate objects to mileages.
   */
  async findBatch(data) {
    const values = this.pgp.helpers.values(data, this.cs);
    return this.db.any(this.sql.findBatch, { values });
  }
}

module.exports = MileagesRepository;
