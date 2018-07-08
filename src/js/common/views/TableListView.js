/*global Donkeylift, Backbone, jQuery, _ */

Donkeylift.TableListView = Backbone.View.extend({

/*	
	id: "table-list",
	className: "list-group",
*/

	events: {
		'click .table-item': 'evTableClick',
		'change #selectShowTables': 'evSelectShowTableChange'
	},

	initialize: function() {
		console.log("TableListView.init " + this.model.get('name'));
		this.listenTo(this.model.get('tables'), 'update', this.render);
		this.listenTo(this.model.get('tables'), 'change', this.render);
	},

	template: _.template($('#table-list-template').html()),
	itemTemplate: _.template($('#table-item-template').html()),

	render: function() {
		var me = this;
		console.log('TableListView.render ');	
		this.$el.html(this.template());
		var tables = this.model.getTables(); //sorted alphabetically
		_.each(tables, function(table) {
			if (table.visible()) {
				this.$('#table-list-items').append(this.itemTemplate({
					name: table.get('name')
				}));
			}	
			$('#selectShowTables').append(
				$('<option></option>')
					.attr('value', table.get('name'))
					.text(table.get('name'))
					.prop('selected', table.visible())						
			);
		}, this);	
		$('#selectShowTables').selectpicker('refresh');

		$('#selectShowTables').on('hidden.bs.select', function (e) {
			me.render();
		});
		return this;
	},

	evTableClick: function(ev) {
		console.log('evTableClick ' + $(ev.target).attr('data-target'));
		Donkeylift.app.router.navGotoTable($(ev.target).attr('data-target'));
	},
	
	evSelectShowTableChange: function(ev) {
		var me = this;
		$('#selectShowTables option').each(function() {
			var table = me.model.getTable( $(this).val() );
			table.setProp('visible', $(this).prop('selected'));	
		});
	}
});



