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

		//add user defined views as well
		var views = _.filter(response.views, function(view) {
			return ! view.name.match(/^_d365/);
		});
		views = _.map(views, function(view) {
			view.readOnly = true; //mark as read only
			return new Donkeylift.DataTable(view);
		});
		response.views = new Donkeylift.Tables(views);


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
			Donkeylift.app.showException(result, { url: url });
			cbResult(err);
		});
	}
});		

Donkeylift.Changelog = {};
Donkeylift.Changelog.TABLE = '_d365Changelog';
