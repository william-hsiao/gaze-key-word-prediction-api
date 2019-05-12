var express = require('express'),
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

console.log('Server Started on Port ' + PORT);
app.use(function(req, res, next) {
    console.log();
    console.log(`${req.method} request for '${req.url}'`);
    console.log(req.body);
    next();
});

function searchDB(word) {
    return new Promise(resolve => {
        var query = "^" + word + '.*';
        var projection = { 'word': true, 'frequency': true };
        MongoClient.connect(url, function(err, client) {
            const collection = client.db(dbName).collection('Words');
            collection.find({ word: {$regex: query} }).project(projection).limit(10).sort({ frequency: -1 }).toArray(function(err, docs) {
                client.close();
                resolve(docs);
            });
        });
    });
}

function searchDBExact(word) {
    return new Promise(resolve => {
        MongoClient.connect(url, function(err, client) {
            const collection = client.db(dbName).collection('Words');
            collection.find({ word }).limit(1).toArray(function(err, docs) {
                client.close();
                resolve(docs);
            });
        });
    });
}

function sortAndSplice(arr) {
    return arr.sort((a, b) => b.frequency - a.frequency).splice(0, 5).map(item => item.word);
}

// Input: [ { word: string, deviation: num }, ...]
app.post('/input', async (req, res) => {
    let data = req.body.inputs;
    const dbQueryPromises = [];
    const dbResults = [];
    const letterSuggestions = [];

    data.forEach(input => {
        dbQueryPromises.push(new Promise(resolve => {
            searchDB(input.word).then(result => {
                if (!result.length) {
                    data = data.filter(inpt => inpt.word !== input.word);
                    // console.log('Removing ' + input.word);
                    resolve();
                }

                result.forEach(candidate => {
                    if (!dbResults.find(result => result.word === candidate.word)) {
                        dbResults.push({
                            word: candidate.word,
                            frequency: candidate.frequency * Math.pow(.6, input.deviation),
                        })

                        const nextLetter = candidate.word.charAt(input.word.length);

                        if (nextLetter !== '') {
                            const letterSuggestionIndex = letterSuggestions.findIndex(suggestion => suggestion.word === nextLetter);

                            if (letterSuggestionIndex !== -1) letterSuggestions[letterSuggestionIndex].frequency++;
                            else letterSuggestions.push({ word: nextLetter, frequency: 1 });
                        }
                    }
                })
                resolve();
            })
        }))
    });

    await Promise.all(dbQueryPromises).then(() => {
        const suggestions = [...sortAndSplice(letterSuggestions), ...sortAndSplice(dbResults)];
        console.log('Suggestions: ', suggestions);
        console.log('Data: ', data);
        res.send({
            inputs: data,
            suggestions,
        });
    });
});

app.post('/next', async (req, res) => {
    const word = req.body.inputs[0].word;
    const letterSuggestions = [];

    await searchDBExact(word).then(result => {
        if (!result.length) return res.send([]);

        result[0].nextWord.forEach(candidate => {
            const nextLetter = candidate.word.charAt(word.length);

            if (nextLetter !== '') {
                letterSuggestionIndex = letterSuggestions.findIndex(suggestion => suggestion.word === nextLetter);

                if (letterSuggestionIndex !== -1) letterSuggestions[letterSuggestionIndex].frequency++;
                else letterSuggestions.push({ word: nextLetter, frequency: 1 });
            }
        })

        const suggestions = [...sortAndSplice(letterSuggestions), ...sortAndSplice(result[0].nextWord)];
        console.log('Suggestions: ', suggestions);
        res.send({
            inputs: [...word],
            suggestions,
        });
    })
  })