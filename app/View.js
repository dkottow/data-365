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
var Queryable = require('./Queryable.js').Queryable;
var Field = require('./Field.js').Field;

var log = require('./log.js').log;

var View = function(tableDef) {
	var me = this;
	Queryable.call(this, tableDef);
}


View.prototype = Object.create(Queryable.prototype);	
View.prototype.constructor = View;


exports.View = View;

