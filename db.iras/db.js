/**
 * http://usejsdoc.org/
 */
var _ = require('underscore');
var q = require('q');
q.longStackSupport = true;
var mongoose = require('mongoose');
var database = require('./config/database');

var c = require('/Users/ricardo.tesoriero/Gitrepo/KAUParser/KAUParser/common');

var Tag = require('./model/Tag');
var TagCategory = require('./model/tag-category');
var Indicator = require('./model/indicator')

function DB() {
	var self = this;

	/*****************************************************************************
	 * Database
	 */

	mongoose.connect(database.url);
	var db = mongoose.connection;

	db.on('error', console.error.bind(console, 'connection error:'));
	db.once('open', function(callback) {
		console.log('DB connection success');
	});

	this.close = function() {
		console.log('close');
		return mongoose.connection.close();
	}

	/*****************************************************************************
	 * Tags
	 */

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

	this.findTagById = function(id) {
		console.log('findTagById', id);
		var query = Tag.findOne({
			'_id' : id
		})//
		.populate('category')//
		.lean()//
		return q.nbind(query.exec, query)()//
	}

	this.findTagByCategoryId = function(id) {
		var query = Tag.find({
			category : id
		}).populate('category').lean()
		return q.nbind(query.exec, query)()//
	}

	this.findTagByCategoryIds = function(ids) {
		var conds = _.map(ids, function(id) {
			return {
				category : id
			};
		})
		var query = Tag.find({
			$or : conds
		}).lean()
		return q.nbind(query.exec, query)()//
	}

	this.findTagWithDependenciesByCategoryId = function(catId) {
		console.log('findTagWithDependenciesByCategoryId', catId);
		var query = Tag.find({
			'category' : catId
		})//
		.populate('category')//
		.populate('dependencies.tags')//
		// .populate('dependencies.tags.category')//
		return q.nbind(query.exec, query)()//
	}

	this.findTagByIdsWithDependencies = function(tagIds) {
		console.log('findTagByIdsWithDependencies', tagIds);

		var conds = _.map(tagIds, function(id) {
			return {
				'_id' : id
			}
		})
		// console.log('conds', conds)
		var query = Tag.find({
			'$or' : conds
		})//
		.populate('category')//
		.populate('dependencies.tags')//
		.lean()
		return q.nbind(query.exec, query)()//
	}

	this.findTagByIdWithDependencies = function(id) {
		function populateDependenciesTags(tag) {
			return q.all(_.map(tag.dependencies, function(dep) {
				return q.all(_.map(dep.tags, function(tagId) {
					return self.findTagById(tagId)//
					// .then(c.log('Tags',true),c.error('Tags'))
				})).then(function(tags) {
					dep.tags = tags
					return dep
				});
			})).then(function(deps) {
				tag.dependencies = deps
				return tag
			})
		}

		console.log('findTagByIdWithDependencies', id);
		var query = Tag.findOne({
			'_id' : id
		})//
		.populate('category')//
		.populate('dependencies.tags')//
		.lean()//
		return q.nbind(query.exec, query)()//
		.then(function(tag) {
			return populateDependenciesTags(tag)
		});
	}

	/*****************************************************************************
	 * Categories
	 */

	this.findAllCategories = function() {
		return q.nbind(TagCategory.find, TagCategory)({})
	}

	this.removeTagCategories = function() {
		// console.log('removeTagCategories');
		return q.nbind(TagCategory.remove, TagCategory)()//
		// .then(c.log('after DB.removeTagCategories', false),
		// c.error('after DB.removeTagCategories'))
	}

	this.addTagCategories = function(tagCategories) {
		// console.log('addTagCategories', tagCategories.length)
		return q.all(_.map(tagCategories, function(tagCategory) {
			var cat = new TagCategory(tagCategory);
			return q.nbind(cat.save, cat)();
		}));
	}

	this.findTagCategoryById = function(id) {

		function loadTags(tc) {
			function assignTags(tags) {
				tc.tags = tags
				return tc
			}
			return self.findTagByCategoryId(tc._id)//
			.then(assignTags)//
		}

		var query = TagCategory.findOne({
			'_id' : id
		}).lean()

		return q.nbind(query.exec, query)()//
		.then(loadTags)//

	}

	this.findCategoriesByIds = function(ids) {

		var conds = _.map(ids, function(id) {
			return {
				_id : id
			};
		})

		var query = TagCategory.find({
			$or : conds
		}).lean()

		return q.nbind(query.exec, query)()//

	}

	/*****************************************************************************
	 * Indicators
	 */

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
		// console.log('addIndicators');

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

	this.findIndicatorByCategoryIds = function(idCollections) {
//		console.log('idCollections', idCollections)
		var queryDoc = {
			$and : _.map(idCollections, function(idCollection) {
				return {
					$or : _.map(idCollection, function(id) {
						return {
							tags : id
						};
					})
				};
			})
		}
		var query = Indicator.find(queryDoc).populate('tags').lean()
		return q.nbind(query.exec, query)()
	}

	return this;
}

module.exports.instance = new DB();