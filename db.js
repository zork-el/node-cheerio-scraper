const firebase = require('firebase');
require('firebase/firestore');
const dbConfig = require('./db-config');

firebase.initializeApp(dbConfig);

// Initialize Cloud Firestore through Firebase
var db = firebase.firestore();

// Disable deprecated features
db.settings({
  timestampsInSnapshots: true
});

module.exports = db;