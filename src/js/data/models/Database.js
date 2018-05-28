/*global Donkeylift, Backbone, _ */

Donkeylift.Database = Donkeylift.Schema.extend({ 

	initialize : function(attrs, options) {
		console.log("Database.initialize " + (attrs.name || ''));
		Donkeylift.Schema.prototype.initialize.call(this, attrs);
	},

	parseTables : function(response) {
		console.log("Database.parseTables " + response);

		var tables = _.map(response.tables, function(table) {
			return new Donkeylift.DataTable(table);
		});
		response.tables = new Donkeylift.Tables(tables);
		return response;
	},

	localizeDatetime: function() {
		return this.getProp('localize_datetime');		
	},

	getChangelog : function(id, cbResult) {
		var url = this.url() + '/' + Donkeylift.Changelog.TABLE
			+ '?' + '$filter=id eq ' + id; 

		Donkeylift.ajax(url, {
			cache: false

		}).then(function(result) {
			console.log('getChangelog', result.response);
			var changelog = result.response.rows[0];
			changelog.Metadata = JSON.parse(changelog.Metadata);
			cbResult(null, changelog);
			
		}).catch((result) => {
			console.log("Error requesting " + url);
			var err = new Error(result.jqXHR.responseText);
			console.log(err);
			alert(err.message);
			cbResult(err);
		});
	}
});		

Donkeylift.Changelog = {};
Donkeylift.Changelog.TABLE = '_d365Changelog';
