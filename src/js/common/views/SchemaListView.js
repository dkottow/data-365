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
	contentAccountTemplate: _.template($('#content-account-template').html()),
	contentSchemaTemplate: _.template($('#content-schema-template').html()),

	render: function() {

		this.$el.empty();
		this._renderSchemaSelection();
		this._renderCurrentSchemaName();

		this.delegateEvents();

		return this;
	},

	renderAllInfo: function() {
		var $el = $('#content');
		var accounts = this.collection.groupBy(function(schema) {
			return schema.get('account');
		});
		_.each(accounts, function(schemas, account) {
			$('#content').append(this.contentAccountTemplate({ name: account }));
			_.each(schemas, function(schema) {
				var href = Donkeylift.app.pageUrl() + '?' 
					+ 'path=' + schema.get('path');

				var html = this.contentSchemaTemplate({ 
					href: href,
					name: schema.get('name'),
					description: "",
					owners: schema.get('dbOwners').join(', ') 
				});
				$('#content > div:last').append(html);
			}, this);
		}, this);				
	},

	_renderSchemaSelection: function() {
		var schemaCount = 0;
		var accounts = this.collection.groupBy(function(schema) {
			return schema.get('account');
		});
		_.each(accounts, function(schemas, account) {

			if (schemas.length > 0) {
				this.$el.append(
					$('<li>' + account + '</li>')
						.attr('class', 'dropdown-header')					
				);
			}

			_.each(schemas, function(schema) {
				var href = Donkeylift.app.pageUrl() + '?' 
					+ 'path=' + schema.get('path');

					this.$el.append(this.template({ 
					name: schema.get('name'), 
					href: href
				}));
				++schemaCount;	
				console.log(schema.get('path'));
			}, this);

		}, this);
		if (schemaCount == 0) {
			this.$el.closest('li').find('a').attr('data-toggle', '');
			this.$el.closest('li').find('.caret').hide();
			return;
		}

	},

	_renderCurrentSchemaName: function() {
		var $span = this.$el.closest('li').find('a:first span');
		if (Donkeylift.app.schema) {
			$span.html(' ' + Donkeylift.app.schema.get('name') + ' ');
		} else {
			$span.html(' Choose DB ');
		}		
	},

	evSchemaChange: function(ev) {
		console.log('SchemaListView.evSchemaChange ' + $(ev.target).attr('data-target'));
		//Donkeylift.app.router.navigate("?path=" + $(ev.target).attr('data-target'), { trigger: true });					
		//Donkeylift.app.setSchema($(ev.target).attr('data-target'), { reload: true });
	},

});


