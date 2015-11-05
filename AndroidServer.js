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
	//Old database: mongodb://alces2:stimperman@ds045531.mongolab.com:45531/alces
	MongoClient.connect('mongodb://localhost', function(err,db)
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
	MongoClient.connect('mongodb://localhost', function(err,db)
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
		MongoClient.connect('mongodb://localhost', function(err,db)
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
	var debug = true;
	
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
					userID = res.id.id;
					lat = authString.lat;
					lon = authString.lon;
					console.log('User has authenticated at: ' + lat +','+ lon);
					//_users keeps track of all connected users via their socket object.
					//This way we can emit to all users in a room.
					_users[userID] = {room:-1, id:socket.id};
				}
			}
		});
	});
	
	//Creates a user in the database
	//currently not secure.
	socket.on('create', function(createString)
	{
		//MongoClient.connect('mongodb://localhost', function(err,db)
		MongoClient.connect('mongodb://localhost', function(err,db)
		{
			if(err)
			{
				socket.emit('refuse_reg', 'Refused: Database error');
				console.log('Database error: ' + err);
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
	
	socket.on('reauth', function(args)
	{
		if(authenticated == 0 || debug)
		{
			
			MongoClient.connect('mongodb://localhost', function(err,db)
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
				
				collection.findOne({name: args.name}, function(err, result)
				{
					if(err)
					{
						console.log(err);
						socket.emit('refuse_reauth', 'Refused unspecified error');
					}
					
					else if(!result)
					{
						//How did a user that didn't exist ask for reauth? Reject them.
						socket.emit('refuse_reauth', 'Refused because you do not exist.');
					}
					else
					{
						//Found it.
						
						userID = result._id.id;
						userName = args.name;
						lat = args.lat;
						lon = args.lon;
						authenticated = 1;
						_users[userID] = {room:-1, id:socket.id};
						
						if(args.roomId)
						{
							//User was in a room when they disconned.
							currentRoom = args.roomId;
							_users[userID] = {room:args.roomId, id:socket.id};
							
							if(typeof _rooms[args.roomId] === "undefined")
							{
								console.log('room was not initialized');
								_rooms[args.roomId] = [{user : userID, name:userName}];
							}
							else
							{
								_rooms[args.roomId].push({user : userID, name:userName});
							}
						}
						
						socket.emit('reauth_success', 'Successfully reauthenticated');
						console.log('User reauthed successfully');
					}
				});
			}
		});
		}
		else
		{
			//No need
			console.log("User reauthed when they didn't need to. Weird");
		}
	});
	
	socket.on('exit', function (name)
	{
		if(authenticated == 1)
		{
			var tmpRoom = currentRoom;
			console.log(name, ' has disconected.');
			delete _users[userID];
			currentRoom = -1;
			_users[userID] = {room:-1, id:socket.id};
			
			if(typeof _rooms[tmpRoom] != "undefined")
			{
				for(var i = _rooms[tmpRoom].length; i--;){
					if (_rooms[tmpRoom][i].user == userID)
					{ 
						_rooms[tmpRoom].splice(i, 1);
						console.log('Removing user from room');
					}
				}
			}
			
			//Emit room leave.
			for(var key in _users)
			{
				if(_users[key].room == tmpRoom & io.sockets.connected[_users[key].id] != null && key != userID)
				{
					io.sockets.connected[_users[key].id].emit('room_users_change', _rooms[tmpRoom]);
				}
			}
		}
	});
	
	socket.on('disconnect', function (args)
	{
		if(authenticated == 1)
		{
			var tmpRoom = currentRoom;
			console.log('Removing user from the users array');
			delete _users[userID];
			currentRoom = -1;
			_users[userID] = {room:-1, id:socket.id};
			
			
			if(typeof _rooms[tmpRoom] != "undefined")
			{
				for(var i = _rooms[tmpRoom].length; i--;){
					if (_rooms[tmpRoom][i].user == userID)
					{ 
						_rooms[tmpRoom].splice(i, 1);
						console.log('Removing user from room');
					}
				}
			}
			
			//Emit room leave.
			for(var key in _users)
			{
				if(_users[key].room == tmpRoom & io.sockets.connected[_users[key].id] != null && key != userID)
				{
					io.sockets.connected[_users[key].id].emit('room_users_change', _rooms[tmpRoom]);
				}
			}
		}
	});
	
	socket.on('get all rooms', function(args)
	{
		if(authenticated == 0)
		{
			//Reauth
			socket.emit('reauth', 'User needs to reauthenticate');
		}
		else
		{
			MongoClient.connect('mongodb://localhost', function(err,db)
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
						
						entry._id = entry._id.id;
						
						if(typeof _rooms[entry._id] === "undefined")
						{
							entry.numUsers = 0;
						}
						else
						{
							entry.numUsers = _rooms[entry._id].length;
						}
						
						//Check for lat-lon distances
						if(entry.range == -1 && contains(entry.permittedUsers, userID, entry.isPrivate))
						{
							itemsToReturn.push(entry);
						}
						else
						{
							var targetDistance = entry.range;
							//Calculate distance to target area. Needs to be within range.
							var distanceTo = distance(lat,lon,entry.originLat,entry.originLon,"M");
							if(distanceTo <= targetDistance && contains(entry.permittedUsers, userID, entry.isPrivate))
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
		}
	});
	
	function contains(collection, toMatch, priv)
	{
		if(priv == 1)
		{
			var toReturn = false;
			for( i = 0; i < collection.length; i++)
			{
				if(collection[i].userID == toMatch)
				{
					toReturn = true;
				}
			}
			
			return toReturn;
		}
		else
		{
			return true;
		}
	}
	
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
		if(authenticated == 0)
		{
			//Reauth
			socket.emit('reauth', 'User needs to reauth');
		}
		else
		{
			MongoClient.connect('mongodb://localhost', function(err,db)
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
						collection.insert({creator : args._creator, room:args._room, isPrivate:args._isPrivate, range:args._range, originLat:lat, originLon:lon, permittedUsers:[{userID:userID, userName:userName}]}, function(err,result)
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
		}
		});

	var ObjectId = require('mongodb').ObjectID;
	//Args are: roomName, private
	socket.on('update_room', function(args)
	{
		if(authenticated == 0)
		{
			//Reauth
			socket.emit('reauth', 'User needs to reauthenticate');
		}
		else
		{
			MongoClient.connect('mongodb://localhost', function(err,db)
			{
				if(err)
				{
					console.log('Database error ' + error);
					socket.emit('refuse_update_room', 'Database error.');
				}
				
				db.collection( 'roomsAndroid' ).updateOne (
					{_id:new ObjectId(args._id)},
					{$set: {room:args.room,
							isPrivate:args.isPrivate,
							range:args.range,
							originLat:args.originLat,
							originLon:args.originLon,
							permittedUsers:args.permittedUsers
							}},
					function( err, result ) {
						if ( err )
						{
							socket.emit('refuse_update_room', 'Error updating entry');
						}
						else
						{
							socket.emit('success_update_room', 'Room was updated.');
							console.log('Updated room.');
						}
					}
				);
				
				  });
			}
		});
		
	socket.on('delete_room', function(args)
	{
		if(authenticated == 0)
		{
			//Reauth
			socket.emit('reauth', 'User needs to reauthenticate');
		}
		else
		{
			MongoClient.connect('mongodb://localhost', function(err,db)
			{
				if(err)
				{
					console.log('Database error ' + error);
					socket.emit('refuse_delete_room', 'Database error.');
				}
				
				db.collection( 'roomsAndroid' ).deleteOne (
					{_id:new ObjectId(args._id)},
					function( err, result ) {
						console.log(result);
						if ( err )
						{
							socket.emit('refuse_delete_room', 'Error updating entry');
						}
						else
						{
							socket.emit('success_delete_room', 'Room was deleted.');
							console.log('Deleted room.');
						}
					}
				);
				
				  });									
		}
		});
	
	
	//Args properties: roomName, roomId (derived from _id in mongo)
	socket.on('join_room', function(args)
	{
		if(authenticated)
		{
			console.log('User ' + userName + ' attempting to join room');
			var canEdit = false;
			
			MongoClient.connect('mongodb://localhost', function(err,db)
			{
				if(err)
				{
					socket.emit('refuse_join', 'Refused: Database error');
					console.log('Database error');
				}
				
				else
				{
					console.log('Connection made with MongoDB user server');
					var collection = db.collection('roomsAndroid');
					
					collection.findOne({_id: new ObjectId(args.roomId)}, function(err, result)
					{
						console.log('DEBUG: found that room you wanted bro');
						if(err)
						{
							//TODO: Handle error.
						}
						else if(result)
						{
							if(userName == result.creator)
							{
								canEdit = true;
								console.log('DEBUG: you can edit this room too cool');
							}
							
							//TODO: Return information about if user is authed to edit frequency.
			
							//TODO: Check to see if you're approved for that room.
							
							//Change rooms
							currentRoom = args.roomId;
							_users[userID] = {room:args.roomId, id:socket.id};
							
							if(typeof _rooms[args.roomId] === "undefined")
							{
								console.log('room was not initialized');
								_rooms[args.roomId] = [{user : userID, name:userName}];
							}
							else
							{
								_rooms[args.roomId].push({user : userID, name:userName});
							}
							socket.emit('join_success', {perms:canEdit, msg:'approved for join'});
							
							//Emit room join.
							for(var key in _users)
							{
								if(_users[key].room == currentRoom & io.sockets.connected[_users[key].id] != null && key != userID)
								{
									io.sockets.connected[_users[key].id].emit('room_users_change', _rooms[args.roomId]);
								}
							}
						}
						else
						{
							//TODO: Handle no room found case.
						}
					});
				}
			});
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
			var tmpRoom = currentRoom;
			currentRoom = -1;
			_users[userID] = {room:-1, id:socket.id};
			//Little algorithm to remove a user from the _rooms argument list.
			for(var i = _rooms[args.roomId].length; i--;){
				if (_rooms[args.roomId][i].user == userID)
				{ 
					_rooms[args.roomId].splice(i, 1);
					console.log('Removing user from room');
				}
			}
			
			//Emit room leave.
			for(var key in _users)
			{
				if(_users[key].room == tmpRoom & io.sockets.connected[_users[key].id] != null && key != userID)
				{
					io.sockets.connected[_users[key].id].emit('room_users_change', _rooms[tmpRoom]);
				}
			}
		}
		else
		{
			//reauth
			socket.emit('reauth', 'User needs to reauthenticate');
		}
	});
	
	socket.on('request_all_users_room', function(args)
	{
		if(authenticated)
		{
			socket.emit('room_users_change', _rooms[currentRoom]);
		}
		else
		{
			socket.emit('reauth', 'User needs to reauthenticate');
		}
	});
	
	socket.on('request_all_users', function(args)
	{
		if(authenticated)
		{
			MongoClient.connect('mongodb://localhost', function(err,db)
			{
				var toReturn = [];
				
				if(err)
				{
					console.log('Database error');
					//TODO: Add return generic error.
				}
				else
				{
					console.log('Connection made with MongoDB user server');
						var collection = db.collection('usersAndroid');
						
						collection.find().toArray(function(err, items) {
						if(err)
						{
							console.log('oops ' + err);
						}
						//Build a list with all our users.
						items.forEach(function(entry) {
							toReturn.push({name:entry.name, user:entry._id.id});
						});
						//We're emitting the full list. Let the client side filter this list based on their input.
						console.log('Emitting full user list of size: ' + toReturn.length);
						socket.emit('request_all_users', toReturn);
					});
				}
			});
		}
		else
		{
			socket.emit('reauth', 'User needs to reauthenticate');
		}
	});
	
	socket.on('new_message', function (args)
	{
		if(authenticated)
		{
			for(var key in _users)
			{
				if(_users[key].room == currentRoom & io.sockets.connected[_users[key].id] != null)
				{
					io.sockets.connected[_users[key].id].emit('new_message', {message:args.message, user:args.user, id:userID});
				}
			}
		}
		else
		{
			//reauth
			socket.emit('reauth', 'User needs to reauthenticate');
		}
	});
	
	//args: 
	socket.on('broadcast', function (args)
	{
		console.log('Making a broadcast');
		if(authenticated)
		{
			//Javascript foreach look aw yea.
			for(var key in _users)
			{
				if(_users[key].room == currentRoom & io.sockets.connected[_users[key].id] != null && key != userID)
				{
					io.sockets.connected[_users[key].id].emit('broadcast', {user:userName, id:userID, payload:args});
				}
			}
		}
		else
		{
			//reauth
			socket.emit('reauth', 'User needs to reauthenticate');
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