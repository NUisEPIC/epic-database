
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var db = require('./routes/db');
var http = require('http');
var path = require('path');
var mongoose = require('mongoose');
var passport = require('passport');
var sass = require("node-sass");

var app = express();

app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.session({secret: 'casanova killed the hostel bar'}));

// development only
if ('development' == app.get('env')) {
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
}

if ('production' == app.get('env')) {
	app.use(express.errorHandler());
}

app.use(sass.middleware({
	dest: __dirname + "/public/stylesheets",
	src: __dirname + "/sass",
	prefix: "/static/stylesheets"
}));

app.use(passport.initialize());
app.use(passport.session());
//router MUST come after passport. IDK.
app.use(app.router);

var mongoose = require('mongoose');

// connect to db
// for local to work, mongod (mongodaemon) must be running on port 27017
var uristring =
	process.env.MONGOLAB_URI ||
	process.env.MONGOHQ_URL  ||
	'mongodb://localhost/epicdb';
	
mongoose.connect(uristring, function (err, res) {
	if (err) {
		console.log ('ERROR connecting to: ' + uristring + '. ' + err);
	} else {
		console.log ('Succeeded connecting to: ' + uristring);
		//require('./util/parsecsv').parse();
	}
});

//set up passport (better auth) using passport-local-mongoose plugin
var Account = require('./models/Account.js');
passport.use(Account.createStrategy());
passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.use('/static', express.static(__dirname + '/public'));

app.get('/', routes.index);

var formatStartup = function(startup) {
	
};

app.get("/data/startup", function(request, response) {
	response.type("json");
	var Startup = require("./models/Startup");
	Startup.find({}, function(err, startups) {
		if(err) {
			response.send(500, "Error retrieving startups from DB");
		}
		setTimeout(function() {
			response.send(startups);	
		}, 1000);
		
	});
});

var addOrEditStartupCallback = function(response) {
	return function(err, updated) {
		if(err) {
			console.log(err);
			response.send(400, "Error updating database");
		} else {
			console.log(updated);
			setTimeout(function() {
				response.send(updated, 200);	
			}, 1000);
			
		}
	};
};

//THIS MUST COME BEFORE THE EDIT PATH!!
app.post("/data/startup/new", function(request, response) {
	var toAdd = request.body;
	console.log(toAdd);
	var Startup = require("./models/Startup");
	Startup.create(toAdd, addOrEditStartupCallback(response));
});

app.post("/data/startup/:id", function(request, response) {
	var toUpdate = request.body;
	delete toUpdate._id;
	var id = request.params.id;
	var Startup = require("./models/Startup");
	console.log(id);
	console.log(toUpdate);
	Startup.findByIdAndUpdate(id, toUpdate, addOrEditStartupCallback(response));
});

app.del("/data/startup/:id", function(request, response) {
	var id = new mongoose.Types.ObjectId(request.params.id);
	var Startup = require("./models/Startup");
	console.log(id);
	Startup.remove({_id: id}, function(error) {
		if(error) {
			response.send("Error deleting", 404);
		} else {
			//Remove from any startups that have this as a related startup
			Startup.update({relatedStartups: id}, {$pull: {relatedStartups: id}}, {multi: true}, function(error, numAffected, rawResponse) {
				if(error) {
					console.log(error);
					response.send("Error deleting", 404);
				}
				console.log(numAffected);
				response.send(200);	
			});
		}
	});
	
});


app.get("/startup", function(request, response) {
	response.render("startup/index");
});
app.get("/startup/:startupView", function(request, response) {
	response.render("startup/partials/" + request.params.startupView);
});
app.set("/startups", function(request, response) {
	
});
app.get('/dump', express.basicAuth(function(user, pass) { return user === "admin" && pass === "my favorite giraffe apocalypse"; }), db.list);


http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
