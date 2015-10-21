/**
 * Indicator file
 */
var path = require('path');
var mongoose = require('mongoose');

var schema = mongoose.Schema({
	_id : String,
	value : Number,
	tags : [ {
		type : String,
		ref : 'Tag'
	} ]
});

var Indicator;

module.exports = Indicator = mongoose.model('Indicator', schema);