class MetadataRepository {
  /**
   * @param {Object} db - The database connection object.
   * @param {Object} sql - The pre-loaded SQL queries.
   * @param {Object} pgp - The pg-promise instance.
   */
  constructor(db, sql, pgp) {
    this.db = db;
    this.sql = sql;
    this.pgp = pgp; // pgp is the initialized instance
  }

  /**
   * Finds all ELRs
   */
  async findElrs() {
    return this.db.any(this.sql.findElrs);
  }
}

module.exports = MetadataRepository;
