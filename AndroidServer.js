var app = require('express')();

// set the view engine to ejs
app.set('view engine', 'ejs');

var io = require('socket.io').listen(8080);
var mongodb = require('mongodb');

var MongoClient = mongodb.MongoClient;

app.get('/', function(req,res)
{
	//var users = [
	//{name: 'beer', drunkness: 1},
	//{name: 'martini', drunkness: 5},
	//{name: 'straight ethanol', drunkness: 10}
	//];
	
	MongoClient.connect('mongodb://alces2:stimperman@ds045531.mongolab.com:45531/alces', function(err,db)
		{
			if(err)
			{
				console.log('Database error');
			}
			
			var collection = db.collection('usersAndroid');
			
			collection.find().toArray(function(err, items) {
				//assert.equal(null, err);
				//assert.equal(0, items.length);
				
				var tagline = 'Example of variable binding pre-compile time code.';
	
				res.render('pages/index', 
				{
					users: items,
					tagline: tagline
				});
				
				db.close();
			  });
		});
});

// index page 
app.get('/', function(req, res) {
	res.render('pages/index');
});

// about page 
app.get('/about', function(req, res) {
	res.render('pages/about');
});

console.log('Server is listening for webpages on 3000');
app.listen(3000);

//_users entries will contain: room,lat,lon
var _users = {};

//Logic to handle all direct connections.
io.sockets.on('connection', function (socket) {

	//User obtains connection, a user is NOT authenticated at this point.
	console.log('User connection obatined.');
	
	//Can use this variable to determine who is authenticated.
	var authenticated = 0;
	var userName = '';
	//-1 means none
	var currentRoom = -1;
	var lat;
	var lon;
	
	//Verify the user's credentials. Doesn't do much right now, just make sure that the
	//username exists.
	socket.on('authenticate', function(authString)
	{	
		console.log('Incomming auth request');
		MongoClient.connect('mongodb://alces2:stimperman@ds045531.mongolab.com:45531/alces', function(err,db)
		{
			if(err)
			{
				console.log('Database error');
			}
			
			else
			{
				console.log(authString.name +' is attempting to auth.');
				//Should be able to swap out this mongo connection for any other kind of DB.
				var collection = db.collection('usersAndroid');
				
				collection.findOne({name: authString.name}, function(err, result)
				{
					if(err)
					{
						console.log(err);
					}
					
					else if(!result)
					{
						//User name does not exist in the database.
						socket.emit('refuse','Your credentials have been rejected. Incorrect user name.');
						console.log('User was rejected for bad credentials');
					}
					
					//User is found in the log, do auth.
					else
					{
						console.log('Found user: ' + result.name + '. Doing Auth');
						
						//Basic auth.
						if(result.pass == authString.pass)
						{
							console.log('User ' + authString.name + ' has been authorized');
							socket.emit('approve', 'Authentication string goes here!');
							authenticated = 1;
							//_users keeps track of all connected users via their socket object.
							//This way we can emit to all users in a room.
							_users[socket] = {room:-1};
							return;
						}
						
						else
						{
							console.log('User ' + authString.name + ' has been rejected for incorrect password');
							socket.emit('refuse','Your credentials have been rejected. Incorrect password.');
						}
					}
				});
			}
		});
	});
	
	//Creates a user in the database
	//currently not secure.
	socket.on('create', function(createString)
	{
		//var splitString = createString.split(";");
		//var userToAdd = {name: splitString[0], password: splitString[1]};
		
		MongoClient.connect('mongodb://alces2:stimperman@ds045531.mongolab.com:45531/alces', function(err,db)
		{
			if(err)
			{
				console.log('Database error');
			}
			
			else
			{
				console.log('Connection made with MongoDB user server');
				var collection = db.collection('usersAndroid');
				
				collection.findOne({name: createString.name}, function(err, result)
				{
					if(err)
					{
						console.log(err);
						socket.emit('refuse', 'Refused');
					}
					
					else if(!result)
					{
						collection.insert(createString, function(err,result)
						{
							if(err)
							{
								console.log(err);
							}
							else
							{
								console.log('Inserted new user into the database.' + createString.name);
								socket.emit('createsuccess','User created successfully');
							}
						});
					}
					else
					{
						socket.emit('refuse', 'Refused');
					}
				});
				
			}
		});
		
	});
	
	socket.on('exit', function (name)
	{
		if(authenticated == 1)
		{
			console.log(name, ' has disconected.');
		}
	});
	
	socket.on('disconnect', function (args)
	{
		if(authenticated == 1)
		{
			console.log('Removing user from the users array');
			delete _users[socket];
		}
	});
	
	//Args properties: roomId
	socket.on('join room', function(args)
	{
		if(authenticated)
		{
			//TODO: Double check that room exists.
			
			//TODO: Execute room swap if neccesary.
			
			//TODO: Emit success/failure.
		}
		else
		{
			//need to re-auth.
		}
	});
	
	socket.on('leave room', function (args)
	{
		if(authenticated)
		{
			currentRoom = -1;
			_users[socket] = {room:-1};
		}
	});
	
	socket.on('broadcast to room', function (args)
	{
		if(authenticated)
		{
			var toEmit = {};
			_users.forEach(function(entry) {
				if(entry.room == currentRoom)
				{
					//Perform the data burst.
				}
			});
		}
	});
	
	socket.on('DEBUG_SAVE_FILE', function(args)
	{
		var start = new Date();
		console.log('Attempting to save a file!');
		
		require("fs").writeFile("out.mp4", args, 'base64', function(err) {
				if(err)
				{
					console.log(err);
				}
			});
			
		var end = new Date() - start;
		console.info('I saved a file! %dms', end);
	});
});