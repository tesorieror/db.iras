/**
 * http://usejsdoc.org/
 */
var _ = require('underscore');
var q = require('q');
var mongoose = require('mongoose');
var database = require('./config/database');

var c = require('/Users/ricardo.tesoriero/Gitrepo/KAUParser/KAUParser/common');

var Tag = require('./model/Tag');
var TagCategory = require('./model/tag-category');
var Indicator = require('./model/indicator')

function DB() {
	var self = this;
	// Database conneciton
	mongoose.connect(database.url);
	var db = mongoose.connection;

	db.on('error', console.error.bind(console, 'connection error:'));

	this.removeTags = function() {
		console.log('removeTags');
		return q.nbind(Tag.remove, Tag)().then(
				c.log('after Tag.removeTags', false), c.error('after Tag.removeTags'))
	};

	this.addTags = function(tags) {
		return q.all(_.map(tags, function(tag) {
			var t = new Tag(tag);
			return q.nbind(t.save, t)();
		}));
	};

	this.removeTagCategories = function() {
		console.log('removeTagCategories');
		return q.nbind(TagCategory.remove, TagCategory)()//
		.then(c.log('after DB.removeTagCategories', false),
				c.error('after DB.removeTagCategories'))
	}

	this.addTagCategories = function(tagCategories) {
		console.log('addTagCategories', tagCategories.length)
		return q.nbind(TagCategory.collection.insert, TagCategory.collection)(
				tagCategories);
	}

	this.findTagById = function(id) {
		console.log('findTagById', id);
		return q.nbind(Tag.findOne, Tag)({
			'_id' : id
		})//
		.populate('category')//
		.exec()
	}

	this.findTagCategoryById = function(id) {
		return q.nbind(TagCategory.findOne, TagCategory)({
			'_id' : id
		})//
		.then(loadTags)//
	}

	function loadTags(tc) {
		function assignTags(tags) {
			tc.tags = tags;
			return tc
		}

		return self.findTagByTagCategoryId(tc._id)//
		.then(assignTags)
	}

	this.findTagByTagCategoryId = function(id) {
		return q.nbind(Tag.find, Tag)({
			category : id
		}).populate('category')//
	}

	this.findTagByIdWithDependences = function(id) {
		console.log('findTagByIdWithDependences', id);
		return q.nbind(Tag.findOne, Tag)({
			'_id' : id
		})//
		.populate('dependences')//
		.exec()
	}

	this.removeIndicators = function() {
		function count() {
			var query = Indicator.find()
			return q.nbind(query.count, query)()
		}
		// return count().then(c.log('count', true), c.error('count'))
		return q.nbind(Indicator.remove, Indicator)()//
		// .then(c.log('after removeIndicators', false),
		// c.error('after removeIndicators'))//
		// .then(count)//
		// .then(c.log('after count', true), c.error('after count'))
	}

	this.addIndicators = function(indicators) {
		console.log('addIndicators');

		var ids = [];
		_.each(indicators, function(indicator) {
			var id = indicator._id;
			if (!id) {
				throw new Error('Record ' + indicators.indexOf(indicator)
						+ ' has empty key')
			} else {
				if (_.contains(ids, id)) {
					throw new Error('Record ' + indicators.indexOf(indicator)
							+ ' key conflicts with ' + ids.indexOf(id) + ' value '
							+ indicator.value)
				} else {
					ids.push(id)
				}
			}
		});

		var total = indicators.length;
		console.log(total);
		var chunks = [];

		while (indicators.length > 0) {
			chunks.push(indicators.splice(0, 1000));
		}
		console.log(chunks.length);
		return q.all(_.map(chunks, function(chunk) {
			return q.nbind(Indicator.collection.insert, Indicator.collection)(chunk)
		}));
	}

	this.close = function() {
		console.log('close');
		return mongoose.connection.close();
	}
	return this;
}

module.exports.instance = new DB();