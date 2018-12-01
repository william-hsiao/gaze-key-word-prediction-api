from pymongo import MongoClient
client = MongoClient('localhost', 27017)
db = client.wordPredictionAPI
collection = db.Words

f = open('./w2-4.txt', 'r')

for line in f:
    entry = line.strip('\n')
    entry = entry.split('\t')
    print(entry)
    collection.find_one_and_update(
        { 'word': entry[1] },
        { '$inc': { 'frequency': int(entry[0]) }, '$set': { 'word': entry[1] }, '$push': { 'nextWord': { 'word': entry[2], 'frequency': int(entry[0]) } }},
        upsert = True)

f.close()
