/*global Donkeylift, Backbone, _ */
//var pegParser = module.exports;

(function () {
	'use strict';

	Donkeylift.RouterData = Backbone.Router.extend({

        routes: {
			"?path=*path": "routeNavigate"
        },

		routeNavigate: function(path) {
			var params = this.parseParams('path=' + path);
			Donkeylift.app.setSchema(params.path, function() {
				if (params.path.match(Donkeylift.Table.PathRE)) {

					var filters = _.map(params.$filter, function(f) {
						return Donkeylift.Filter.Create(f);
					});
					if (_.contains(filters, null)) {
						console.log('error parsing $filter param. no filters added');
					} else {
						Donkeylift.app.setFilters(filters);
					}
	
					Donkeylift.app.setTable(params.path.match(Donkeylift.Table.PathRE)[1], params);
				}
			});			
		},

		navGotoTable: function(tablePath) {
			console.log('navGotoTable', tablePath);
			var table;
			if (tablePath.indexOf('/') > 0) {
				table = tablePath.split('/')[0];
				var kv = tablePath.split('/')[1].split('=');
				var filterTable;
				if (kv[0].indexOf('.') > 0) {
					filterTable = kv[0].substr(0, kv[0].indexOf('.'));
				} else {
					filterTable = table;
				}
				Donkeylift.app.filters.setFilter({
					table: filterTable,
					field: 'id',
					op: Donkeylift.Filter.OPS.EQUAL,
					value: kv[1]
				});
			} else {
				table = tablePath;
			}

			Donkeylift.app.setTable(table);
		},

		navReloadTable: function() {
			Donkeylift.app.table.reload();
		},

		parseParams: function(paramStr) {
			var params = {};
			_.each(paramStr.split('&'), function(p) {
				var ps = p.split('=');
				var k = decodeURIComponent(ps[0]);
				var v = ps.length > 1 
						? decodeURIComponent(ps[1])
						:  decodeURIComponent(ps[0]);
				if (k[0] == '$') {
					var param = pegParser.parse(k + "=" + v);
					params[param.name] = param.value;
				} else {
					params[k] = v;
				}
			});
			//console.dir(params);
			return params;
		},

		blockGotoUrl: function(ms) {
			ms = ms || 1000;
			var me = this;
			this.isBlockedGotoUrl = true;
			window.setTimeout(function() {
				me.isBlockedGotoUrl = false;
			}, ms);
		},

		updateNavigation: function(query, options) {
			console.log('update nav', query, options); 
			options = options || {};
			if (options.block > 0) {
				this.blockGotoUrl(options.block); //avoid inmediate reolad FF
			}
			this.navigate(query, { replace: options.replace });
		},	
		
	});


})();
