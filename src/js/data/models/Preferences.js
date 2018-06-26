/*global Donkeylift, Backbone, _ */

Donkeylift.Preferences = Backbone.Model.extend({ 

	initialize : function(attrs) {
        console.log("Preferences.initialize " 
            , attrs.schema.get('name')
            , attrs.table.get('name')
        );
    },

    getPref: function(name) {
        switch(name) {
            case 'skip_row_counts':
                return this.get('table').skipRowCounts();
            case 'resolve_refs':
                return this.get('table').resolveRefs();
            case 'localize_datetime':
            case 'row_select_style':
                return this.get('schema').getProp(name);
            }
    },

    setPref: function(name, value) {
        switch(name) {
            case 'skip_row_counts':
                this.get('table').setProp(name, value);
                break;
            case 'resolve_refs':
                this.get('table').get('fields').each(function(field) {
                    if (field.get('fk') == 1) {
                        field.setProp(name, value);	
                    }
                });
                break;
            case 'localize_datetime':
            case 'row_select_style':
                this.get('schema').setProp(name, value);
                break;
            default:
                console.log("unknown preference '" + name + "´");
        }
    },

    apply: function() {
		Donkeylift.app.resetTable();        
    },

    update: function() {
		var table = this.get('table').get('name');
		this.get('schema').get('props').update({ table: table });
    }
});		
