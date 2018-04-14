/*global Donkeylift, Backbone, jQuery, _, $ */

Donkeylift.NavbarView = Backbone.View.extend({
	el:  'nav',

	events: {
	},

	initialize: function(attrs) {
		this.schemaListView = new Donkeylift.SchemaListView({
			collection: attrs.model.schemas,
		});
	},

	render: function() {
		this.schemaListView.render();
		this.renderUserInfo();
		return this;
	},

	renderUserInfo: function() {
		$('#user-info').html(' ' + this.model.user.userInfo() + ' ');	
	}

});


