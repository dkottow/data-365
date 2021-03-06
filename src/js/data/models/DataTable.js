/*global Donkeylift, _, Backbone, $ */

var ROWS_EXT = '.rows';
var STATS_EXT = '.stats';
var CHOWN_EXT = '.chown';
var CSV_EXT = '.csv';
var NONCE_EXT = '.nonce';

Donkeylift.DataTable = Donkeylift.Table.extend({

	initialize: function(table) {
		Donkeylift.Table.prototype.initialize.apply(this, arguments);
	},

	fullUrl: function(ext) {
		ext = ext || ROWS_EXT;
		return Donkeylift.env.server + this.get('url') + ext;
	},

	getAllRowsUrl: function() {
		return this.lastFilterUrl;
		//return decodeURI(this.lastFilterUrl).replace(/\t/g, '%09');
	},

	resolveRefs: function() {
		var fk = this.get('fields').find(function(field) { return field.get('fk') == 1 });
		return fk != undefined && fk.resolveRefs();
	},

	sanitizeEditorData: function(req) {
		var me = this;

		try {
			var parseOpts = { validate: true, resolveRefs: this.resolveRefs() };
			var rows = [];
			var method;
			switch(req.action) {
				case 'create':
					method = 'POST';
					rows = _.map(req.data, function(strRow) {
						return me.parse(strRow, parseOpts);
					});
				break;
				case 'edit':
					method = 'PUT';
					rows = _.map(req.data, function(strRow, id) {
						var row = me.parse(strRow, parseOpts);
						row.id = parseInt(id);
						return row;
					});
				break;
				case 'remove':
					method = 'DELETE';
					rows = _.map(_.keys(req.data), function(id) {
						return parseInt(id);
					});
				break;
			}

			var data = JSON.stringify(rows);

		} catch(err) {
			req.error = err;
		}

		req.data = data;
		req.method = method;
	},

	ajaxGetEditorFn: function() {
		var me = this;
		return function(U1, U2, req, success, error) {
			console.log('api call edit row ');
			console.log(req);

			if (req.error) {
				error(null, '', '');
				return;
			}

			var q = ['retmod=true'];
			var url = me.fullUrl() + '?' + q.join('&');

			Donkeylift.ajax(url, {
				method: req.method,
				data: req.data,
				contentType: "application/json",
				processData: false

			}).then(function(result) {
				var response = result.response;
				console.log(response);
				success({data: response.rows});

			}).catch(function(result) {
				error(result.jqXHR, result.textStatus, result.errThrown);
				console.log("Error requesting " + url);
				console.log(result.textStatus + " " + result.errThrown);
			});
		}
	},

	ajaxGetRowsFn: function() {
		var me = this;
		return function(query, callback, settings) {
			console.log('DataTable.ajaxGetRows ', query);

			var orderClauses = [];
			for(var i = 0; i < query.order.length; ++i) {
				var orderCol = query.columns[query.order[i].column].data;
				var orderField = me.getField(orderCol);
				orderClauses.push(encodeURIComponent(
						orderField.vname() + ' ' + query.order[i].dir));
			}
			
			var fieldNames = me.get('fields').map(function(field) {
				return field.vname();
			});
			
			var params = {
				'$select': fieldNames.join(','),
				'$orderby': orderClauses.join(','),
				'$skip': query.start,
				'$top': query.length,
				'counts': me.skipRowCounts() ? 0 : 1
			}

			if (query.search.value.length == 0) {
				//sometimes necessary after back/fwd
				Donkeylift.app.filters.clearFilter(me);
			}
			var filters = Donkeylift.app.filters.clone();
			if (query.search.value.length > 0) {
				filters.setFilter({
					table: me,
					op: Donkeylift.Filter.OPS.SEARCH,
					value: query.search.value
				});
			}			

			var q = Donkeylift.util.paramsToQS(params) + '&' + filters.toParam();

			var url = me.fullUrl() + '?' + q;
			console.log(url);

			me.lastFilterUrl = me.fullUrl() + '?' + filters.toParam();
			me.lastFilterQuery = { 
				order: orderClauses, 
				filters: filters,
				fields:  fieldNames
			};

			Donkeylift.ajax(url, {
				cache: false

			}).then(function(result) {
				var response = result.response;
				//console.dir(response);
				var qf = Donkeylift.util.paramsToQS({
					'$orderby': params.$orderby,
					'$skip': params.$skip, 
					'$top': params.$top
				});
				var fragment = '?path=' + me.get('url') 
					+ '&' + qf
					+ '&' + filters.toParam();

				Donkeylift.app.router.updateNavigation(fragment, {
					block: 100,
					replace: true
				});
				
				var data = {
					data: response.rows,
					recordsTotal: response.totalCount,
					recordsFiltered: response.count,
				};

				if (me.skipRowCounts()) {
					//unknown number of rows.. 
					//if returned data less than queried data length, stop. 
					//otherwise make sure we get a next page.
					data.recordsFiltered = (data.data.length < query.length) 
						? query.start + data.data.length : query.start + query.length + 1;
					data.recordsTotal = data.recordsFiltered;					
				}

				callback(data);
			}).catch(function(result) {
				Donkeylift.app.showException(result, { url: url });
			});
		}
	},

	reload: function() {
		$('#grid').DataTable().ajax.reload();
	},

	load: function(url) {
		$('#grid').DataTable().ajax.url(url).load();
	},

	dataCache: {},

	stats : function(filter, callback) {
		var me = this;

		var fieldName = filter.get('field').vname();

		var params = { '$select' : fieldName };
		var filters = Donkeylift.app.filters.apply(filter);
		var q = Donkeylift.util.paramsToQS(params) + '&' + Donkeylift.Filters.toParam(filters);

		var url = me.fullUrl(STATS_EXT) + '?' + q;

		console.log('stats ' + me.get('name') + '.' + fieldName
					+ ' ' + url);

		if (this.dataCache[url]) {
			callback(this.dataCache[url][fieldName]);

		} else {
			Donkeylift.ajax(url, {
				
			}).then(function(result) {
				var response = result.response;
					//console.dir(response);
				me.dataCache[url] = response;
				callback(response[fieldName]);

			}).catch(function(result) {
				Donkeylift.app.showException(result, { url: url });
			});
		}
	},

	options: function(filter, searchTerm, callback) {
		var me = this;

		var fieldName = filter.get('field').vname();

		var params = {
			'$top': 10,
			'$select': fieldName,
			'$orderby': fieldName
		};

		var filters = Donkeylift.app.filters.apply(filter, searchTerm);
		var q = Donkeylift.util.paramsToQS(params) + '&' + Donkeylift.Filters.toParam(filters);

		var url = this.fullUrl() + '?' + q;

		console.log('options ' + this.get('name') + '.' + fieldName
					+ ' ' + url);

		if (this.dataCache[url]) {
			//console.log(this.dataCache[url]);
			callback(this.dataCache[url]['rows']);

		} else {
			Donkeylift.ajax(url, {

			}).then(function(result) {
				var response = result.response;
					//console.dir(response.rows);
				me.dataCache[url] = response;
				callback(response.rows);

			}).catch(function(result) {
				Donkeylift.app.showException(result, { url: url });
			});
		}
	},

	changeOwner: function(rowIds, owner) {
		var me = this;
		var q = 'owner=' + encodeURIComponent(owner);
		var url = this.fullUrl(CHOWN_EXT) + '?' + q;

		Donkeylift.ajax(url, {
			method: 'PUT',
			data: JSON.stringify(rowIds),
			contentType: "application/json",
			processData: false

		}).then(function(result) {
			var response = result.response;
			console.log(response);
			me.reload();

		}).catch(function(result) {
			Donkeylift.app.showException(result, { url: url });
		});
	},

	getRowsAsCSV: function(cbResult) {
		var me = this;
		if ( ! this.lastFilterQuery) return;

		var q = '$select=' + this.lastFilterQuery.fields.join(',')
			+ '&' + this.lastFilterQuery.filters.toParam()
			+ '&' + '$orderby=' + this.lastFilterQuery.order.join(',')
			+ '&' + 'format=csv'
			+ '&' + 'nocounts=1';

		var url = this.fullUrl() + '?' + q;
		console.log('getRowsAsCSV ' + url);

		Donkeylift.ajax(url, {

		}).then(function(result) {
			cbResult(null, result.response);

		}).catch((result) => {
			Donkeylift.app.showException(result, { url: url });
			cbResult(err);
		});
	},

	encodeDelimiter: function(delimiter) {
		if ( ! delimiter) {
			return delimiter;
		} else if (delimiter == "\\t") {
			return '%09';
		} else {
			return encodeURI(delimiter);
		}
	},

	generateCSV : function(fields, options, cbResult) {
		var me = this;
		options = options || {};

		if ( ! this.lastFilterQuery || ! fields || ! fields.length) return;

		var q = '$select=' + fields.join(',')
			+ '&' + '$orderby=' + this.lastFilterQuery.order.join(',')
			+ '&' + this.lastFilterQuery.filters.toParam()
			+ '&' + 'delimiter=' + this.encodeDelimiter(options.delimiter);

		var path = this.get('url') + CSV_EXT + '?' + q;
		var url = this.fullUrl(NONCE_EXT);

		Donkeylift.ajax(url, {
			type: 'POST',
			data: JSON.stringify({ path: path }),
			contentType:'application/json; charset=utf-8',
			dataType: 'json'

		}).then((result) => {
			var response = result.response;
			var link = this.fullUrl(CSV_EXT) + '?nonce=' + response.nonce;
			cbResult(null, link);
			console.log(response);

		}).catch((result) => {
			Donkeylift.app.showException(result, { url: url });
			cbResult(err);
		});
	},

	uploadCSV : function(file, options, cbResult) {
		var me = this;
		options = options || {};
		var params = { 
			delimiter: this.encodeDelimiter(options.delimiter),
			replace: options.replace
		};

		var q = Donkeylift.util.paramsToQS(params);
		var url = this.fullUrl(CSV_EXT) + '?' + q;
		console.log('uploading..', file);

		var formData = new FormData();
		formData.append('csv', file, file.name);

		Donkeylift.ajax(url, {
			type: 'POST',
			data: formData,
			processData: false,
			contentType: false,
			dataType: 'json'

		}).then((result) => {
			console.log('uploadCSV', result.response);
			cbResult(null, result.response.changelog);

		}).catch((result) => {
			Donkeylift.app.showException(result, { url: url });
			cbResult(result);
		});
	},

	skipRowCounts: function() {
		return this.getProp('skip_row_counts') === true;
	},

});


