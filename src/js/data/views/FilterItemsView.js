/*global Donkeylift, Backbone, $, _ */

Donkeylift.FilterItemsView = Backbone.View.extend({

	events: {
		'click #selectNulls': 'evFilterItemsNulls',
		'click #selectAll': 'evFilterItemsAll',
		'click #selectReset': 'evFilterItemsReset',
		'click .filter-option': 'evFilterOptionClick',
		'click .filter-selected': 'evFilterSelectedClick',
		'input #inputFilterItemsSearch': 'evInputFilterSearchChange',
	},

	initialize: function () {
		console.log("FilterItemsView.init " + this.model.get('table'));
	},

	template: _.template($('#filter-option-template').html()),

	loadRender: function() {
		var me = this;
		var s = this.$('#inputFilterItemsSearch').val();
		this.model.loadOptions(s, function() {
			me.render();
		});
	},

	render: function() {
		var field = this.model.get('field');
		this.$('a[href=#filterSelect]').tab('show');

		this.$('#filterSelection').empty();
		var current = Donkeylift.app.filters.getFilter(
						this.model.get('table'),
						this.model.get('field'));

		if (current && current.get('op') == Donkeylift.Filter.OPS.IN) {
			//get values from filter
			var selected = current.get('value');		
//console.log(selected);
			_.each(selected, function(val) {
				this.$('#filterSelection').append(this.template({
					name: 'filter-selected',
					value: val,
					label: field.toFS(val) 
				}));
			}, this);
		}

		this.$('#filterOptions').empty();
		_.each(field.get('options'), function(opt) {
			this.$('#filterOptions').append(this.template({
				name: 'filter-option',
				value: opt[field.vname()],
				label: field.toFS(opt[field.vname()])
			}));
		}, this);
	},

	setFilter: function() {
		var filterValues = this.$('#filterSelection').children()
			.map(function() {
				return $(this).attr('data-value');
		}).get();

		Donkeylift.app.filters.setFilter({
			table: this.model.get('table'),
			field: this.model.get('field'),
			op: Donkeylift.Filter.OPS.IN,
			value: filterValues
		});
		
		Donkeylift.app.router.navReloadTable();			
	},

	clearFilter: function() {
		Donkeylift.app.filters.clearFilter(this.model.get('table'), this.model.get('field'));
		Donkeylift.app.router.navReloadTable();
	},

	evFilterOptionClick: function(ev) {
		ev.stopPropagation();
		//console.log(ev.target);
		var field = this.model.get('field');
		var val = $(ev.target).attr('data-value');
		var attr = '[data-value="' + val + '"]';

		//avoid duplicate items in filterSelection
		if (this.$('#filterSelection').has(attr).length == 0) {
			var item = this.template({
				name: 'filter-selected',
				value: val,
				label: field.toFS(val)
			});
			this.$('#filterSelection').append(item);
			this.setFilter();
		}
	},

	evFilterSelectedClick: function(ev) {
		ev.stopPropagation();
		//console.log(ev.target);
		$(ev.target).remove();
		if (this.$('#filterSelection').length > 0) {
			this.setFilter();
		} else {
			this.clearFilter();
		}
	},

	evInputFilterSearchChange: function(ev) {
		this.loadRender();
	},


	evFilterItemsReset: function() {
		this.$('#filterSelection').empty();			
		this.$('#inputFilterItemsSearch').val('');

		this.clearFilter();
		
		this.loadRender();
	},

	evFilterItemsAll: function() {
		this.$('#filterSelection').empty();			

		Donkeylift.app.filters.setFilter({
			table: this.model.get('table'),
			field: this.model.get('field'),
			op: Donkeylift.Filter.OPS.NOTEQUAL,
			value: null
		});
		Donkeylift.app.router.navReloadTable();

		this.loadRender();
	},

	evFilterItemsNulls: function() {
		this.$('#filterSelection').empty();			

		Donkeylift.app.filters.setFilter({
			table: this.model.get('table'),
			field: this.model.get('field'),
			op: Donkeylift.Filter.OPS.EQUAL,
			value: null
		});
		Donkeylift.app.router.navReloadTable();

		this.loadRender();
	},
	
});


