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
      ["id", { name: "lon", prop: "x" }, { name: "lat", prop: "y" }],
      {
        table: "input_data",
      }
    );
  }

  /**
   * Finds mileages for a single coordinate within a given radius.
   */
  async findByCoordinate({ x, y, radius }) {
    return this.db.any(this.sql.findByCoordinate, { lon: x, lat: y, radius });
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
