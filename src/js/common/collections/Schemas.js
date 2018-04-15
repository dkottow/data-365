/*global Donkeylift, Backbone, _ */

// Tables Collection
// ---------------

Donkeylift.Schemas = Backbone.Collection.extend({
	// Reference to this collection's model.
	model: Donkeylift.Schema,

	initialize : function(attrs) {
	},

});

Donkeylift.Schemas.Create = function(rows, opts) {
    opts = opts || {};

    var schemas = {};
    _.each(rows, function(row) {
        schemas[row.Account + row.Database] = { account: row.Account, name: row.Database };
    });
    schemas = _.values(schemas);

    _.each(schemas, function(schema) {
        schema.isAdmin = !! _.find(rows, function(row) { 
            return row.Account == schema.account 
                && row.Database == schema.name 
                && row.UserPrincipalName == opts.user; 
        });
        schema.dbOwners = _.pluck(_.filter(rows, function(row) {
            return row.Account == schema.account 
                && row.Database == schema.name 
                && row.Scope == "Database";
        }), "UserPrincipalName");
    });

    return new Donkeylift.Schemas(schemas);
}
