/*global Donkeylift, Backbone, _ */

//console.log("Table class def");
Donkeylift.View = Backbone.Model.extend({ 
	
	initialize: function(view) {
		console.log("View.initialize " + view.name);
		var fields = _.map( _.sortBy(view.fields, 'order'), 
					function(field) {
			return new Donkeylift.Field(field);
		});			
		this.set('fields', new Donkeylift.Fields(fields));
		//relations and row_alias are set in initRefs
	},

	getFieldQN: function(field) {
		return _.isString(field) 
			? this.get('name') + '.' + field
			: this.get('name') + '.' + field.get('name');
	},

	attrJSON: function() {
		return _.clone(this.attributes);
	},		

    dataCache: {},
    
	fieldValues: function(fieldName, searchTerm, callback) {
 		var me = this;

		var filterTerm = [
			fieldName, 
			Donkeylift.Filter.OPS.SEARCH, 
			"'" + searchTerm + "'"
		].join(' ');

		var params = {
			'$top': 10,
			'$select': fieldName,
			'$orderby': fieldName,
			'$filter': filterTerm
		};

		var q = _.map(params, function(v,k) { return k + "=" + encodeURIComponent(v); })
				.join('&');

		var url = this.fullUrl() + '?' + q;
		console.log(url);
		if (this.dataCache[url]) {
			//console.log(this.dataCache[url]);
			callback(this.dataCache[url]['rows'], { cached: true });

		} else {
			Donkeylift.ajax(url, {})
			
			.then(function(result) {
				var response = result.response;
				//console.dir(response.rows);
				me.dataCache[url] = response;
				callback(response.rows);
			});
		}
	},


	sanitizeFieldOrdering: function() {
		var orderedFields = this.get('fields').sortBy(function(f) {
			return f.getProp('order');
		});	
		for(var i = 0; i < orderedFields.length; ++i) {
			orderedFields[i].setProp('order', 10*(i + 1));
		}
	}

});

