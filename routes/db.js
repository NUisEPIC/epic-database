var db = require('../models/Startup');

exports.list = function (req, res) {	
	db.find({}, function(err, data) {
		if(err) console.log(err);
		res.render('db', { title: 'test-dump', startups: data });	
	});
};