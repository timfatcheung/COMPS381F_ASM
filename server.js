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

app.get('/logout',function(req,res) {
	req.session = null;
	res.redirect('/');
});


app.post('/api/restaurant/create',function(req,res) {
  console.log('Incoming request: ' + req.method);
	console.log('Path: ' + req.path);
	console.log('Request body: ', req.body);

  var new_r = {};
   if (req.body.name) new_r['name'] = req.body.name;
   new_r['borough'] = req.body.borough;
   new_r['cuisine'] = req.body.cuisine;
   var address = {}
   address['building'] = req.body.building;
         address['street'] = req.body.street;
         address['zipcode'] = req.body.zipcode;
         address['coord_lon'] = req.body.coord_lon;
         address['coord_lat'] = req.body.coord_lat;
         new_r['address'] = address;
         var array = [];
         var rate = [];
         rate['user'] = null;
         rate['score'] = null;
         array = rate;
         new_r['rate'] = array;
         new_r['owmer'] = 'apiUser';
         new_r['photo'] = '';
         new_r['mimetype'] = '';
           console.log('About to insert: ' + JSON.stringify(new_r));
           MongoClient.connect(mongourl,function(err,db) {
          assert.equal(err,null);
            console.log('Connected to MongoDB\n');
            insertRestaurant(db,new_r,function(result) {
               db.close();
               if(result){
               res.json({
                 status: 'ok'
             });}else if(!result){
               res.json({
                 status: 'Failed'
             });


         }
         });

     });
   });

app.get('/api/restaurant/read/name/:name', function(req,res) {
  var new_r={};
  new_r['name'] = req.params.name;

  MongoClient.connect(mongourl,function(err,db) {
  assert.equal(err,null);
  console.log('Connected to MongoDB\n');
  db.collection('restaurants1').find(new_r).toArray(function(err,restaurants) {
    assert.equal(err,null);
  db.close();
     console.log('Disconnected to MongoDB\n');
     console.log(JSON.stringify(new_r));
  if (restaurants.length == 0) {
  console.log('No Result\n');
  res.json({
    message:"No Result"
})
} else {
    console.log('About to search: ' + JSON.stringify(restaurants));
    for (var i=0; i<restaurants.length; i++){
      var name = restaurants[i].name;
      var borough = restaurants[i].borough;
      var cuisine = restaurants[i].cuisine;
    }
    res.json({
      Name: name,
      Borough:borough,
      Cuisine:cuisine
  })
    }
  });
});
});

app.get('/api/restaurant/read/borough/:borough', function(req,res) {
  var new_r={};
  new_r['borough'] = req.params.borough;

  MongoClient.connect(mongourl,function(err,db) {
  assert.equal(err,null);
  console.log('Connected to MongoDB\n');
  db.collection('restaurants1').find(new_r).toArray(function(err,restaurants) {
    assert.equal(err,null);
  db.close();
     console.log('Disconnected to MongoDB\n');
     console.log(JSON.stringify(new_r));
  if (restaurants.length == 0) {
  console.log('No Result\n');
  res.json({
    message:"No Result"
})
} else {
    console.log('About to search: ' + JSON.stringify(restaurants));
    for (var i=0; i<restaurants.length; i++){
      var name = restaurants[i].name;
      var borough = restaurants[i].borough;
      var cuisine = restaurants[i].cuisine;
    }
    res.json({
      Name: name,
      Borough:borough,
      Cuisine:cuisine
  })
    }
  });
});
});

app.get('/api/restaurant/read/cuisine/:cuisine', function(req,res) {
  var new_r={};
  new_r['cuisine'] = req.params.cuisine;

  MongoClient.connect(mongourl,function(err,db) {
  assert.equal(err,null);
  console.log('Connected to MongoDB\n');
  db.collection('restaurants1').find(new_r).toArray(function(err,restaurants) {
    assert.equal(err,null);
  db.close();
     console.log('Disconnected to MongoDB\n');
     console.log(JSON.stringify(new_r));
  if (restaurants.length == 0) {
  console.log('No Result\n');
  res.json({
    message:"No Result"
})
} else {
    console.log('About to search: ' + JSON.stringify(restaurants));
    for (var i=0; i<restaurants.length; i++){
      var name = restaurants[i].name;
      var borough = restaurants[i].borough;
      var cuisine = restaurants[i].cuisine;
    }
    res.json({
      Name: name,
      Borough:borough,
      Cuisine:cuisine
  })
    }
  });
});
});

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
      res.render('sendNewForm',{r:queryAsObject, name:req.session.username});
            break;
        case "/display":
            console.log('/display ' + queryAsObject._id);
            displayRestaurant(req,res, queryAsObject._id);
            break;
        case "/rate" :
            console.log('/rate ' + req.body._id);
            rateForm(req,res);
            break;
        case '/change':
            console.log('/change ' + JSON.stringify(queryAsObject));
	    sendUpdateForm(req,res,queryAsObject);
            break;
        case '/remove':
	    var criteria = {};
	    criteria['_id'] = req.body._id;
	    console.log('/delete '+JSON.stringify(criteria._id));
	    remove(req,res,criteria);
	    break;
        case '/create':
            var form = new formidable.IncomingForm();
            form.parse(req, function (err, fields, files) {
            console.log(JSON.stringify(files));
            var filename = files.filetoupload.path;
            var mimetype = files.filetoupload.type;
            console.log("filename = " + filename);
            fs.readFile(filename, function(err,data) {
                MongoClient.connect(mongourl,function(err,db) {
                var new_r = {};
                if (fields.id) new_r['id'] = fields.id;
	        if (fields.name) new_r['name'] = fields.name;
          console.log(fields.zipcode);
	        new_r['borough'] = fields.borough;
	        new_r['cuisine'] = fields.cuisine;
	        //if (queryAsObject.building || queryAsObject.street || queryAsObject.zipcode || queryAsObject.coord) {
	        var address = {};
	        address['building'] = fields.building;
                address['street'] = fields.street;
                address['zipcode'] = fields.zipcode;
                address['coord_lon'] = fields.coord_lon;
                address['coord_lat'] = fields.coord_lat;
                new_r['address'] = address;
	        //}
                var array = [];
                var rate = [];
                rate['user'] = null;
                rate['score'] = null;
                array = rate;
                new_r['rate'] = array;
<<<<<<< HEAD
                new_r['owmer'] = req.session.username;
=======
               new_r['owmer'] = req.session.username;
>>>>>>> 3a312ef11e21c8557f9c2e9e51b71b508174d623
                new_r['photo'] = new Buffer(data).toString('base64');
                new_r['mimetype'] = mimetype;
                console.log('About to insert: ' + JSON.stringify(new_r.rate));
                console.log('About to insert: ' + JSON.stringify(new_r));
                MongoClient.connect(mongourl,function(err,db) {
		    assert.equal(err,null);
		    console.log('Connected to MongoDB\n');
        if(new_r.name !=null){
		    insertRestaurant(db,new_r,function(result) {
			db.close();
			console.log(JSON.stringify(result));
        res.redirect('/read');
		});
  }else{
    res.writeHead(200, {"Content-Type": "text/html"});
    res.write("<html><body>");
    res.write("Fail!<br>")
    res.write("<a href=/new> Back and try again</a>")
    res.end("</body></html> ");
  }
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
          var form = new formidable.IncomingForm();
          form.parse(req, function (err, fields, files) {
          console.log(JSON.stringify(files));
          var filename = files.filetoupload.path;
          var mimetype = files.filetoupload.type;
          console.log("filename = " + filename);
          fs.readFile(filename, function(err,data) {
              MongoClient.connect(mongourl,function(err,db) {
                var criteria = {};
                criteria['_id'] = fields._id;
              var new_r = {};
              if (fields.id) new_r['id'] = fields.id;
          if (fields.name) new_r['name'] = fields.name;
          new_r['borough'] = fields.borough;
          new_r['cuisine'] = fields.cuisine;
          //if (queryAsObject.building || queryAsObject.street || queryAsObject.zipcode || queryAsObject.coord) {
          var address = {};
          address['building'] = fields.building;
              address['street'] = fields.street;
              address['zipcode'] = fields.zipcode;
              address['coord_lon'] = fields.coord_lon;
              address['coord_lat'] = fields.coord_lat;
              new_r['address'] = address;
          //}
              if (fields.cuisine) new_r['owmer'] = req.session.username;
              var check;
              check = new Buffer(data).toString('base64');
              if(check.length > 1){
              new_r['photo'] = new Buffer(data).toString('base64');
              new_r['mimetype'] = mimetype;
            }
              console.log('About to update: ' + JSON.stringify(new_r));
              MongoClient.connect(mongourl,function(err,db) {
              assert.equal(err,null);
             console.log('Connected to MongoDB\n');
              updateRestaurant(db,criteria,new_r,function(result) {
                db.close();
             res.redirect('/display?_id='+ fields._id );
              });
            });
          });
          });
          });
	    break;
        case '/register':
				console.log('insert user ' + JSON.stringify(req.body.name));
				MongoClient.connect(mongourl,function(err,db) {
					assert.equal(err,null);
					console.log('Connected to MongoDB\n');
					var new_r = {};
          if (req.body.name && req.body.password != ""){
				        if (req.body.name) new_r['name'] = req.body.name;
			                if (req.body.password == req.body.password2 ) {
			                    new_r['password'] = req.body.password;

                          db.collection('users').findOne({"name":(new_r.name)} ,function(err, doc){
                            assert.equal(err,null);

                              console.log('running....'+JSON.stringify(req.body.password));


                              if (doc!=null){
                                res.writeHead(200, {"Content-Type": "text/html"});
                                res.write("<html><body>");
                                res.write("User Exist!!<br>")
                                res.write("<a href=/login> Back to login page</a>")
                                res.end("</body></html> ");
                              } else{
                                insertUser(db,new_r,function(result) {
                                  db.close();
                                  res.writeHead(200, {"Content-Type": "text/html"});
                                  res.write("<html><body>");
                                  res.write("successful!<br>")
                                  res.write("<a href=/login> Back to login page</a>")
                                  res.end("</body></html> ");
                                });
              }
            });


			                }else {
			                    console.log('Two password are different!');
													res.writeHead(200, {"Content-Type": "text/html"});
													res.write("<html><body>");
													res.write("Fail!<br>")
													res.write("<a href=/login> Back and try again</a>")
													res.end("</body></html> ");
			                }
				}else{
          res.writeHead(200, {"Content-Type": "text/html"});
          res.write("<html><body>");
          res.write("Fail!<br>")
          res.write("<a href=/login> Back and try again</a>")
          res.end("</body></html> ");
        }});
            break;
        case '/createUser':
            console.log('/createUser ' + JSON.stringify(queryAsObject));
      res.render('Register',{r:req,name:req.session.username});
	    //createUser(req,res);
            break;

            case '/search':
                console.log('/search ' + JSON.stringify(req.body.search));
                var new_r = {};
                var searchType = req.body.type;
                if(searchType == 'name'){
                new_r['name'] = req.body.search;
                  console.log(JSON.stringify(new_r));
              }else if(searchType == 'borough'){
                new_r['borough'] = req.body.search;
                console.log(' borough ');
              }else if(searchType == 'cuisine'){
                new_r['cuisine'] = req.body.search;
                console.log(' cuisine ');
              }else if(searchType == 'building'){
                new_r['address.'+searchType] = req.body.search;
                console.log('searching'+JSON.stringify(new_r));
                console.log(JSON.stringify(req.body.search));
              }else if(searchType == 'street'){
                new_r['address.'+searchType] = req.body.search;
                console.log('searching'+JSON.stringify(new_r));
                console.log(JSON.stringify(req.body.search));
              }
            search(req,res,new_r);
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
function search(req,res,criteria) {
    MongoClient.connect(mongourl, function(err, db) {
    assert.equal(err,null);
    console.log('Connected to MongoDB\n');
    db.collection('restaurants1').find(criteria).toArray(function(err,restaurants) {
  		assert.equal(err,null);
  		console.log("Search was successfully");
    db.close();
    if (restaurants.length == 0) {
	  res.render('SearchResult',{r:restaurants,rlenth:restaurants.length,name:req.session.username});
	} else {
    res.render('SearchResult',{r:restaurants,rlenth:restaurants.length,name:req.session.username});

	    }
    });});
}

function read_n_print(req,res,criteria,max) {
    MongoClient.connect(mongourl, function(err, db) {
    assert.equal(err,null);
    console.log('Connected to MongoDB\n');
    findRestaurants(db,criteria,max,function(restaurants) {
    db.close();
    console.log('Disconnected MongoDB\n');
    if (restaurants.length == 0) {
	  res.render('ListRest',{r:restaurants,rlenth:restaurants.length,name:req.session.username});
	} else {
    res.render('ListRest',{r:restaurants,rlenth:restaurants.length,name:req.session.username});
	    }
	});
    });
}

function displayRestaurant(req,res,id) {
	MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		db.collection('restaurants1').
			findOne({_id: ObjectId(id)},function(err,doc) {
				assert.equal(err,null);
				db.close();
				console.log('Disconnected from MongoDB\n');
            var image = new Buffer(doc.photo,'base64');
            RrateLength = doc.rate;

            for (var i=0; i<RrateLength.length; i++) {
              var item = RrateLength[i].user;
              var check = item.includes(req.session.username);
              if(check== true){
                break;
              }
            }
              if (check == true ){
                checked = 'yes';
                res.render('displayRest',{r:doc,name:req.session.username, image:image , c:checked});
              }else{
                checked= 'no';
        res.render('displayRest',{r:doc,name:req.session.username, image:image, c:checked});
      }
		});
	});
}

function rateForm(req,res) {
    MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		db.collection('restaurants1').
			findOne({_id: ObjectId(req.body._id)},function(err,doc) {
				assert.equal(err,null);
				db.close();
                                console.log('Disconnected from MongoDB\n');
                          res.render('rateForm',{r:doc,name:req.session.username, user:req.body.rateuser});
                            });
                        });
                        }



function updaterate(req,res,queryAsObject) {
	var new_r = {};	// document to be inserted
         var criteria = {};
        if (req.body._id) criteria['_id'] = req.body._id;
        var grades = {};
	    if (req.body.name) grades['user'] = req.body.name;
            if (req.body.score) grades['score'] = req.body.score;
            new_r['rate'] = grades;

	console.log('About to insert: ' + JSON.stringify(new_r));

	MongoClient.connect(mongourl,function(err,db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		updateRestaurantRate(db,criteria,new_r,function(result) {
			db.close();
			console.log(JSON.stringify(result));
      res.redirect('/display?_id='+ req.body._id );
		});
	});
}

function sendUpdateForm(req,res,queryAsObject) {
	MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		db.collection('restaurants1').
			findOne({_id: ObjectId(queryAsObject._id)},function(err,doc) {
				assert.equal(err,null);
				db.close();
				console.log('Disconnected from MongoDB\n');
        res.render('sendUpdateForm',{r:doc,name:req.session.username});

		});
	});
}


function remove(req, res,criteria) {
	console.log('About to delete ' + JSON.stringify(criteria));
	MongoClient.connect(mongourl,function(err,db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		deleteRestaurant(db,criteria,function(result) {
			db.close();
			console.log(JSON.stringify(result));
			res.redirect('/read');
		});
	});
}

function login(req, res,queryAsObject) {
	MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
                var new_r = {};
                if (req.body.name!==null && req.body.password !== ""){
                  new_r['name'] = req.body.name
                  new_r['password'] = req.body.password;
								db.collection('users').findOne({"name":(new_r.name)} ,function(err, doc){
                  assert.equal(err,null);
                    db.close();
                    console.log('running....'+JSON.stringify(req.body.password));
                    if (new_r['name'] == doc.name && new_r['password'] == doc.password){
											  console.log(doc.name);
                        req.session.authenticated = true;
                        req.session.username = doc.name;
                        res.redirect('/read');
                    } else{
                        res.writeHead(200, {"Content-Type": "text/plain"});
			                  res.end("Failed..try again");
		}
	});
}else{
  res.writeHead(200, {"Content-Type": "text/plain"});
  res.end("Failed..try again");
}})
}
/*
function findUser(db,new_r,callback) {
	var users = [];
	 cursor = db.collection('users').findOne(new_r['name']);
	cursor.each(function(err, doc) {
		assert.equal(err, null);
		if (doc != null) {
			users.push(doc);
		} else {
			callback(users);
		}
	});
}
*/
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
		cursor = db.collection('restaurants1').find(criteria).limit(max);
	} else {
		cursor = db.collection('restaurants1').find(criteria);
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
	db.collection('restaurants1').insertOne(r,function(err,result) {
		assert.equal(err,null);
		console.log("Insert was successful!");
		callback(result);
	});
}

function updateRestaurant(db,criteria,newValues,callback) {
	db.collection('restaurants1').updateOne(
		{_id: ObjectId(criteria._id)},{$set: newValues},function(err,result) {
			assert.equal(err,null);
			console.log("update was successfully");
			callback(result);
	});
}

function deleteRestaurant(db,criteria,callback) {
	db.collection('restaurants1').deleteMany(
    {_id: ObjectId(criteria._id)},function(err,result) {
		assert.equal(err,null);
		console.log("Delete was successfully");
		callback(result);
	});
}

function updateRestaurantRate(db,criteria,rate,callback) {
	db.collection('restaurants1').update(
		{_id: ObjectId(criteria._id)},{$push:rate} ,function(err,result) {
			assert.equal(err,null);
			console.log("update was successfully");
			callback(result);
	});
}

server.listen(process.env.PORT || 8099);
