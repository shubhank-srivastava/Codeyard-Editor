var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var http = require('http').Server(app);
http.listen(8080);
console.log('Real Time Editor for Codeyard listening on 8080');

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({
    extended: true
  }));
app.set('view engine', 'html');

app.get('/',function(req,res){
	res.send('hello');
});