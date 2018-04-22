var express = require('express');
var app = express().listen(3000);
const MongoClient = require('mongodb').MongoClient;

const url = 'mongodb://localhost:27017';
