function execAll(db, query, params) {
  return new Promise((resolve,reject) => {
    db.all(query, params, (err, rows) => {
      if(!!err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

module.exports.execAll = execAll;
