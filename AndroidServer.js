var app = require('express')();
var session = require('express-session');

// set the view engine to ejs
app.set('view engine', 'ejs');

var io = require('socket.io').listen(8080);
var mongodb = require('mongodb');

var MongoClient = mongodb.MongoClient;

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  resave: false, // don't save session if unmodified
  saveUninitialized: false, // don't create session until something stored
  secret: 'secret code'
}));

app.get('/', function(req,res)
{
	MongoClient.connect('mongodb://alces2:stimperman@ds045531.mongolab.com:45531/alces', function(err,db)
		{
			if(err)
			{
				console.log('Database error ' + error);
			}
			var collection = db.collection('roomsAndroid');
			
			collection.find().toArray(function(err, items) {
				//assert.equal(null, err);
				//assert.equal(0, items.length);
				
				var tagline = 'Example of variable binding pre-compile time code.';
				
				var usr;
				
				if(req.session.user)
				{
					usr = req.session.user;
				}
				else
				{
					usr = '';
				}
				
				res.render('pages/index', 
				{
					rooms: items,
					tagline: tagline,
					userName: usr
				});
			  });
		});
});

app.get('/rooms', function(req, res)
{
	MongoClient.connect('mongodb://alces2:stimperman@ds045531.mongolab.com:45531/alces', function(err,db)
		{
			if(err)
			{
				console.log('Database error ' + error);
			}
			var collection = db.collection('roomsAndroid');
			
			collection.find().toArray(function(err, items) {
				//assert.equal(null, err);
				//assert.equal(0, items.length);
				
				var tagline = 'Example of variable binding pre-compile time code.';
				
				var usr;
				
				if(req.session.user)
				{
					usr = req.session.user;
				}
				else
				{
					usr = '';
				}
				
				res.render('pages/rooms', 
				{
					rooms: items,
					tagline: tagline,
					userName: usr
				});
			  });
		});
});

// index page 
app.get('/', function(req, res) {
	res.render('pages/index');
});

// about page 
app.get('/about', function(req, res) {
	
	var usr;
				
	if(req.session.user)
	{
		usr = req.session.user;
	}
	else
	{
		usr = '';
	}
	
	res.render('pages/about',
	{
		userName : usr
	});
});

// login page
app.get('/login', function(req, res)
{
	var usr;
				
	if(req.session.user)
	{
		usr = req.session.user;
	}
	else
	{
		usr = '';
	}
	
	res.render('pages/login',
	{
		userName : usr,
		error : null
	});
});

app.get('/register', function(req,res)
{
	var usr;
				
	if(req.session.user)
	{
		usr = req.session.user;
	}
	else
	{
		usr = '';
	}
	
	res.render('pages/register',
	{
		userName : usr,
		error : null
	});
});

//logout page
app.get('/logout', function(req,res)
{
	req.session.user = '';
	res.render('pages/login',
	{
		userName : usr = '',
		error : null
	});
});

//Login post
app.post('/login', function(req, res){
	
	console.log('I got a request from: ' + req.body.user_name);
	req.session.user = req.body.user_name;
	
	console.log('Incomming auth request');
		
		var doAuth = require('./AuthenticationFunctions');
		
		doAuth.authenticate(req.body.user_name, req.body.password, MongoClient, function(err,user)
		{
			if(err)
			{
				if(err.message == 'db_error')
				{
					res.render('pages/login',
					{
						userName : '',
						error : 'Database Error (this is bad)'
					});
				}
				else if(err.message == 'refused_name')
				{
					res.render('pages/login',
					{
						userName : '',
						error : 'Username does not exist'
					});
				}
				else if(err.message == 'refused_password')
				{
					res.render('pages/login',
					{
						userName : '',
						error : 'Incorrect password'
					});
				}
			}
			else
			{
				if(user.success == 1)
				{
					console.log('User Authorized');
					//TODO: Render different page?
					res.render('pages/about',
						{
							userName : req.session.user
						});
				}
			}
		});
});

//Register post
app.post('/register', function(req, res){
	
	var userToCheck = req.body.user_name.toLowerCase();
	var passToinsert = req.body.password;
	var emailToInsert = req.body.email;
	
	if(userToCheck.length == 0 || passToinsert.length == 0 || emailToInsert.length == 0)
	{
		res.render('pages/register',
		{
			userName : '',
			error : 'You forgot to enter something...'
		});
	}
	else
	{
		MongoClient.connect('mongodb://alces2:stimperman@ds045531.mongolab.com:45531/alces', function(err,db)
			{
				if(err)
				{
					console.log('Database error');
					res.render('pages/register',
						{
							userName : '',
							error : 'Generic Database Error'
						});
				}
				
				else
				{
					console.log('Connection made with MongoDB user server');
					var collection = db.collection('usersAndroid');
					
					collection.findOne({name: userToCheck}, function(err, result)
					{
						if(err)
						{
							console.log(err.message);
							res.render('pages/register',
							{
								userName : '',
								error : 'Generic Error'
							});
						}
						
						else if(!result)
						{
							collection.insert({name: userToCheck, pass: passToinsert, email: emailToInsert}, function(err,result)
							{
								if(err)
								{
									console.log(err);
								}
								else
								{
									console.log('Inserted new user into the database.' + userToCheck);
									res.render('pages/login',
									{
										userName : '',
										error : 'User Created Successfully'
									});
								}
							});
						}
						else
						{
							res.render('pages/register',
							{
								userName : '',
								error : 'Username taken.'
							});
						}
					});
				}
			});
	}
});

console.log('Server is listening for webpages on 3000');
app.listen(3000);

//_users entries will contain: room,lat,lon
var _users = {};
var _rooms = {};

//Logic to handle all direct connections.
io.sockets.on('connection', function (socket) {

	//User obtains connection, a user is NOT authenticated at this point.
	console.log('User connection obatined.');
	
	//Can use this variable to determine who is authenticated.
	var authenticated = 0;
	var userName = '';
	var userID = '';
	//-1 means none
	var currentRoom = -1;
	var lat;
	var lon;
	
	//Verify the user's credentials. Doesn't do much right now, just make sure that the
	//username exists.
	socket.on('authenticate', function(authString)
	{	
		console.log('Incomming auth request');
		
		var doAuth = require('./AuthenticationFunctions');
		
		doAuth.authenticate(authString.name, authString.pass, MongoClient, function(err,res)
		{
			if(err)
			{
				if(err.message == 'db_error')
				{
					
				}
				else if(err.message == 'refused_name')
				{
					//User name does not exist in the database.
					socket.emit('refuse','Your credentials have been rejected. Incorrect user name.');
				}
				else if(err.message == 'refused_password')
				{
					socket.emit('refuse','Your credentials have been rejected. Incorrect password.');
				}
			}
			else
			{
				if(res.success == 1)
				{
					socket.emit('approve', 'Authentication string goes here!');
					authenticated = 1;
					userName = authString.name;
					userID = res.id;
					lat = authString.lat;
					lon = authString.lon;
					console.log('User has authenticated at: ' + lat +','+ lon);
					//_users keeps track of all connected users via their socket object.
					//This way we can emit to all users in a room.
					_users[socket] = {room:-1};
				}
			}
		});
	});
	
	//Creates a user in the database
	//currently not secure.
	socket.on('create', function(createString)
	{
		MongoClient.connect('mongodb://alces2:stimperman@ds045531.mongolab.com:45531/alces', function(err,db)
		{
			if(err)
			{
				socket.emit('refuse_reg', 'Refused: Database error');
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
						socket.emit('refuse_reg', 'Refused unspecified error');
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
								console.log('Inserted new user into the database. ' + createString.name);
								socket.emit('createsuccess','User created successfully');
							}
						});
					}
					else
					{
						socket.emit('refuse_reg', 'Refused: User name exists.');
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
	
	socket.on('get all rooms', function(args)
	{
		MongoClient.connect('mongodb://alces2:stimperman@ds045531.mongolab.com:45531/alces', function(err,db)
		{
			if(err)
			{
				console.log('Database error ' + error);
				//TODO: Replace 'error'. It's reserved.
				//socket.emit('error', 'Database error ' + error);
				socket.emit('error', 'Database error ' + error);
			}
			
			var collection = db.collection('roomsAndroid');
			
			collection.find().toArray(function(err, items) {
				//TODO: Add restriction based on private/public groups
				
				var itemsToReturn = [];
				
				items.forEach(function(entry) {
					//Check for lat-lon distances
					if(entry.range == -1)
					{
						itemsToReturn.push(entry);
					}
					else
					{
						var targetDistance = entry.range;
						//Calculate distance to target area. Needs to be within range.
						var distanceTo = distance(lat,lon,entry.originLat,entry.originLon,"M");
						if(distanceTo <= targetDistance)
						{
							itemsToReturn.push(entry);
						}
					}
				});
				
				if(err)
				{
					socket.emit('error', 'Connection error ' + error);
				}
				else
				{
					socket.emit('all rooms', itemsToReturn);
				}
			  });
		});
	});
	
	function distance(lat1, lon1, lat2, lon2, unit) {
		var radlat1 = Math.PI * lat1/180
		var radlat2 = Math.PI * lat2/180
		var radlon1 = Math.PI * lon1/180
		var radlon2 = Math.PI * lon2/180
		var theta = lon1-lon2
		var radtheta = Math.PI * theta/180
		var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
		dist = Math.acos(dist)
		dist = dist * 180/Math.PI
		dist = dist * 60 * 1.1515
		if (unit=="K") { dist = dist * 1.609344 }
		if (unit=="N") { dist = dist * 0.8684 }
		return dist
	}
	
	//Args are: roomName, private
	socket.on('create_room', function(args)
	{
		MongoClient.connect('mongodb://alces2:stimperman@ds045531.mongolab.com:45531/alces', function(err,db)
		{
			if(err)
			{
				console.log('Database error ' + error);
				socket.emit('refuse_room_create', 'Database error.');
			}
			
			var collection = db.collection('roomsAndroid');
			
			collection.find().toArray(function(err, items) {
				//assert.equal(null, err);
				//assert.equal(0, items.length);
				var uniqueName = 1;
				items.forEach(function(entry) {
				
					if(entry.room == args._room)
					{
						uniqueName = 0;
						console.log('room already exists');
					}
				});
				
				if(uniqueName == 1)
				{
					//Unique name create the room.
					collection.insert({creator : args._creator, room:args._room, isPrivate:args._isPrivate, range:args._range, originLat:lat, originLon:lon, permittedUsers:[{entry:userID}]}, function(err,result)
						{
							if(err)
							{
								console.log(err);
								//socket.emit('error', 'Recieved error: ' + err.toString());
								
								socket.emit('refuse_room_create', 'Recieved error: ' + err);
							}
							else
							{
								console.log('creating room...');
								socket.emit('room_create_success', 'successfully created frequency');
							}
						});
				}
				else
				{
					//Non-unique name. Emit proper exception.
					//TODO: Replace 'error' with something else. error seems to be reserved.
					//socket.emit('error', 'Room already exists');
				}
					socket.emit('refuse_room_create', 'Room already exists');
				});
			  });
		});
	
	
	//Args properties: roomName, roomId (derived from _id in mongo)
	socket.on('join_room', function(args)
	{
		if(authenticated)
		{
			console.log('User ' + userName + ' attempting to join room');
			//TODO: Double check that room exists.
			
			//TODO: Check to see if you're approved for that room.
			
			//Change rooms
			currentRoom = args.roomId;
			_users[socket] = {room:args.roomId};
			
			if(typeof _rooms[args.roomId] === "undefined")
			{
				console.log('room was not initialized');
				_rooms[args.roomId] = [{user : userID}];
			}
			else
			{
				_rooms[args.roomId].push({user : userID});
			}
			
			socket.emit('join_success', 'approved for join');
		}
		else
		{
			//TODO: need to re-auth.
			console.log('user needs to reauth');
			socket.emit('reauth', 'User needs to reauthenticate.');
		}
	});
	
	socket.on('leave_room', function (args)
	{
		if(authenticated)
		{
			currentRoom = -1;
			_users[socket] = {room:-1};
			//Little algorithm to remove a user from the _rooms argument list.
			for(var i = _rooms[args.roomId].length; i--;){
				if (_rooms[args.roomId][i].user == userID)
				{ 
					_rooms[args.roomId].splice(i, 1);
					console.log('Removing user from room');
				}
			}
		}
	});
	
	socket.on('broadcast to room', function (args)
	{
		if(authenticated)
		{
			_users.forEach(function(entry) {
				if(entry.room == currentRoom)
				{
					//Perform the data burst.
					entry.emit('broadcast', args);
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