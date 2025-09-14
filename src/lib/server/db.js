import sqlite3 from 'sqlite3';

const sqlite3V = sqlite3.verbose();
const db = new sqlite3V.Database('./test.sqlite');

db.serialize(() => {
  db.run('CREATE TABLE lorem (info TEXT)', (err, row) => {
    console.log(err);
  });
});

export { db };
