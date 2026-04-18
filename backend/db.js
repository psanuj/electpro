const sql = require('mssql/msnodesqlv8');

// Using ODBC Driver which is already installed with SQL Server
const config = {
  connectionString: 'Driver={ODBC Driver 17 for SQL Server};Server=localhost\\SQLEXPRESS;Database=ElectProDB;Trusted_Connection=yes;TrustServerCertificate=yes;'
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('✅ Connected to SQL Server successfully!');
    return pool;
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });

module.exports = { sql, poolPromise };
