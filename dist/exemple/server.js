// Main

// variables

const express = require('express');
const app = express();
app.use(express.static(__dirname + '/public'));
const http = require('http');
const server = http.createServer(app);

//ressources

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/game_engine_exemple.html');
});

server.listen(80, function() {
  console.log('listening on *:80');
});