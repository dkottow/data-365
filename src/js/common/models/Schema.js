/*global _, $, Donkeylift, Backbone, jsonpatch */

Donkeylift.Schema = Backbone.Model.extend({

	initialize: function(attrs) {
		console.log("Schema.initialize ", attrs);
		if (attrs.path) {
			var match = attrs.path.match(Donkeylift.Schema.PathRE);
			if ( ! match) {
				throw new Error('Schema path does not match');
			}
			this.set('account', match[1]);
			this.set('name', match[2]);		

		} else {
			this.set('path', '/' + attrs.account + '/' + attrs.name);
		}

		if ( ! attrs.tables) {
			this.set('tables', new Donkeylift.Tables());
		}
		//this.set('id', attrs.name); //unset me when new
		this.set('props', new Donkeylift.Properties(null, { schema: this }));
		
	},

	attrJSON: function() {
		return _.clone(this.attributes);
	},		

	toJSON : function() {

		var tables = this.get('tables').toJSON();
		tables =  _.object(_.pluck(tables, 'name'), tables);

		return {
			name: this.get('name'),
			tables: tables
		};
	},	

/*	
	isEmpty : function() {
		var totalRowCount = this.get('tables').reduce(function(sum, table) {
			return sum + table.get('row_count');
		}, 0);	
		console.log(this.get('name') + ' has ' + totalRowCount + ' rows.');
		return totalRowCount == 0;
	},
*/
	getTables: function() {
		return this.get('tables').sortBy(function(t) { return t.get('name'); });
	},

	getTable: function(name) {
		return this.get('tables').getByName(name);
	},

	getProp: function(name) {
		return Donkeylift.app.getProp(name);
	},

	setProp: function(name, value) {
		Donkeylift.app.setProp(name, value);
	},

	parse : function(response) {
		console.log("Schema.parse " + response);
		response = this.parseTables(response);
		return response;
	},

	parseTables: function(response) {
		var tables = _.map(response.tables, function(table) {
			return new Donkeylift.Table(table);
		});
		response.tables = new Donkeylift.Tables(tables);
		return response;		
	},

	url : function(params) {
		var url = Donkeylift.env.server + '/' + this.get('account') + '/' + this.get('name');
		if (params) {
			var urlParams = _.map(params, function(v, k) { 
				return k + '=' + encodeURI(v) 
			}).join('&');  
			url += '?' + urlParams; 
		}
		return url;
	},

	fetch : function(cbAfter) {
		var me = this;
		console.log("Schema.fetch...");
		var url = me.url({ reload : 1 });		
		me.bbFetch({
			success: function(response) {
				me.orgJSON = JSON.parse(JSON.stringify(me.toJSON())); //copy
				me.setPropertyAccessors();
				console.log("Schema.fetch OK");
				me.get('props').fetch(function() {
					cbAfter(response);
				});					
			},
			error: function(err) {
				console.log(err);
				alert(err.message);
			},
			url: url
		});
	},

    bbFetch: function(options) {
		//minimally adapted from backbone.js
		options = _.extend({parse: true}, options);
		var model = this;

		var url = options.url || this.url();
		//use Donkeylift.ajax instead of Backbone.sync
		Donkeylift.ajax(url, {

		}).then(function(result) {
			var resp = result.response;

			var serverAttrs = options.parse ? model.parse(resp, options) : resp;
			if (!model.set(serverAttrs, options)) return false;
			if (options.success) options.success.call(options.context, resp);
			model.trigger('sync', model, resp, options);

		}).catch(function(result) {
			Donkeylift.app.showException(result, { url: url });
		});

	},	

	setPropertyAccessors : function() {
		this.get('tables').each(function(table) {
			table.setPropertyAccessors();
		});
	},
	
	update : function(cbAfter) {
		var me = this;
		if ( ! this.updateDebounced) {
			this.updateDebounced = _.debounce(function(cbAfter) {
				var diff = jsonpatch.compare(me.orgJSON, me.toJSON());
				console.log('Schema.update');		
				console.log(JSON.stringify(diff));		
				if (diff.length > 0) {
					me.patch(diff, function(err, result) {
						
						if (err) {
							alert(err.message); //TODO make me nicer.
						} 

						console.log(result);
						var attrs = me.parse(result);
						me.set(attrs);
						me.orgJSON = JSON.parse(JSON.stringify(me.toJSON())); //copy
						if (cbAfter) cbAfter();
						//reset schema in browser

					});
				}
			}, 1000);
		}
//TODO re-enable and fix
/*
if (cbAfter) cbAfter();
return;
*/
		this.updateDebounced(cbAfter);
	},

	patch : function(diff, cbResult) {
		console.log("Schema.patch...");
		var url = this.url();
		Donkeylift.ajax(url, {
			method: 'PATCH'
			, data: JSON.stringify(diff)
			, contentType: "application/json"
			, processData: false

		}).then(function(result) {
			var response = result.response;
			console.log(response);
			cbResult(null, response);

		}).catch(function(result) {
			var jqXHR = result.jqXHR;
			console.log("Error requesting " + url);
			console.log(result.errThrown + " " + result.textStatus);
			cbResult(new Error(result.errThrown + " " + jqXHR.responseJSON.error), jqXHR.responseJSON.schema);
		});
		
	},

	save : function(cbResult) {
		console.log("Schema.save...");

		var saveOptions = {
			url: this.url()
			, success: function(model) {

				//reload schema list
				Donkeylift.app.account.fetch({
					reset: true,
					success: function() {
						cbResult();
					},
					error: function(model, response) {
						cbResult(response);
					}
				});
			}
			, error: function(model, response) {
				console.log("Schema.save ERROR");
				console.dir(response);
				cbResult(response);
			}
		};

		//set id to (new) name
		this.set('id', this.get('path'));
		console.log("Schema.save " + saveOptions.url);

		Backbone.Model.prototype.save.call(this, null, saveOptions);
	},


	destroy: function(cbResult) {
		var destroyOptions = {
			success: function() {			
				Donkeylift.app.unsetSchema();

				//reload schema list
				Donkeylift.app.account.fetch({
					reset: true,
					success: function() {
						cbResult();
					},
					error: function(model, response) {
						cbResult(response);
					}
				});
			},
			error: function(model, response) {
				console.dir(response);
				cbResult(response);
			}
		};

		Backbone.Model.prototype.destroy.call(this, destroyOptions);
	},

	getFieldFromQN: function(fieldQName) {
		var parts = fieldQName.split('.');
		var table = this.getTable(parts[0]);
		var field = table.getField(parts[1]);
		return { table: table, field: field };
	},

});

Donkeylift.Schema.PathRE = /^\/(\w+)\/(\w+)/; // e.g. /test/sandwiches/customers.rows 
