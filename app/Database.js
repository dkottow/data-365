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
var fs = require('fs');


//var Papa = require('papaparse');
var Papa = require('./papaparse.js'); //local has ISO dates

var Table = require('./Table.js').Table;
var Schema = require('./Schema.js').Schema;
var SchemaChange = require('./SchemaChange.js').SchemaChange;
var SchemaDefs = require('./SchemaDefs.js').SchemaDefs;
var User = require('./User.js').User;

var SqlHelper = require('./SqlHelperFactory.js').SqlHelperFactory.create();
var SqlBuilderFactory = require('./SqlBuilderFactory.js').SqlBuilderFactory;

var config = require('config'); 
var log = require('./log.js').log;

var Database = function() 
{
	log.trace('new Database');
	this.schema = new Schema();
}

Database.MASTER = '_d365Master';
/*	

Database.prototype.init = function(cbAfter) {
}

*/

Database.prototype.init = function() {
	var me = this;
	return new Promise(function(resolve, reject) {
		me._init(function(err) {
			if (err) reject(err);
			else resolve(); 
		});
	});
}

Database.prototype.initInfo = function() {
	return { at: this._initAt };
}

Database.prototype._init = function(cbAfter) {
	var me = this;
	if (me.schema.isEmpty()) {
		if ( ! me._readingSchema) {
			me.readSchema(function(err) {
				me._initAt = new Date();
				cbAfter(err);
			});

		} else {
			log.debug({
				at: new Date(), 
				wait: config.sql.initRetryInterval
			}, 'readingSchema true, retry. Database.init()');

			setTimeout(function() {
				me._init(cbAfter);
/*				
				if (me.schema.isEmpty()) {
					cbAfter(new Error('init failed.'), null);
				} else {
					return cbAfter();
				}
*/				
			}, config.sql.initRetryInterval);
		}
		
	} else {
		cbAfter();
	}
}

Database.prototype.reset = function() {
	this.schema = new Schema(); //empty schema
	return this.init();
}

Database.prototype.name = function() { 
	//overwrite me
}

Database.prototype.table = function(name) { 
	return this.schema.table(name);
}

Database.prototype.view = function(name) { 
	return this.schema.view(name);
}

Database.prototype.tables = function() { 
	return this.schema.tables();
};

Database.prototype.childTables = function(tableName) {
	return this.schema.graph.childTables(tableName);
}

Database.prototype.rowsToObj = function(rows, tableName) {
	return this.schema.graph.rowsToObj(rows, tableName);
}

Database.prototype.setSchema = function(newSchema) {

	if (newSchema instanceof Schema) {
		this.schema = newSchema;
	} else {
		//expecting a json rep of the schema 
		this.schema.init(newSchema);
	}

	this.sqlBuilder = SqlBuilderFactory.create(this.schema.graph);
}

Database.prototype.getInfo = function(options, cbResult) {

	cbResult = cbResult || arguments[arguments.length - 1];	
	options = typeof options == 'object' ? options : {};		

	var counts = options.counts == 1 || false;

	var result = this.schema.get();

	if ( ! counts) {
		cbResult(null, result);
		return;
	}
	
	this.getCounts(function(err, rowCount) {
		if (err) {
			cbResult(err, null);
		} else {
			_.each(result.tables, function(table) {
				table.row_count = rowCount[table.name];
			});
			cbResult(null, result);
		}
	});
}

Database.prototype.isEmpty = function(cbResult) {
	this.getCounts(function(err, result) {
		if (err) {
			cbResult(err, null);
			return;	
		}
		
		var totalRowCount = _.reduce(result, 
			function(memo, tableRowCount) { 
				return memo + tableRowCount; 
			}, 
		0);

		cbResult(null, totalRowCount == 0);
	});
}

Database.prototype.allById = function(tableName, rowIds, options, cbResult) {

	cbResult = cbResult || arguments[arguments.length - 1];	
	options = typeof options == 'object' ? options : {};		

	options.filter = options.filter || [];

	options.filter.push({
		field: 'id',
		op: 'in',
		value: rowIds
	});
	
	return this.all(tableName, options, cbResult);
} 

Database.prototype.rowsOwned = function(tableName, rowIds, principal, cbResult) {
	log.trace({table: tableName, principal: principal}, 'Database.rowsOwned()...');
	log.trace({rowIds: rowIds},  'Database.rowsOwned()');
	
	var fields = ['id', 'own_by'];
	this.allById(tableName, rowIds, { fields: fields }, function(err, result) {
		if (err) {
			cbResult(err, null);
			return;
		}
		var notOwned = _.find(result.rows, function(row) {
			return row.own_by != principal && row.own_by != User.EVERYONE;	
		});

		log.trace({notOwned: notOwned}, '...Database.rowsOwned()');
		cbResult(null,  ! notOwned);	
	});
}

Database.prototype.getInsertFields = function(rows, table) {

	var noId = _.find(rows, function(row) {
		return isNaN(parseInt(row.id));
	});

	var fields = _.clone(table.fields());
	if (noId) {
		delete fields['id'];
	}

	return fields;	
}

Database.prototype.getUpdateFields = function(rows, table) {

	var rejectFields = _.pluck(_.filter(Table.MANDATORY_FIELDS, function(mf) { 
		return _.contains(['id', 'add_by', 'add_on'], mf.name); 
	}), 'name');

	var forceFields = _.pluck(_.filter(Table.MANDATORY_FIELDS, function(mf) { 
		return _.contains(['mod_by', 'mod_on'], mf.name); 
	}), 'name');

	var row = rows[0]; //all based on first row

	var fields = _.filter(table.fields(), function(field) {
		if (_.contains(rejectFields, field.name)) {
			//never update these fields, even if present in row
			return false; 
		}
		if (_.contains(forceFields, field.name)) {
			//always update these fields, regardless of present in row
			return true;
		}
		if (row[field.name] !== undefined) {
			//update if present row
			return true;
		}
		
		return false;
	});
	
	return _.object(_.pluck(fields, 'name'), fields);
}

Database.prototype.getFieldValues = function(row, fields) {
	try {
		var values = _.map(fields, function(field) {
			var val = field.parse(row[field.name]);
			if (val !== val) { 
				//v is NaN
				throw new Error(
					util.format("field.parse() failed. value = '%s', type = %s, field = %s%s"
						,row[field.name]
						,field.type
						,field.name
						,(row.id == null) ? '' : ', id = ' + row.id  
					)
				);
			}
			return val;
		});
		return { values: values };

	} catch(err) {
		return { err: err };
	}
}

Database.prototype.chainInsertRows = function(rowGroups) {
	var me = this;
	var chainPromises = _.reduce(rowGroups, function(chainPromises, rowGroup) {
		return chainPromises.then(result => {
			log.trace({table: rowGroup.table}, 'create row group inserts');
			return new Promise(function(resolve, reject) {
				var rows = _.map(rowGroup.rows, function(row) { return _.clone(row); });
				me.insert(rowGroup.table, rows, function(err) {
					if (err) {
						reject(err);
					} else {
						resolve();
					} 
				});							
			});
		});	
	}, Promise.resolve());		
	return chainPromises;
}

Database.prototype.write = function(cbAfter) {
	log.debug("Database.write()...");
	var me = this;
	me.writeSchema(function(err) {
		if (err) {
			log.error({err: err}, "...Database.write()");
			cbAfter(err);
			return;
		} 

		var systemRows = me.schema.systemRows();
		log.trace({ systemRows: systemRows}, 'Database.write()');

		me.chainInsertRows(systemRows).then(result => {
			log.debug("...Database.write()");
			cbAfter();
		}).catch(err => {
			log.error({err: err}, "...Database.write()");
			cbAfter(err);
		});
	});
} 

Database.prototype.getChangeRows = function(changes) {
	var rowGroups = _.map(changes, function(change) {
		return change.insertRows();
	});
	return rowGroups;
}
	
Database.prototype.patchSchema = function(patches, cbResult) {
	try {
		log.debug({patches: patches}, 'Database.patchSchema()...');
		var me = this;

		function cbPatchError(err) {
			me.getInfo(function(errInfo, schemaInfo) {
				log.trace({schemaInfo: schemaInfo}, 'Database.patchSchema()');
				if (errInfo) throw new Error('Error trying to obtain getInfo');
				cbResult(err, schemaInfo);
			});									
		}

		//obtains table row counts
		me.getInfo({counts: true}, function(err, schemaInfo) {
			if (err) {
				cbPatchError(err);
				return;
			}
	
			//take a schema copy 
			var patchedSchema = new Schema();
			patchedSchema.init(schemaInfo);

			//decorate table with row_count prop
			_.each(schemaInfo.tables, function(table) {
				patchedSchema.table(table.name)
					.setProp('row_count', table.row_count);
			});

			try {
				var changes = SchemaChange.create(patches, patchedSchema);
			} catch (err) {
				log.warn({err: err, patches: patches}, 
					"SchemaChange.create() failed. Unsupported patches");
				cbPatchError(err);
				return;
			}

			//apply changes  
			patchedSchema.applyChanges(changes);

			//write patches to database
			me.writeSchemaChanges(changes, function(err) {

				if (err) {
					log.error({err: err}, "Database.patchSchema() - writeSchemaChanges failed.");
					//TODO read from disk?
					cbPatchError(err);
					return;
				}
				var rows = me.getChangeRows(changes);	
				log.debug({ changeRows: rows}, 'Database.patchSchema()');
				me.chainInsertRows(rows).then(result => {

					//replace database schema by patched one 
					me.setSchema(patchedSchema);
					
					//return patched schema info (use getInfo to return rowCounts)
					me.getInfo(cbResult);

				}).catch(err => {
					log.error({err: err}, "Database.patchSchema() - insertChangeRows() failed.");
					cbPatchError(err);
				});
	
			});

		});

	} catch(err) {
		log.error({err: err, patches: patches}, 
			"Database.patchSchema() exception.");	

		cbResult(err, null);
	}
}

Database.prototype.allSanitizeOptions = function(options) {
	log.trace({ options: options }, 'Database.allSanitizeOptions()...');
	var result = {};		

	result.filter = options.filter || [];
	result.fields = options.fields || Table.ALL_FIELDS; 
	result.order = options.order || [];
	result.limit = options.limit;
	result.offset = options.offset;
	result.debug = options.debug == 1 || false;
	result.format = options.format || 'json';
	result.delimiter = options.delimiter || ','; //csv format option
	result.counts = options.counts == 1 || false;
	log.trace({ result: result }, '...Database.allSanitizeOptions()');
	return result;
}

Database.prototype.allSQL = function(tableName, options) {

	var opts = this.allSanitizeOptions(options);

	log.trace(opts.fields + " from " + tableName 
			+ " filtered by " + util.inspect(opts.filter));

	var table = this.table(tableName) || this.view(tableName);
	var sql = this.sqlBuilder.selectSQL(
		table, opts.fields, opts.filter, 
		opts.order, opts.limit, opts.offset);

	sql.counts = opts.counts;

	log.debug({sql: sql.query}, "Database.allSQL()");
	log.trace({sql: sql}, "Database.allSQL()");

	return sql;	
}

Database.prototype.parseCSV = function(filename, options, cbResult) {
	Papa.parse(fs.createReadStream(filename), {
		header: true,
		delimiter: options.delimiter || "",
		complete: function(results, file) {
			if (results.errors.length > 0) {
				cbResult(new Error('CSV Error:'), results);
			} else {
				cbResult(null, results);
			}
		},
		error: function(err, file) {
			cbResult(err);
		}
	});
} 

Database.prototype.insertCSVRows = function(tableName, csvPath, options, cbResult) {
	this._upsertCSVRows('insert', tableName, csvPath, options, cbResult);
}

Database.prototype.updateCSVRows = function(tableName, csvPath, options, cbResult) {
	this._upsertCSVRows('update', tableName, csvPath, options, cbResult);
}

Database.prototype._upsertCSVRows = function(action, tableName, csvPath, options, cbResult) {
	log.debug({
		action: action, tableName: tableName, 
		csvPath: csvPath, options: { 
			parser: options.parser, 
			path: options.path  
		}
	}, 'Database.upsertCSVRows()...');
	var me = this;
	var changeLog = {
		Action: action,
		Path: options.path, 
		User: options.user.name(),
		Metadata: options.metadata
	};
	
	var table = this.table(tableName);
	
	me.upsertChangelog(changeLog, function(err, result) {
		if (err) {
			log.error({err: err}, 'upsertChangelog Database.upsertCSVRows');
			cbResult(err);
			return;
		}

		changeLog.id = result.rows[0].id;

		//async update or insert rows from csv file into db
		me.parseCSV(csvPath, options.parser, function(err, result) {
			fs.unlink(csvPath); //delete csv file on server

			if (err) {
				changeLog.Result = 'error';
				changeLog.ResultDetails = err.message + ' ' + JSON.stringify(result.errors.slice(0,3)) //limit to max 3..
				me.upsertChangelog(changeLog);	
				return;
			} 

			log.trace({ rows: result.data }, 'Database.upsertCSVRows');

			var unknownFields = _.filter(result.meta.fields, function(csvField) {
				return ! table.field(csvField); 
			});

			if (unknownFields.length > 0) {
				changeLog.Result = 'error';
				changeLog.ResultDetails = 'Unknown fields ' + JSON.stringify(unknownFields);
				me.upsertChangelog(changeLog);	
				return;
			} 
			
			var opts = { 
				user: options.user
			};
			if (action == 'insert') {
				me.insert(tableName, result.data, opts, function(err, result) {
					if (err) {
						log.error({err: err}, 'Database.upsertCSVFile');						
						changeLog.Result = 'error';
						changeLog.ResultDetails = 'SQL Insert ' + err.message;
					} else {
						changeLog.Result = 'success';						
						changeLog.Metadata.rows = result.rows.length; 
					}
					me.upsertChangelog(changeLog);	
					log.debug('...Database.insertCSVFile().');	
				});
			} else if (action == 'update') {
				me.update(tableName, result.data, opts, function(err, result) {
					if (err) {
						log.error({err: err}, 'Database.upsertCSVFile');						
						changeLog.Result = 'error';
						changeLog.ResultDetails = 'SQL Update ' + err.message;
					} else {
						changeLog.Result = 'success';						
						changeLog.Metadata.rows = result.rows.length; 
					}
					me.upsertChangelog(changeLog);	
					log.debug('...Database.upsertCSVFile().');	
				});
			}
		});
		
		//call back
		cbResult(null, changeLog);
		log.debug('...Controller.ingestCSVFile().');	
	});
}

Database.prototype.upsertChangelog = function(changelog, cbAfter) {
	log.debug({row: row}, 'Database.upsertChangelog'); 
	var row = _.clone(changelog);
	row.own_by = User.SYSTEM;
	row.Metadata = JSON.stringify(row.Metadata);
	if (row.id) {
		this.update(SchemaDefs.CHANGELOG_TABLE, [ row ], function(err, result) {
			if (err) log.error({ err: err }, 'upsertChangelog Database.insertCSVFile');	
			if (cbAfter) cbAfter(err, result);
		});	
	} else {
		this.insert(SchemaDefs.CHANGELOG_TABLE, [ row ], function(err, result) {
			if (err) log.error({ err: err }, 'upsertChangelog Database.insertCSVFile');				
			if (cbAfter) cbAfter(err, result);
		});	
	}
}


Database.prototype.allResult = function(tableName, rows, countRows, sql, options) {
	log.debug({options: options}, 'Database.allResult');
	var opts = this.allSanitizeOptions(options);		

	var query = {
		table : tableName
		, select: opts.fields
		, filter : opts.filter
		, orderby: opts.order
		, top: opts.limit
		, skip: opts.offset
		, format: opts.format 
	};


	if (opts.format == 'csv') { 
		if (rows.length > 0) {
			return Papa.unparse(rows, {
				delimiter: opts.delimiter
			});
		} else {
			var fieldNames = _.map(opts.fields, function(f) {
				if (f.table  && f.table != tableName) {
					return f.table + Table.TABLE_FIELD_SEPARATOR + f.field;
				} else {
					return f.field;
				} 
			});
			return fieldNames.join(opts.delimiter);
		}
	} 
	
	var result = { 
		query: query
	};
	
	if (opts.format == 'json-table') {
		result.rows = _.map(rows, function(row) { return _.values(row); } );
		result.columns = rows.length > 0 ? _.keys(rows[0]) : [];

	} else {
		//json
		result.rows = rows;
	}

	

	if (countRows && countRows.length) {
		result.count = countRows[0].count;
		result.totalCount = countRows[1].count;
		
		var expectedCount = result.count - sql.sanitized.offset;
		if (rows.length < expectedCount) {
			result.nextOffset = sql.sanitized.offset + sql.sanitized.limit;
		}
	}

	if (opts.debug) {
		result.sql = sql.query;
		result.sqlParams = sql.params;
		result.sqlTime = sql.secs;
	}		

	log.trace({result: result}, "...Database.allResult()");
	return result;
}

exports.Database = Database;
