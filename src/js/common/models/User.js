/*global Backbone, Donkeylift, $ */

Donkeylift.User = Backbone.Model.extend({

	initialize: function(attrs) {		
		console.log("User.initialize");		
		console.log(attrs);
	},

    upn: function() {
        return this.get('user');
    },

	userInfo: function() {
		return this.get('user').split('@')[0] + ' | ' + this.get('principal');
	},

	isAdmin : function() {
		return this.get('principal').toLowerCase() == Donkeylift.User.PRINCIPAL.Admin;
	}

});

Donkeylift.User.PRINCIPAL = {
    Admin: 'admin',
    Everyone: 'everyone'
};

