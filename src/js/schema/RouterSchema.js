/*global Donkeylift, Backbone, _ */

(function () {
	'use strict';

	Donkeylift.RouterSchema = Backbone.Router.extend({

        routes: {
			"?path=/:account/:schema": "routeNavigate"
        },

		routeNavigate: function(account, schema) {
			Donkeylift.app.setSchema('/' + account + '/' + schema);
		},

		navGotoTable: function(table) {
			Donkeylift.app.setTable(table);	
		},

        
	});


})();
