var express = require('express'),
    http = require('http'),
    bodyParser = require('body-parser'),
    app = express();
const PORT = 3000;

app.listen(PORT);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

const MongoClient = require('mongodb').MongoClient;
const dbName = 'wordPredictionAPI';
const url = 'mongodb://localhost:27017/wordPredictionAPI';

var words = {
  previous: "",
  current: [{ word: "", results: [] }],
  candidate: []
}


console.log('Server Started on Port ' + PORT);
app.use(function(req, res, next) {
  console.log(`${req.method} request for '${req.url}'`);
  console.log(req.body);
  next();
});

/*
Word Prediction
- Passing through an array of words
- Each input is evaluated against the list
- For each imput, add to branch:
    - Actual input
    - Input left of actual input
    - Input right of acutal input
    - None
    - Missed input
- Each branch, if a word is not found, delete the branch
*/
app.post('/reset', function(req, res) {
    words.previous = words.current.word;
    words.current = [{ word: "", results: [] }];
    words.candidate = [];
});

app.post('/next', function(req, res) {
  new Promise(resolve => {
    MongoClient.connect(url, function(err, client) {
      const collection = client.db(dbName).collection('Words');
      collection.find({ word: req.body.lastWord }).limit(1).toArray(function(err, docs) {
        resolve(docs);
      });
      client.close();
    });
  }).then(function(words) {
    console.log(words[0].nextWord);
    var response = [];
    var suggestedLetters = [];

    words[0].nextWord.forEach(function(word) {
      var flag = false;
      var tempChar = word.word.charAt(0);
      suggestedLetters.forEach(function (character) {
        if (character.letter == tempChar) {
          character.count++;
          flag = true;
        }
      });
      if (!flag) suggestedLetters = suggestedLetters.concat({letter: tempChar, count: 1});
    })
    suggestedLetters.sort(function(a, b) { return b.count - a.count; }).splice(5);
    suggestedLetters.forEach(function(character) {
      response.push(character.letter);
    })

    words[0].nextWord.sort(function(a, b) { return b.frequency - a.frequency; }).splice(5);

    words[0].nextWord.forEach(function(word) {
      response.push(word.word);
    });
    console.log("Suggested ========================");
    console.log(response);
    console.log("=================================");
    res.send(response);
  })
})


app.post('/input', function(req, res) {
  var maxLength = 0;
  new Promise(function(resolve) {
    var count = 0;

    words.current.forEach(function(word, wordIndex) {
      req.body.inputs.forEach(function(input, inputIndex) {

        searchDB(word.word + input).then(function(query) {
          if (query.results.length > 0 || wordIndex == 0 && inputIndex == 0) { // If there are words containing this or first input
            words.candidate.push({ word: query.word, results: query.results });
            if (query.word.length > maxLength) maxLength = query.word.length;
          }

          count++;
          if (count == words.current.length * req.body.inputs.length) resolve();

        });
      });
    });
  }).then(function() {
    // Merge and trim array if the length of word is 3 or more letters short
    words.current = words.current.concat(words.candidate);
    console.log(words.current);
    words.current.forEach(function(word, index) {
      if (word.word.length < maxLength-2) {
        console.log("Removing: "+words.current[index].word);
        words.current.splice(index, 1);
      }
      else {
        for (var i=0; i<index; i++) {
          if (words.current[i].word == word.word) {
            console.log("Removing Duplicate: " + words.current[index].word + " at index "+index);
            words.current.splice(index, 1);
          }
        }
      }
    });
    words.candidate = [];

    var response = [];
    var suggestedLetters = [];
    var suggest = [];

    words.current.forEach(function(word) {
      word.results.forEach(function(data) {
        var flag = false;
        var tempChar = data.word.charAt(word.word.length);
        if (tempChar === '') return false;
        suggestedLetters.forEach(function (character) {
          if (character.letter == tempChar) {
            character.count++;
            flag = true;
          }
        });
        if (!flag) suggestedLetters = suggestedLetters.concat({letter: tempChar, count: 1});

      })
    })
    suggestedLetters.sort(function(a, b) { return b.count - a.count; }).splice(5);
    suggestedLetters.forEach(function(character) {
      response.push(character.letter);
    })

    words.current.forEach(function(word) { suggest = suggest.concat(word.results); })
    suggest.forEach(function(word, index) {
      for (i=0; i<index; i++) {
        if (suggest[i].word == word.word) {
          console.log("Removing Duplicate: " + suggest[index].word + " at index "+index);
          suggest.splice(index, 1);
        }
      }
    });
    suggest.sort(function(a, b) { return b.frequency - a.frequency; }).splice(5);

    suggest.forEach(function(word) {
      response.push(word.word);
    });
    console.log("Suggested ========================");
    console.log(response);
    console.log("=================================");
    res.send(response);
  });
})

function searchDB(word) {
  return new Promise(resolve => {
    var query = "^" + word + '.*';
    var projection = { 'word': true, 'frequency': true };
    MongoClient.connect(url, function(err, client) {
      const collection = client.db(dbName).collection('Words');
      collection.find({ word: {$regex: query} }).project(projection).limit(20).sort({ frequency: -1 }).toArray(function(err, docs) {
        resolve({ word: word, results: docs });
      });
      client.close();
    });
  });
}



app.get('/next', function(req, res) {
  var projection = { 'nextWord': true };

  MongoClient.connect(url, function(err, client) {
    const collection = client.db(dbName).collection('python');
    collection.findOne({ word: req.query.word }, function(err, docs) {
      console.log(docs);
      res.send(docs);
    });
    client.close();
  });
})
