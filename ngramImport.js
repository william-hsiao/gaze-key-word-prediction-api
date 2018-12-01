// "C:\Program Files\MongoDB\Server\3.6\bin\mongod.exe" --dbpath "C:\Users\William\Dropbox\早稲田大学\Research Project\WordPredictionAPI\mongodb\data"

var fs = require('fs');
const filePath = './w2.txt';

const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://localhost:27017';
const dbName = 'wordPredictionAPI';

require.extensions['.txt'] = function (module, filename) {
    module.exports = fs.readFileSync(filename, 'utf8');
};

var data = require(filePath).split('\n');

// 200000
var start = 250000;
for (i=start; i<(start+50000); i++) {
  setTimeout( function (i) {
    MongoClient.connect(url, function(err, client) {
      const collection = client.db(dbName).collection('Test');
      var entry = data[i].split('\t');
      console.log(i + ": " + entry);
      collection.findOneAndUpdate( { 'word': entry[1] },
        { $inc: { 'frequency': parseInt(entry[0]) }, $set: { 'word': entry[1] }, $push: { 'nextWord': { 'word': entry[2], 'frequency': parseInt(entry[0]) } }},
        { upsert: true, returnNewDocument: true },
        function(err, result) {
          if (err) throw err;
          // console.log(result);
          client.close();
      })
    })
  }, (i-start)*75, i);
}

// // Use connect method to connect to the server
// MongoClient.connect(url, function(err, client) {
//   console.log("Connected successfully to server");
//   const collection = client.db(dbName).collection('Words');
//
//   collection.insert( {name: 'Test'});
//   client.close();
// });


// ========================================================================
// var LineByLineReader = require('line-by-line');
// var lr = new LineByLineReader(filePath);
// lr.on('error', function (err) {
// 	// 'err' contains error object
//
// });
//
// MongoClient.connect(url, function(err, client) {
//   const collection = client.db(dbName).collection('Test');
//   lr.on('line', function (line) {
//   	// 'line' contains the current line without the trailing newline character.
//     var entry = line.split('\t');
//     console.log(entry);
//     collection.findOneAndUpdate( { 'word': entry[1] },
//       { $inc: { 'frequency': parseInt(entry[0]) }, $set: { 'word': entry[1] }, $push: { 'nextWord': { 'word': entry[2], 'frequency': parseInt(entry[0]) } }},
//       { upsert: true, returnNewDocument: true },
//       function(err, result) {
//         if (err) {
//           console.log(entry);
//           throw err;
//         };
//         // console.log(result);
//     })
//   })
// });
//
// lr.on('end', function () {
// 	// All lines are read, file is closed now.
// });
