/*global Donkeylift, Backbone, $, _ */

Donkeylift.MenuDataView = Backbone.View.extend({
	el:  '#menu',

	events: {
		'click #filter-show': 'evFilterShow',
		'click #filter-clear': 'evFilterClear',
		'click #selection-add': 'evSelectionAdd',
		'click #selection-filter': 'evSelectionFilter',
		'click #selection-chown': 'evSelectionChangeOwner',
		'click #csv-copy': 'evCSVCopy',
		'click #csv-download': 'evCSVDownload',
		'click #csv-upload': 'evCSVUpload',
		'click #edit-prefs': 'evEditPrefs',
	},

	initialize: function(opts) {
		console.log("MenuView.init");
		this.listenTo(opts.app.selectedRows, 'update', this.updateSelectionLabel);
		this.listenTo(opts.app.selectedRows, 'reset', this.updateSelectionLabel);
		this.views = {};
	},

	template: _.template($('#data-menu-template').html()),

	render: function() {
		console.log('MenuDataView.render ');			
		if (! Donkeylift.app.table) {
			this.$el.empty();
		} else {
			this.$el.html(this.template());
		}
		return this;
	},

	updateSelectionLabel: function() {
		var selCount = Donkeylift.app.getSelection().length;
		var label = 'Selection';
		if (selCount > 0) label = label + ' (' + selCount + ')';
		$('#selection-dropdown span:first').text(label);
	},

	getShowFilterView: function() {
		if ( ! this.filterShowView) {
			this.filterShowView = new Donkeylift.FilterShowView();
		}
		return this.filterShowView;
	},

	getAllSelectedRows: function() {
		var highlightedRows = Donkeylift.app.tableView.getSelection();
		var allRows = Donkeylift.app.getSelection().clone();
		allRows.add(highlightedRows)
		return allRows.toJSON();
	},

	evFilterShow: function() {
		this.getShowFilterView().collection = Donkeylift.app.filters;
		this.getShowFilterView().render();
	},

	evFilterClear: function() {
		Donkeylift.app.unsetFilters();
		Donkeylift.app.resetTable();	
	},
	
	evSelectionAdd: function(ev) {
		var rows = Donkeylift.app.tableView.getSelection();
		Donkeylift.app.addSelection(rows);
	
		$('#selection-dropdown').dropdown('toggle');	
		return false;
	},

	evSelectionFilter: function(ev) {

		var table = Donkeylift.app.table;
		var rows = this.getAllSelectedRows();

		if (rows.length == 0) {
			$('#selection-dropdown').dropdown('toggle');	
			return false;
		}
		
		var filter = Donkeylift.Filter.Create({
			table: table,
			field: 'id',
			op: Donkeylift.Filter.OPS.IN,
			value: _.pluck(rows, 'id')
		});

		Donkeylift.app.setFilters([ filter ]);
		Donkeylift.app.resetTable();

	},

	getChangeOwnerView: function() {
		if ( ! this.changeOwnerView) {
			this.changeOwnerView = new Donkeylift.ChangeOwnerView();
		}
		return this.changeOwnerView;
	},

	evSelectionChangeOwner: function() {
		var rows = this.getAllSelectedRows();

		if (rows.length == 0) {
			$('#selection-dropdown').dropdown('toggle');	
			return false;
		}
		
		this.getChangeOwnerView().model = new Backbone.Model({ 
			rowIds: _.pluck(rows, 'id'), 
			users: Donkeylift.app.schema.get('users') 
		});
		
		this.getChangeOwnerView().render();
	},
	
	evCSVCopy: function() {
		if (Donkeylift.app.table) {			
			Donkeylift.app.table.getRowsAsCSV(function(err, result) {
				console.log(result);
				$('#csv-textarea').val(result);
				$('#modalCSVShow').modal();
			});		
		}
	},

	getCSVDownloadView: function() {
		if ( ! Donkeylift.app.table) return null;
		if ( ! this.csvDownloadView) {
			this.csvDownloadView = new Donkeylift.CSVDownloadView({ 
				model: Donkeylift.app.table 
			});
		} else {
			this.csvDownloadView.model = Donkeylift.app.table;
		}
		return this.csvDownloadView;
	},

	evCSVDownload: function() {
		var modal = this.getCSVDownloadView();
		if (modal) modal.render();
	},

	getCSVUploadView: function() {
		if ( ! Donkeylift.app.table) return null;
		if ( ! this.csvUploadView) {
			this.csvUploadView = new Donkeylift.CSVUploadView({ 
				model: Donkeylift.app.table 
			});
		} else {
			this.csvUploadView.model = Donkeylift.app.table;
		}
		return this.csvUploadView;
	},

	evCSVUpload: function() {
		var modal = this.getCSVUploadView();
		if (modal) modal.render();
	},
	
	getPreferencesView: function() {
		var prefs = new Donkeylift.Preferences({
			schema: Donkeylift.app.schema,
			table: Donkeylift.app.table
		});
		if ( ! this.preferencesView) {
			this.preferencesView = new Donkeylift.PreferencesView({ 
				model: prefs 
			});
		} else {
			this.preferencesView.model = prefs;
		}
		return this.preferencesView;
	},

	evEditPrefs: function() {
		//TODO
		var modal = this.getPreferencesView();
		modal.render();
	}	
});


