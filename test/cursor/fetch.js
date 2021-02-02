/* eslint-env node, mocha */

require('dotenv').config();
const assert = require('assert');
const odbc = require('../../');
const { Cursor } = require('../../lib/Cursor');

const TABLE_NAME = "FETCH_TABLE";

// create a queryOptions object to create a Cursor object instead of generating
// results immediately
const queryOptions = {
  cursor: true,
  fetchSize: 3,
};

describe('.fetch([callback])...', () => {

  // Populate a table that we can fetch from, with a known number of rows
  before(async () => {
    try {
      const connection = await odbc.connect(`${process.env.CONNECTION_STRING}`);
      let result = await connection.query(`CREATE OR REPLACE TABLE ${process.env.DB_SCHEMA}.${TABLE_NAME} (COL1 INT NOT NULL, COL2 CHAR(3), COL3 VARCHAR(16))`);
      result = await connection.query(`INSERT INTO ${process.env.DB_SCHEMA}.${TABLE_NAME} VALUES(1, 'ABC', 'DEF')`);
      result = await connection.query(`INSERT INTO ${process.env.DB_SCHEMA}.${TABLE_NAME} VALUES(2, NULL, NULL)`);
      result = await connection.query(`INSERT INTO ${process.env.DB_SCHEMA}.${TABLE_NAME} VALUES(3, 'G', 'HIJKLMN')`);
      result = await connection.query(`INSERT INTO ${process.env.DB_SCHEMA}.${TABLE_NAME} VALUES(4, NULL, 'OP')`);
      result = await connection.query(`INSERT INTO ${process.env.DB_SCHEMA}.${TABLE_NAME} VALUES(5, 'Q', NULL)`);
      result = await connection.query(`INSERT INTO ${process.env.DB_SCHEMA}.${TABLE_NAME} VALUES(6, NULL, 'RST')`);
      result = await connection.query(`INSERT INTO ${process.env.DB_SCHEMA}.${TABLE_NAME} VALUES(7, 'UVW', 'XYZ')`);
    } catch (e) {
      // TODO: catch error
    }
  });

  after(async () => {
    const connection = await odbc.connect(`${process.env.CONNECTION_STRING}`);
    await connection.query(`DROP TABLE ${process.env.DB_SCHEMA}.${TABLE_NAME}`);
    await connection.close();
  });

  describe('...with callbacks...', () => {

    it('...should set noData to false before the first fetch.', (done) => {

      odbc.connect(`${process.env.CONNECTION_STRING}`, (error, connection) => {
        assert.deepEqual(error, null);
        connection.query(`SELECT * FROM ${process.env.DB_SCHEMA}.${TABLE_NAME}`, queryOptions, (error1, cursor) => {
          assert.deepEqual(error1, null);
          assert.notDeepEqual(cursor, null);
          assert.deepEqual(cursor instanceof Cursor, true);
          assert.deepEqual(cursor.noData, false);
          cursor.close((error2) => {
            assert.deepEqual(error2, null);
            done();
          });
        });
      });
    });

    it('...should set noData to true only after the first fetch, even if there is no result sets to fetch.', (done) => {

      const EMPTY_FETCH = "EMPTY_FETCH";

      odbc.connect(`${process.env.CONNECTION_STRING}`, (error1, connection) => {
        assert.deepEqual(error1, null);
        connection.query(`CREATE OR REPLACE TABLE ${process.env.DB_SCHEMA}.${EMPTY_FETCH} (COL1 INT NOT NULL, COL2 CHAR(3), COL3 VARCHAR(16))`, (error2, result1) => {
          assert.deepEqual(error2, null);
          assert.deepEqual(result1.length, 0);
          connection.query(`SELECT * FROM ${process.env.DB_SCHEMA}.${EMPTY_FETCH}`, queryOptions, (error2, cursor) => {
            assert.deepEqual(error2, null);
            assert.notDeepEqual(cursor, null);
            assert.deepEqual(cursor instanceof Cursor, true);
            assert.deepEqual(cursor.noData, false);
            cursor.fetch((error3, result2) => {
              assert.deepEqual(error3, null);
              assert.deepEqual(result2.length, 0);
              assert.deepEqual(cursor.noData, true);
              cursor.close((error4) => {
                assert.deepEqual(error4, null);
                done();
              });
            });
          });
        });
      });
    });

    it('...should return only the number of rows set on the query options.', (done) => {

      odbc.connect(`${process.env.CONNECTION_STRING}`, (error, connection) => {
        assert.deepEqual(error, null);
        connection.query(`SELECT * FROM ${process.env.DB_SCHEMA}.${TABLE_NAME}`, queryOptions, (error1, cursor) => {
          assert.deepEqual(error1, null);
          assert.notDeepEqual(cursor, null);
          assert.deepEqual(cursor instanceof Cursor, true);
          cursor.fetch((error2, result) => {
            assert.deepEqual(error2, null);
            assert.notDeepEqual(result, null);
            assert.deepEqual(result.length, 3);
            cursor.close((error3) => {
              assert.deepEqual(error3, null);
              done();
            });
          });
        });
      });
    });

    it('...should return the correct result set for each subsequent call.', (done) => {

      odbc.connect(`${process.env.CONNECTION_STRING}`, (error, connection) => {
        assert.deepEqual(error, null);
        connection.query(`SELECT * FROM ${process.env.DB_SCHEMA}.${TABLE_NAME}`, queryOptions, (error1, cursor) => {
          assert.deepEqual(error1, null);
          assert.notDeepEqual(cursor, null);
          assert.deepEqual(cursor instanceof Cursor, true);
          cursor.fetch((error2, result1) => {
            assert.deepEqual(error2, null);
            assert.notDeepEqual(result1, null);
            assert.deepEqual(cursor.noData, false);
            assert.deepEqual(result1.length, 3);
            assert.deepEqual(result1[0]["COL1"], 1);
            assert.deepEqual(result1[1]["COL1"], 2);
            assert.deepEqual(result1[2]["COL1"], 3);
            cursor.fetch((error3, result2) => {
              assert.deepEqual(error3, null);
              assert.notDeepEqual(result2, null);
              assert.deepEqual(cursor.noData, false);
              assert.deepEqual(result2.length, 3);
              assert.deepEqual(result2[0]["COL1"], 4);
              assert.deepEqual(result2[1]["COL1"], 5);
              assert.deepEqual(result2[2]["COL1"], 6);
              cursor.close((error3) => {
                assert.deepEqual(error3, null);
                done();
              });
            });
          });
        });
      });
    });

    it('...should only return a partial result set and set noData to true when a fetch overlaps the end of the result set.', (done) => {

      odbc.connect(`${process.env.CONNECTION_STRING}`, (error, connection) => {
        assert.deepEqual(error, null);
        connection.query(`SELECT * FROM ${process.env.DB_SCHEMA}.${TABLE_NAME}`, queryOptions, (error1, cursor) => {
          assert.deepEqual(error1, null);
          assert.notDeepEqual(cursor, null);
          assert.deepEqual(cursor instanceof Cursor, true);
          assert.deepEqual(cursor.noData, false);
          cursor.fetch((error2, result2) => {
            assert.deepEqual(error2, null);
            assert.notDeepEqual(result2, null);
            assert.deepEqual(result2.length, 3);
            assert.deepEqual(cursor.noData, false);
            cursor.fetch((error3, result3) => {
              assert.deepEqual(error3, null);
              assert.notDeepEqual(result3, null);
              assert.deepEqual(result3.length, 3);
              assert.deepEqual(cursor.noData, false);
              cursor.fetch((error4, result4) => {
                // We INSERTed 7 records, have fetched 3 times with a fetchSize
                // of 3. Should only get one record.
                assert.deepEqual(error4, null);
                assert.notDeepEqual(result4, null);
                assert.deepEqual(result4.length, 1);
                assert.deepEqual(cursor.noData, true);
                cursor.close((error3) => {
                  assert.deepEqual(error3, null);
                  done();
                });
              });
            });
          });
        });
      });
    });
  });

  describe('...with promises...', () => {
    it('...should set noData to false before the first fetch.', async () => {
      let connection;
      try {
        connection = await odbc.connect(`${process.env.CONNECTION_STRING}`);
        const cursor = await connection.query(`SELECT * FROM ${process.env.DB_SCHEMA}.${TABLE_NAME}`, queryOptions);
        assert.notDeepEqual(cursor, null);
        assert.deepEqual(cursor instanceof Cursor, true);
        assert.deepEqual(cursor.noData, false);
        await cursor.close();
      } catch (e) {
        assert.fail(e);
      } finally {
        await connection.close();
      }
    });

    it('...should set noData to true only after the first fetch, even if there is no result sets to fetch.', async () => {

      const EMPTY_FETCH = "EMPTY_FETCH";

      const connection = await odbc.connect(`${process.env.CONNECTION_STRING}`);
      await connection.query(`CREATE OR REPLACE TABLE ${process.env.DB_SCHEMA}.${EMPTY_FETCH} (COL1 INT NOT NULL, COL2 CHAR(3), COL3 VARCHAR(16))`);
      const cursor = await connection.query(`SELECT * FROM ${process.env.DB_SCHEMA}.${EMPTY_FETCH}`, queryOptions);
      assert.notDeepEqual(cursor, null);
      assert.deepEqual(cursor instanceof Cursor, true);
      assert.deepEqual(cursor.noData, false);
      const result = await cursor.fetch();
      assert.deepEqual(result.length, 0);
      assert.deepEqual(cursor.noData, true);
      await cursor.close();
      await connection.close();
    });

    it('...should return only the number of rows set on the query options.', async () => {

      const connection = await odbc.connect(`${process.env.CONNECTION_STRING}`);
      const cursor = await connection.query(`SELECT * FROM ${process.env.DB_SCHEMA}.${TABLE_NAME}`, queryOptions);
      assert.notDeepEqual(cursor, null);
      assert.deepEqual(cursor instanceof Cursor, true);
      const result = await cursor.fetch();
      assert.notDeepEqual(result, null);
      assert.deepEqual(result.length, 3);
      await cursor.close();
      await connection.close();
    });

    it('...should return the correct result set for each subsequent call.', async () => {

      const connection = await odbc.connect(`${process.env.CONNECTION_STRING}`);
      const cursor = await connection.query(`SELECT * FROM ${process.env.DB_SCHEMA}.${TABLE_NAME}`, queryOptions);
      assert.notDeepEqual(cursor, null);
      assert.deepEqual(cursor instanceof Cursor, true);
      let result = await cursor.fetch();
      assert.notDeepEqual(result, null);
      assert.deepEqual(result.length, 3);
      assert.deepEqual(result[0]["COL1"], 1);
      assert.deepEqual(result[1]["COL1"], 2);
      assert.deepEqual(result[2]["COL1"], 3);
      result = await cursor.fetch();
      assert.notDeepEqual(result, null);
      assert.deepEqual(result.length, 3);
      assert.deepEqual(result[0]["COL1"], 4);
      assert.deepEqual(result[1]["COL1"], 5);
      assert.deepEqual(result[2]["COL1"], 6);
      await cursor.close();
      await connection.close();
    });

    it('...should only return a partial result set and set noData to true when a fetch overlaps the end of the result set.', async () => {

      const connection = await odbc.connect(`${process.env.CONNECTION_STRING}`);
      const cursor = await connection.query(`SELECT * FROM ${process.env.DB_SCHEMA}.${TABLE_NAME}`, queryOptions);
      assert.notDeepEqual(cursor, null);
      assert.deepEqual(cursor instanceof Cursor, true);
      let result = await cursor.fetch();
      assert.notDeepEqual(result, null);
      assert.deepEqual(result.length, 3);
      result = await cursor.fetch();
      assert.notDeepEqual(result, null);
      assert.deepEqual(result.length, 3);
      result = await cursor.fetch();
      assert.notDeepEqual(result, null);
      assert.deepEqual(result.length, 1);
      assert.deepEqual(cursor.noData, true);
      await cursor.close();
      await connection.close();
    });
  });
});