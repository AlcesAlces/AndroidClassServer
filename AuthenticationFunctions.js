module.exports.authenticate = function(name, pass, MongoClient, fn) {
  
  MongoClient.connect('mongodb://alces2:stimperman@ds045531.mongolab.com:45531/alces', function(err,db)
		{
			if(err)
			{
				return fn(new Error('db_error'));
			}
			
			else
			{
				console.log(name +' is attempting to auth.');
				//Should be able to swap out this mongo connection for any other kind of DB.
				var collection = db.collection('usersAndroid');
				
				collection.findOne({name: name}, function(err, result)
				{
					if(err)
					{
						console.log(err);
						return fn(new Error('db_error'));
					}
					
					else if(!result)
					{
						//User name does not exist in the database.
						return fn(new Error('refused_name'));
						console.log('User was rejected for bad credentials');
					}
					
					//User is found in the log, do auth.
					else
					{
						console.log('Found user: ' + result.name + '. Doing Auth');
						
						//Basic auth.
						if(result.pass == pass)
						{
							console.log('User ' + name + ' has been authorized');
							//_users keeps track of all connected users via their socket object.
							//This way we can emit to all users in a room.
							return fn(null,{success:1, id:result._id});
						}
						
						else
						{
							console.log('User ' + name + ' has been rejected for incorrect password');
							return fn(new Error('refused_password'));
						}
					}
				});
			}
		});
  
  /*
  var user = users[name];
  // query the db for the given username
  if (!user) return fn(new Error('cannot find user'));
  // apply the same algorithm to the POSTed password, applying
  // the hash against the pass / salt, if there is a match we
  // found the user
  hash(pass, user.salt, function(err, hash){
    if (err) return fn(err);
    if (hash == user.hash) return fn(null, user);
    fn(new Error('invalid password'));
  });
  */
}