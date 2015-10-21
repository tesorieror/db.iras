/**
 * Tag Category file
 */
var path = require('path');
var mongoose = require('mongoose');

var TagCategory;

var schema = mongoose.Schema({
	_id : String,
	name : String,
	description : String
});

TagCategory = mongoose.model('TagCategory', schema);

module.exports = TagCategory;