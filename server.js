var http = require('http');
var url = require('url');
var fs = require('fs');
var formidable = require('formidable');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var ExifImage = require('exif').ExifImage;
var express = require('express');
var session = require('cookie-session');
var bodyParser = require('body-parser');
var app = express();

var server = http.createServer(app);
app.set('view engine','ejs');

var mongourl = 'mongodb://cheungtimfat:y4364935@ds141464.mlab.com:41464/cheungtimfat';
var SECRETKEY1 = 'Random String';
var SECRETKEY2 = 'key';
var users = new Array(
	{name: 'developer', password: 'developer'},
	{name: 'demo', password: ''}
);

app.use(session({
  name: 'session',
  keys: [SECRETKEY1,SECRETKEY2]
}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/',function(req,res) {
	console.log(req.session);
	if (!req.session.authenticated) {
		res.redirect('/login');
	} else {
		res.status(200);
		res.render('secrets',{name:req.session.username});
	}
});

app.get('/login',function(req,res) {
	res.sendFile(__dirname + '/public/login.html');
});

app.post('/login',function(req,res) {
	for (var i=0; i<users.length; i++) {
		if (users[i].name == req.body.name &&
		    users[i].password == req.body.password) {
			req.session.authenticated = true;
			req.session.username = users[i].name;
		}
	}
	res.redirect('/read');
});

app.get('/logout',function(req,res) {
	req.session = null;
	res.redirect('/');
});
//editing
app.use(function(req,res){
    console.log("INCOMING REQUEST: " + req.method + " " + req.url);

    var parseURL = url.parse(req.url, true);
    var queryAsObject = parseURL.query;

    switch(parseURL.pathname){
        case '/read':
            var max = (queryAsObject.max) ? Number(queryAsObject.max) : 20;
	    console.log('/read = ' + max);
	    read_n_print(req,res,{},max);
            break;
        case '/new':
            console.log('/new ' + JSON.stringify(queryAsObject));
	    sendNewForm(req,res,queryAsObject);
            break;
        case "/display":
            console.log('/display ' + queryAsObject._id);
            displayRestaurant(res, queryAsObject._id);
            break;
        case "/rate" :
            console.log('/rate ' + queryAsObject._id);
            rateForm(req,res, queryAsObject._id);
            break;
        case '/change':
            console.log('/change ' + JSON.stringify(queryAsObject));
	    sendUpdateForm(req,res,queryAsObject);
            break;
        case '/remove':
	    var criteria = {};
	    for (var key in queryAsObject) {
		criteria[key] = queryAsObject[key];
	    }
	    console.log('/delete '+JSON.stringify(criteria));
	    remove(res,criteria);
	    break;
        case '/create':
            var form = new formidable.IncomingForm();
            form.parse(req, function (err, fields, files) {
            console.log(JSON.stringify(files));
            var filename = files.filetoupload.path;
            var mimetype = files.filetoupload.type;
            fs.readFile(filename, function(err,data) {
                MongoClient.connect(mongourl,function(err,db) {
                var new_r = {};
                if (queryAsObject.id) new_r['id'] = queryAsObject.id;
	        if (queryAsObject.name) new_r['name'] = queryAsObject.name;
	        new_r['borough'] = queryAsObject.borough;
	        new_r['cuisine'] = queryAsObject.cuisine;
	        //if (queryAsObject.building || queryAsObject.street || queryAsObject.zipcode || queryAsObject.coord) {
	        var address = {};
	        address['building'] = queryAsObject.building;
                address['street'] = queryAsObject.street;
                address['zipcode'] = queryAsObject.streetcoord;
                address['coord_lon'] = queryAsObject.coord_lon;
                address['coord_lat'] = queryAsObject.coord_lat;
                new_r['address'] = address;
	        //}
                if (queryAsObject.cuisine) new_r['owmer'] = req.session.username;
                new_r['photo'] = new Buffer(data).toString('base64');
                new_r['mimetype'] = mimetype;
                console.log('About to insert: ' + JSON.stringify(new_r));
                MongoClient.connect(mongourl,function(err,db) {
		    assert.equal(err,null);
		    console.log('Connected to MongoDB\n');
		    insertRestaurant(db,new_r,function(result) {
			db.close();
			console.log(JSON.stringify(result));
			res.writeHead(200, {"Content-Type": "text/plain"});
			res.write(JSON.stringify(new_r));
			res.end("\ninsert was successful!");
		})
	});
});
});
});
	    console.log('/Create qsp = ' + JSON.stringify(queryAsObject));
	    break;
        case '/updaterate':
	    console.log('/Create qsp = ' + JSON.stringify(queryAsObject));
	    updaterate(req, res,queryAsObject);
	    break;
        case '/edit':
	    console.log('/Create qsp = ' + JSON.stringify(queryAsObject));
	    update(req, res,queryAsObject);
	    break;
        case '/register':
				console.log('About to update ' + JSON.stringify(queryAsObject));
				MongoClient.connect(mongourl,function(err,db) {
					assert.equal(err,null);
					console.log('Connected to MongoDB\n');
					var new_r = {};
				        if (req.name) new_r['name'] = req.name;
			                if (req.password == req.password2 ) {
			                    new_r['password'] = req.password;
			                }else {
			                    console.log('Two password are different!');
			                }

					insertUser(db,new_r,function(result) {
						db.close();
						res.writeHead(200, {"Content-Type": "text/plain"});
						res.end("update was successful!");
					});
				});
            break;
        case '/createUser':
            console.log('/createUser ' + JSON.stringify(queryAsObject));
	    createUser(req,res,queryAsObject);
            break;
        case '/login':
            console.log('/login ' + JSON.stringify(queryAsObject));
	    login(req,res,queryAsObject);
            break;
        default:
	    res.writeHead(404, {"Content-Type": "text/plain"});
	    res.write("404 Not Found\n");
	    res.end();
    }
});

function read_n_print(req,res,criteria,max) {
    MongoClient.connect(mongourl, function(err, db) {
    assert.equal(err,null);
    console.log('Connected to MongoDB\n');
    findRestaurants(db,criteria,max,function(restaurants) {
    db.close();
    console.log('Disconnected MongoDB\n');
    if (restaurants.length == 0) {
	res.writeHead(500, {"Content-Type": "text/plain"});
	res.end('Not found!');
	} else {
	res.writeHead(200, {"Content-Type": "text/html"});
	res.write('<html><head><title>Restaurant</title></head>');
	res.write('<body><H1>Restaurants</H1>');
        res.write('<H2>User :  '+ req.session.username +'</H2>');
	res.write('<H2>Showing '+restaurants.length+' document(s)</H2>');
        res.write('<a href=/new>Create New Restaurant</a>');
	res.write('<ol>');
	for (var i in restaurants) {
	    res.write('<li><a href=/display?_id='+ restaurants[i]._id+'>'+restaurants[i].name+'</a></li>');
	}
	res.write('</ol>');
	res.end('</body></html>');
	return(restaurants);
	    }
	});
    });
}

function sendNewForm(req,res,queryAsObject) {
	res.writeHead(200, {"Content-Type": "text/html"});
	res.write('<html><title>'+queryAsObject.name+'</title>');
	res.write('<body>');
	res.write("<form id='details' method='POST' action='/create'>");
	res.write('<input type="hidden" name="_id" value="'+queryAsObject._id+'"><br>');
        res.write('<input type="hidden" name="owner" value="'+req.session.username+'"><br>');
	res.write('Name: <input type="text" name="name" ><br>');
	res.write('Borough: <input type="text" name="borough" ><br>');
	res.write('Cuisine: <input type="text" name="cuisine"  ><br>');
	res.write('Address<br>')
	res.write('Building: <input type="text" name="address.building"  ><br>');
	res.write('Street: <input type="text" name="address.street"  ><br>');
        res.write('Zipcode: <input type="text" name="address.zipcode"  ><br>');
        res.write('GPS Coordinates (lon.): <input type="text" name="address.coord_lon"  ><br>');
        res.write('GPS Coordinates (lat.)): <input type="text" name="address.coord_lat"  ><br>');
        res.write('Photo : <input type="file" name="filetoupload"><br>');
	res.write('</form>')
	res.write('<script>');
	res.write('function goBack() {window.history.back();}');
	res.write('</script>');
	res.write('<button type="submit" form="details">Create</button>');
	res.write('<button onclick="goBack()">Go Back</button>');
        res.end('</body></html>');
}

/*function create(req,res,queryAsObject,files) {
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
        var filename = files.filetoupload.path;
        var mimetype = files.filetoupload.type;
        fs.readFile(filename, function(err,data) {
        var filename = files.filetoupload.path;
	var new_r = {};	// document to be inserted
	if (queryAsObject.id) new_r['id'] = queryAsObject.id;
	if (queryAsObject.name) new_r['name'] = queryAsObject.name;
	new_r['borough'] = queryAsObject.borough;
	new_r['cuisine'] = queryAsObject.cuisine;
	if (queryAsObject.building || queryAsObject.street || queryAsObject.zipcode || queryAsObject.coord) {
	    var address = {};
	    address['building'] = queryAsObject.building;
            address['street'] = queryAsObject.street;
            address['zipcode'] = queryAsObject.streetcoord;
            address['coord_lon'] = queryAsObject.coord_lon;
            address['coord_lat'] = queryAsObject.coord_lat;
            new_r['address'] = address;
	}
        if (queryAsObject.cuisine) new_r['owmer'] = req.session.username;

                new_r['photo'] = new Buffer(queryAsObject.filetoupload).toString('base64');
                new_r['mimetype'] = queryAsObject.filetoupload.type;

	console.log('About to insert: ' + JSON.stringify(new_r));

	MongoClient.connect(mongourl,function(err,db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		insertRestaurant(db,new_r,function(result) {
			db.close();
			console.log(JSON.stringify(result));
			res.writeHead(200, {"Content-Type": "text/plain"});
			res.write(JSON.stringify(new_r));
			res.end("\ninsert was successful!");
		});
	});
    }
    }
}*/
function displayRestaurant(res,id) {
	MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		db.collection('restaurants').
			findOne({_id: ObjectId(id)},function(err,doc) {
				assert.equal(err,null);
				db.close();
				console.log('Disconnected from MongoDB\n');
				res.writeHead(200, {"Content-Type": "text/html"});
				res.write('<html><title>'+doc.name+'</title>');
				res.write('<body>');
				res.write("<form id='details' method='GET' action='/edit'>");
				res.write('<input type="hidden" name="_id" value="'+doc._id+'"><br>');
				res.write('Name: <input type="text" name="name" value="'+doc.name+'" readonly><br>');
				res.write('Borough: <input type="text" name="borough" value="'+doc.borough+'" readonly><br>');
				res.write('Cuisine: <input type="text" name="cuisine" value="'+doc.cuisine+'" readonly><br>');
				res.write('Address:<br>')
				res.write('<input type="text" name="building" value="'+doc.address.building+'" readonly>');
				res.write(', ');
				res.write('<input type="text" name="street" value="'+doc.address.street+'" readonly><br>');
				res.write('</form>')
				res.write('<script>');
				res.write('function goBack() {window.history.back();}');
				res.write('</script>');
				res.write('<button type="submit" form="details" value="Edit">Edit</button>');
				res.end('<button onclick="goBack()">Go Back</button>');
		});
	});
}
/*
function displayRestaurant(res,id) {
	MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		db.collection('restaurants').
			findOne({_id: ObjectId(id)},function(err,doc) {
				assert.equal(err,null);
				db.close();
                                var image = new Buffer(doc.photo.image,'base64');
				console.log('Disconnected from MongoDB\n');
				res.writeHead(200, {"Content-Type": "text/html"});
				res.write('<html><title>'+doc.name+'</title>');
				res.write('<body>');

                                var image = new Buffer(doc.photo,'base64');
                                res.write('<img src="data:'+ doc.mimetype+';base64, '+ doc.image+'">');

				res.write('Borough: '+doc.borough+'<br>');
				res.write('Cuisine: '+doc.cuisine+'<br>');
				res.write('Address:<br>')
				res.write('Building : '+doc.address.building+'<br>');
				res.write(', ');
				res.write('Street : '+doc.address.street+'<br>');
                                res.write('Zipcode: '+doc.address.zipcode+'<br>');
                                res.write('GPS : ['+doc.address.coord_lon+','+doc.address.coord_lat+']<br>');
                                res.write('<button type="submit" form="details" value="Edit">Edit</button>');
				res.write('</form>');

                                //google map
                                res.write('<script>');
                                function initMap() {
                                    var uluru = {lon:doc.address.coord_lon,lat:doc.address.coord_lat};
                                    var map = new google.maps.Map(document.getElementById('map'), {
                                        zoom: 4,
                                        center: uluru
                                    });
                                    var marker = new google.maps.Marker({
                                        position: uluru,
                                        map: map
                                    });
                                }
                                res.write('</script>');
                                res.write('<script async defer src="https://maps.googleapis.com/maps/api/js?key=AIzaSyCpJz36Cq4KPfeYQrzICflT3nAzw-OdA3A&callback=initMap">');
                                res.write('</script>');

				res.write('<script>');
				res.write('function goBack() {window.history.back();}');
				res.write('</script>');

                                if (doc.owner != req.session.username){
                                res.write("<form method='POST' action='/rate'>");
                                res.write('<input type="hidden" name="_id" value="'+doc._id+'"><br>');
                                res.write('<button type="submit" value="Rate">Rate</button>');
                                res.write('</form>');
                                }
                                if (doc.owner == req.session.username){
                                res.write("<form method='POST' action='/change'>");
                                res.write('<input type="hidden" name="_id" value="'+doc._id+'"><br>');
                                res.write('<button type="submit" value="Edit">Edit</button>');
                                res.write('</form>');
                                res.write("<form method='POST' action='/remove'>");
                                res.write('<input type="hidden" name="_id" value="'+doc._id+'"><br>');
                                res.write('<button type="submit" value="Delete">Delete</button>');
                                res.write('</form>');
                                }
				res.end('<button onclick="goBack()">Go Back</button>');
		});
	});
}
*/
function rateForm(req,res,id, queryAsObject) {
    MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		db.collection('restaurants').
			findOne({_id: ObjectId(id)},function(err,doc) {
				assert.equal(err,null);
				db.close();
                                console.log('Disconnected from MongoDB\n');
	                        res.writeHead(200, {"Content-Type": "text/html"});
	                        res.write('<html><title>'+Rate+'</title>');
	                        res.write('<body>');
                                if (doc.grades.user != req.session.username){
	                        res.write("<form method='POST' action='/updaterate'>");
	                        res.write('<input type="hidden" name="_id" value="'+doc._id+'"><br>');
                                res.write('<input type="hidden" name="grade.user" value="'+req.session.username+'"><br>');
	                        res.write('Score (1-10): <input type="text" name="grade.score"><br>');
	                        res.write('<button type="submit" form="details">Rate</button>');
	                        res.end('<button onclick="goBack()">Go Back</button>');
                                } else {
                                    res.write('Yor are the owner!');
	                            res.end('<button onclick="goBack()">Go Back</button>');
                                }
                            });
                        });



function updaterate(req,res,queryAsObject) {
	var new_r = {};	// document to be inserted
        if (queryAsObject.id) new_r['id'] = queryAsObject.id;
            var grades = {};
	    if (queryAsObject.user) grades['user'] = queryAsObject.user;
            if (queryAsObject.score > 0 && queryAsObject.score <= 10) grades['score'] = queryAsObject.score;
            new_r['grades'] = grades;
        }
	console.log('About to insert: ' + JSON.stringify(new_r));

	MongoClient.connect(mongourl,function(err,db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		insertRestaurant(db,new_r,function(result) {
			db.close();
			console.log(JSON.stringify(result));
			res.writeHead(200, {"Content-Type": "text/plain"});
			res.write(JSON.stringify(new_r));
			res.end("\ninsert was successful!");
		});
	});


function sendUpdateForm(req,res,queryAsObject) {
	MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		db.collection('restaurants').
			findOne({_id: ObjectId(id)},function(err,doc) {
				assert.equal(err,null);
				db.close();
				console.log('Disconnected from MongoDB\n');
				res.writeHead(200, {"Content-Type": "text/html"});
				res.write('<html><title>'+doc.name+'</title>');
				res.write('<body>');
                                if (doc.owner == req.session.username){
				    res.write("<form method='GET' action='/create'>");
				    res.write('<input type="hidden" name="_id" value="'+doc._id+'"><br>');
				    res.write('Name: <input type="text" name="name" value="'+doc.name+'" readonly><br>');
				    res.write('Borough: <input type="text" name="borough" value="'+doc.borough+'" readonly><br>');
				    res.write('Cuisine: <input type="text" name="cuisine" value="'+doc.cuisine+'" readonly><br>');
				    res.write('Address:<br>')
				    res.write('Building : <input type="text" name="building" value="'+doc.address.building+'" readonly><br>');
				    res.write('Street : <input type="text" name="street" value="'+doc.address.street+'" readonly><br>');
                                    res.write('Zipcode: <input type="text" name="address.zipcode" value="'+doc.address.zipcode+'" readonly><br>');
                                    res.write('GPS Coordinates (lon.): <input type="text" name="address.coord_lon" value="'+ doc.address.coord_lon +'" readonly> ><br>');
                                    res.write('GPS Coordinates (lat.): <input type="text" name="address.coord_lat" value="'+ doc.address.coord_lat +'" readonly> ><br>');
                                    res.write('Photo : <input type="file" name="filetoupload"><br>');
                                    res.write('<button type="submit" form="details" value="Edit">Edit</button>');
			            res.write('</form>')
				    res.write('<script>');
				    res.write('function goBack() {window.history.back();}');
				    res.write('</script>');
                                    res.end('<body></html>');
                                } else {
                                    res.write("<H1>Error</H1>");
                                    res.write("You are not authorized to edit!!! ");
                                    res.write('<button onclick="goBack()">Go Back</button>');
                                    res.end('<body></html>');
                                }

		});
	});
}
}
/*
function update(req, res,queryAsObject) {
	console.log('About to update ' + JSON.stringify(queryAsObject));
	MongoClient.connect(mongourl,function(err,db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
                var criteria = {};
		criteria['_id'] = ObjectId(queryAsObject._id);
		var new_r = {};
	        if (queryAsObject.id) new_r['id'] = queryAsObject.id;
	        if (queryAsObject.name) new_r['name'] = queryAsObject.name;
	         new_r['borough'] = queryAsObject.borough;
	         new_r['cuisine'] = queryAsObject.cuisine;
	        var address = {};
	         address['building'] = queryAsObject.building;
                 address['street'] = queryAsObject.street;
                 address['zipcode'] = queryAsObject.streetcoord;
                 address['coord_lon'] = queryAsObject.coord_lon;
                 address['coord_lat'] = queryAsObject.coord_lat;
                new_r['address'] = address;
	        }
                new_r['photo'] = new Buffer(queryAsObject.data).toString('base64');
                new_r['mimetype'] = queryAsObject.mimetype;

		console.log('Preparing update: ' + JSON.stringify(newValues));
		updateRestaurant(db,criteria,new_r,function(result) {
			db.close();
			res.writeHead(200, {"Content-Type": "text/plain"});
			res.end("update was successful!");
		});
	});
}
*/
function remove(req, res,criteria) {
	console.log('About to delete ' + JSON.stringify(criteria));
	MongoClient.connect(mongourl,function(err,db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		deleteRestaurant(db,criteria,function(result) {
			db.close();
			console.log(JSON.stringify(result));
			res.writeHead(200, {"Content-Type": "text/plain"});
			res.end("delete was successful!");
		});
	});
}

function createUser(req, res,queryAsObject) {
	console.log('About to update ' + JSON.stringify(queryAsObject));
	res.writeHead(200, {"Content-Type": "text/html"});
  res.write('<html><title>Register</title>');
  res.write('<body>');
  res.write("<form id='details' method='POST' action='/register'>");
  res.write('User name: <input type="text" name="name" ><br>');
  res.write('Password: <input type="text" name="password" ><br>');
  res.write('Confirm password : <input type="text" name="password2" ><br>');
  res.write('</form>');
  res.write('<button type="submit" form="details">Submit</button>');
  res.end('</body></html>');
}

function login(req, res,queryAsObject) {
	MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
                var new_r = {};
                if (queryAsObject.name) new_r['name'] = queryAsObject.name;
                if (queryAsObject.password) new_r['password'] = queryAsObject.password;
                findUser(db,new_r,function(user) {
                    db.close();
                    if (new_r['name'] == user.name && new_r['password'] == user.password){
                        req.session.authenticated = true;
                        req.session.username = user.name;
                        res.redirect('/read');
                    } else if (new_r['password'] == user.password){
                        res.writeHead(200, {"Content-Type": "text/plain"});
			res.end("Wrong password");
                        res.redirect('/public/index.html');
                    }
		});
	})
}

function findUser(db,new_r,callback) {
	var users = [];
	 ursor = db.collection('user').find(new_r['name']);
	cursor.each(function(err, doc) {
		assert.equal(err, null);
		if (doc != null) {
			user.push(doc);
		} else {
			res.writeHead(200, {"Content-Type": "text/plain"});
			res.end("No this user!");
		}
	});
}

function insertUser(db,r,callback) {
	db.collection('users').insertOne(r,function(err,result) {
		assert.equal(err,null);
		console.log("Insert was successful!");
		callback(result);
	});
}


function findRestaurants(db,criteria,max,callback) {
	var restaurants = [];
	if (max > 0) {
		cursor = db.collection('restaurants').find(criteria).limit(max);
	} else {
		cursor = db.collection('restaurants').find(criteria);
	}
	cursor.each(function(err, doc) {
		assert.equal(err, null);
		if (doc != null) {
			restaurants.push(doc);
		} else {
			callback(restaurants);
		}
	});
}

function insertRestaurant(db,r,callback) {
	db.collection('restaurants').insertOne(r,function(err,result) {
		assert.equal(err,null);
		console.log("Insert was successful!");
		callback(result);
	});
}

function updateRestaurant(db,criteria,newValues,callback) {
	db.collection('restaurants').updateOne(
		criteria,{$set: newValues},function(err,result) {
			assert.equal(err,null);
			console.log("update was successfully");
			callback(result);
	});
}

function deleteRestaurant(db,criteria,callback) {
	db.collection('restaurants').deleteMany(criteria,function(err,result) {
		assert.equal(err,null);
		console.log("Delete was successfully");
		callback(result);
	});
}
server.listen(process.env.PORT || 8099);
