var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var http = require('http').Server(app);
var config = require('./config.json');
var fs = require('fs');
var async = require('async');
var unirest = require('unirest');
var io;
var client = require('redis').createClient();


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

var findOnline = function(contributors,cb){
	var online = [];
	var info = {};
	async.each(contributors,function(item,iterate){
		client.select(1,function(){
			client.get(item._id,function(socket){
				console.log(item._id);
				console.log(socket);
				if(socket){
					console.log(socket);
					info={
						'userid':item._id,
						'username':item.username,
						'socketid':socket
					};
					online.push(info);
				}
				iterate();
			});
		});
	},function(err){
		console.log(online);
		cb(online);
	});
};

var setSocket = function(userid,fileid,repo,username){
	var contributors = [];
	io = require('socket.io')(http);
	io.on('connection',function (socket){		
		client.select(1,function(){
			client.set(userid,socket.id,function(err,res){
				if(err)
					console.log('Error setting user and socket in redis');
				else{
					console.log(userid+' and '+socket.id+ ' set successfully.');
					findOnline(repo.contributors,function(online){
						console.log(online);
						io.to(fileid).emit('onlineContributors',{contributors:online});
					});
				}
			});
		});

		socket.join(fileid);

		socket.emit('init',{repo:repo,userid:userid,file:fileid,username:username});

		socket.on('disconnect',function(){
			client.select(1,function(){
				client.del(userid);
			});
		});

		socket.on('sendMessage',function(data){
			io.to(data.file).emit('updateChat',{from:data.by,message:data.message});
		});
	});
};


app.use(/.*\.js/,function(req,res){
	res.sendFile(__dirname+'/bower_components/dist.min.js');
});


app.use(/.*\.css/,function(req,res){
	res.sendFile(__dirname+'/bower_components/dist.min.css');
});

app.use('/editor/:userid/:key',function(req,res,next){
	client.select('0',function(){
		client.get(req.params.key,function(err,data){
			if(err) console.log(err);
			if(data){
				data = JSON.parse(data);			
				async.each(data.repo.contributors,function(item,iterate){
					if(item._id == req.params.userid){
						setSocket(req.params.userid,req.params.key,data.repo,item.username);
						next();
					}
					else
						iterate();
				},function(err){
					res.send('You are not authorised to work in this repo.');
				});	
			}
			else
				res.send('No such file in the database'); 
		});
	});
});

app.get('/editor/:userid/:key',function(req,res){
    res.render('view.html');
});

app.get('/',function(req,res){
	res.send("This");
});

CSSaggregator();
JSaggregator();
http.listen(8080);
console.log('*********Real Time Editor for Codeyard listening on 8080**********');