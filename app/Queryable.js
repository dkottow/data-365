/*
   Copyright 2016 Daniel Kottow

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

var _ = require('underscore');
var util = require('util');

/*
var FieldFactory = require('./FieldFactory.js').FieldFactory;
var Field = FieldFactory.class();
*/
var SqlHelper = require('./SqlHelperFactory.js').SqlHelperFactory.create();
var SchemaDefs = require('./SchemaDefs.js').SchemaDefs;
var Field = require('./Field.js').Field;

var log = require('./log.js').log;

var Queryable = function(tableDef) {

	var me = this;
	me._fields = {};

	init(tableDef);

	function init(tableDef) {

		if ( ! tableDef.name) {
			log.error({ tableDef: tableDef }, "Table.init() failed.");
			throw new Error("Table.init() failed. "
				+ 'Table name missing.');
		}

		if ( ! /^\w+$/.test(tableDef.name)) {
			log.error({ tableDef: tableDef }, "Table.init() failed.");
			throw new Error("Table.init() failed."
					+ " Table names can only have word-type characters.");
		}

		var fields = _.values(tableDef.fields) || [];
		_.each(fields, function(f) {
			try {
				me._fields[f.name] = Field.create(f);
			} catch(err) {
				log.warn({field: f, err: err}, 
					"Field.create() failed. Ignoring field '" + f.name + "'");
			}
		});

		me.name = tableDef.name;
	}
}

Queryable.ALL_FIELDS = '*';

Queryable.prototype.fields = function() {
	return this._fields; //returns object with key == field.name
}

Queryable.prototype.field = function(name) {
	return this.fields()[name];
	//if ( ! field) throw new Error(util.format('field %s not found.', name));
}

Queryable.prototype.viewFields = function() {
	return _.pluck(this.fields(), 'name');
}

Queryable.prototype.allFieldClauses = function() {
	return _.map(this.viewFields(), function(vf) {
		return { table: this.name, field: vf };
	}, this);
}


Queryable.prototype.toJSON = function() {

	var result = {
		name: this.name 
	};

	result.fields = _.mapObject(this.fields(), function(field) {
		return field.toJSON();
	});

	//console.log(result);
	return result;
}

exports.Queryable = Queryable;

