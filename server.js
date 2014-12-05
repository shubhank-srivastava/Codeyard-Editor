var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var http = require('http').Server(app);
var config = require('./config.json');
var fs = require('fs');
var async = require('async');
var io;
var client = require('redis').createClient();
var pushCQueue = config.redis.pushCommits;


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

/*var findOnline = function(contributors,cb){
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
*/

io = require('socket.io')(http);
io.on('connection',function (socket){		
	socket.on('init',function(data){
		client.select(1,function(){
			client.set(data.userid,socket.id,function(err,res){
				if(err)
					console.log('Error setting user and socket in redis');
				else{
					console.log(data.userid+' and '+socket.id+ ' set successfully.');
				}
			});
		});
		client.select('0',function(){
			client.get(data.fileid,function(err,data1){
				if(err) console.log(err);
				if(data1){
					var path,contents;
					data1 = JSON.parse(data1);
					for(var i=0;i<data1.repo.files.length;i++){
						if(data1.repo.files[i]._id===data.fileid){
							path =  data1.repo.files[i].path;
							break;
						}
					}
					fs.readFile(config.repoPath+path,'utf8',function(err,data){
						if(err){
						 	socket.emit('init',{repo:data1.repo,fileContents:'Could not load the file contents.'});
						 	console.log('Could not load the file contents: '+config.repoPath+path);
						}
						else
							socket.emit('init',{repo:data1.repo,fileContents:data});
						
					});	
					socket.join(data.fileid, function(err){
							io.to(data.fileid).emit('imonline',{userid:data.userid});
					});			
				} 
			});
		});
	});

	socket.on('disconnect',function(){
		console.log('socket disconnected');
	});

	socket.on('sendMessage',function(data){
		io.to(data.file).emit('updateChat',{from:data.by,message:data.message});
	});
});
//////////////////////////////////////
var getclient = require('redis').createClient(); //should differ from existing 'client' object

getclient.subscribe('cy-pullcommits');

  getclient.on("subscribe", function (channel, count) {
	 console.log('Now subscribeed to channel '+ channel);
  });

  getclient.on("message", function (channel, message) {
    var res = JSON.parse(message);
    client.select(1,function(){
    	client.get(res.userid,function(err,socket){
      		io.to(socket).emit('commit_done',res.commitid);
    	});
    });
  });
/////////////////////////////////////////

app.use(/.*\.js/,function(req,res){
	res.sendFile(__dirname+'/bower_components/dist.min.js');
});


app.use(/.*\.css/,function(req,res){
	res.sendFile(__dirname+'/bower_components/dist.min.css');
});

/*app.use('/editor/:userid/:key',function(req,res,next){
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
});*/

app.get('/editor/:userid/:key',function(req,res){
    res.render('view.html');
});

app.post('/commit',function(req,res){
	req.body.file.isnew = "false";
	var commit = {
			'reposlug' : req.body.reposlug,
			'repoid' : req.body.repoid,
			'desc' : req.body.desc,
			'userid' : req.body.userid,
			'username' : req.body.username,
			'files' : []
		};
    commit.files.push(req.body.file);
	processCommit(req.body.content,commit,function(err,response){
		if(err){
			console.log(err);
			res.send(200,'There was an error while processing commits');
		}
		res.jsonp(response);
	});
});

var processCommit = function(content,commit,cb){
	var result = {};
	commit.files[0].path = commit.files[0].path.substr(0,commit.files[0].path.lastIndexOf('/'));
	var	filePath = config.repoPath+commit.files[0].path+'/temp_'+commit.files[0].name;
			console.log(commit);
				fs.writeFile(filePath,content,'utf8',function(error,result){
					if(error){
						console.log(error);
						result = {
					    	'error':1,
							'error_msg':'Error while processing files'
						};
						cb(err,result);
					}
					else{	
						commit = JSON.stringify(commit);
							client.rpush(pushCQueue,commit,function(redis_err,redis_res){
								if(redis_err){
									console.log(redis_err);
									result = {
										'error':1,
										'error_msg':'Error while adding in the queue'
									};
								}
								else{
									result = {
										'error':0,
										'error_msg':'Files committed successfully'
									};
								}
								cb(null,result);
							});
					}
				});
};

CSSaggregator();
JSaggregator();
http.listen(8080);
console.log('*********Real Time Editor for Codeyard listening on 8080**********');