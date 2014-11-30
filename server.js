var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var http = require('http').Server(app);
var config = require('./config.json');
var fs = require('fs');
var async = require('async');

app.engine('html', require('ejs').renderFile);
app.set('env', process.env.NODE_ENV);
app.set('view engine', 'ejs');
app.set('views',__dirname+'/public/views');


app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

var JSaggregator = function(){
    var dist = Object.keys(config.core.js)[0];
    var JS = '';
    async.eachSeries(config.core.js[dist],function(item,iterate){
    	fs.readFile('./'+item,function(err,data){
            if (err) {console.log('Could not load JS files.')};
            JS = JS+'\n'+data;
            iterate();
    	});
    },function(err){
    	if (err) {console.log(err)};
    	fs.writeFile(dist,JS,function(err,result){
            console.log('JS LOADED');
    	});
    });
};

var CSSaggregator = function(){
    var dist = Object.keys(config.core.css)[0];
    var CSS = '';
    async.eachSeries(config.core.css[dist],function(item,iterate){
    	fs.readFile('./'+item,function(err,data){
            if (err) {console.log('Could not load CSS files.')};
            CSS = CSS+'\n'+data;
            iterate();
    	});
    },function(err){
    	if (err) {console.log(err)};
    	fs.writeFile(dist,CSS,function(err,result){
           console.log('CSS LOADED');
    	});
    });
};

app.use(/.*\.js/,function(req,res){
	res.sendFile(__dirname+'/bower_components/dist.min.js');
});

app.use(/.*\.css/,function(req,res){
	res.sendFile(__dirname+'/bower_components/dist.min.css');
});

app.use('/:username/:key',function(req,res,next){
    var client = require('redis').createClient();
    client.get(req.params.key,function(err,data){
        if(err) res.send('Invalid request');
        var doc = JSON.parse(data);
        if(doc.room.hasOwnProperty(req.params.username)&&doc.room[req.params.username]===null){
            //Assign Socket
            next();
        }else
            res.send('You are not authorized for Real-Time Collaboration on this repository.');
    });
});

app.get('/:username/:key',function(req,res){
    res.render('view.html');
});

CSSaggregator();
JSaggregator();
http.listen(8080);
console.log('*********Real Time Editor for Codeyard listening on 8080**********');