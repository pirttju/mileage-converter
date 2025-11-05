class CoordinatesRepository {
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
      ["id", "elr", "miles", "chains", "yards", "kilometers", "metres"],
      {
        table: "input_data", // A dummy table name is sufficient
      }
    );
  }

  /**
   * Finds a single coordinate by its ELR and mileage.
   */
  async findByElrAndMileage({ elr, target_km }) {
    return this.db.oneOrNone(this.sql.findByElrAndMileage, { elr, target_km });
  }

  /**
   * Batch converts an array of ELR/mileage objects to coordinates.
   */
  async findBatch(data) {
    const values = this.pgp.helpers.values(data, this.cs);
    return this.db.any(this.sql.findBatch, { values });
  }
}

module.exports = CoordinatesRepository;
