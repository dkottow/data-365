/*global Donkeylift, Backbone, _ */

// Tables Collection
// ---------------

Donkeylift.Schemas = Backbone.Collection.extend({
	// Reference to this collection's model.
	model: Donkeylift.Schema,

	initialize : function(attrs) {
	},

});

Donkeylift.Schemas.Create = function(rows) {
    var schemas = _.map(rows, function(row) {
        return new Donkeylift.Schema({
            account: row.Account,
            name: row.Database,
            owner: row.UserPrincipalName
        });
    });

    schemas = _.groupBy(schemas, function(schema) {
        return schema.get('path');
    });

    schemas = _.map(schemas, function(pathSchemas, path) {
        let schema = pathSchemas[0];
        let owners = _.map(pathSchemas, function(s) { return s.get('owner'); });
        schema.set('dbOwners', owners);
        return schema;
    });

    return new Donkeylift.Schemas(schemas);
}

