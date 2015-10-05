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
						error : 'Database Error'
					});
				}
				else if(err.message == 'refused_name')
				{
					res.render('pages/login',
					{
						userName : '',
						error : 'Incorrect Name'
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
		
		var doAuth = require('./AuthenticationFunctions');
		
		doAuth.authenticate(authString.name, authString.pass, MongoClient, function(err,res)
		{
			//TODO: Finish refactoring.
			if(err)
			{
				if(err == 'db_error')
				{
					
				}
				else if(err == 'refused_name')
				{
					//User name does not exist in the database.
					socket.emit('refuse','Your credentials have been rejected. Incorrect user name.');
				}
				else if(err == 'refused_password')
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
				
				if(err)
				{
					socket.emit('error', 'Connection error ' + error);
				}
				else
				{
					socket.emit('all rooms', items);
				}
			  });
		});
	});
	
	//Args are: roomName, private
	socket.on('create room', function(args)
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
				var uniqueName = 1;
				items.forEach(function(entry) {
				
					if(entry.room == args.roomName)
					{
						uniqueName = 0;
						console.log('room already exists');
					}
				});
				
				if(uniqueName == 1)
				{
					//Unique name create the room.
					collection.insert({room : args.roomName, creator:userName, isPrivate:args.isPrivate}, function(err,result)
						{
							if(err)
							{
								console.log(err);
								//socket.emit('error', 'Recieved error: ' + err.toString());
								
								socket.emit('error', 'Recieved error: ' + err);
							}
							else
							{
								console.log('creating room...');
								socket.emit('room create success', 'successfully created room');
							}
						});
				}
				else
				{
					//Non-unique name. Emit proper exception.
					//TODO: Replace 'error' with something else. error seems to be reserved.
					//socket.emit('error', 'Room already exists');
				}
					socket.emit('error', 'Room already exists');
				});
			  });
		});
	
	
	//Args properties: roomName, roomId (derived from _id in mongo)
	socket.on('join room', function(args)
	{
		if(authenticated)
		{
			//TODO: Double check that room exists.
			
			//TODO: Check to see if you're approved for that room.
			
			//Change rooms
			currentRoom = args.roomId;
			_users[socket] = {room:roomId};
			//TODO: Emit success/failure.
		}
		else
		{
			//TODO: need to re-auth.
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