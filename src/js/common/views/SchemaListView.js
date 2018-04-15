/*global Donkeylift, Backbone, jQuery, _, $ */

Donkeylift.SchemaListView = Backbone.View.extend({
/*
	id:  'schema-list',
	tagName: 'ul',
	className: 'dropdown-menu',
*/
	events: {
		'click a': 'evSchemaChange',
	},

	initialize: function() {
	},

	el: '#selectDatabase',

	template: _.template($('#nav-schema-template').html()),

	render: function() {

		this.$el.empty();
		this.renderSchemaList();
		this.renderCurrentSchemaName();

		this.delegateEvents();

		return this;
	},

	renderSchemaList: function() {
		var schemaCount = 0;
		var accounts = this.collection.groupBy(function(schema) {
			return schema.get('account');
		});
		_.each(accounts, function(schemas, account) {
			var ownedSchemas = _.filter(schemas, function(schema) {
				return schema.get('isAdmin');
			});

			if (ownedSchemas.length > 0) {
				this.$el.append(
					$('<li>' + account + '</li>')
						.attr('class', 'dropdown-header')					
				);
			}

			_.each(ownedSchemas, function(schema) {
				this.$el.append(this.template({ 
					name: schema.get('name'), 
					value : schema.fullName() 
				}));
				++schemaCount;	
				console.log(schema.fullName());
			}, this);

		}, this);
		if (schemaCount == 0) {
			this.$el.closest('li').find('a').attr('data-toggle', '');
			this.$el.closest('li').find('.caret').hide();
			return;
		}

	},

	renderCurrentSchemaName: function() {
		var $span = this.$el.closest('li').find('a:first span');
		if (Donkeylift.app.schema) {
			$span.html(' ' + Donkeylift.app.schema.get('name') + ' ');
		} else {
			$span.html(' Choose DB ');
		}		
	},

	evSchemaChange: function(ev) {
		console.log('SchemaListView.evSchemaChange ' + $(ev.target).attr('data-target'));
		Donkeylift.app.setSchema($(ev.target).attr('data-target'), { reload: true });
	},

});


