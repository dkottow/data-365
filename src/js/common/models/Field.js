/*global Donkeylift, Backbone, _ */

function escapeStr(str) {
	return str.replace("'", "\\'");
}

Donkeylift.Field = Backbone.Model.extend({
	initialize: function(field) {
		this.set('disabled', field.disabled == true);		
	},

	resolveRefs: function() { 
		//auto join row alias for fk values, default true
		return ! (this.getProp('resolve_refs') === false)
	},

	vname: function() {

		if (this.resolveRefs() && this.get('fk') == 1) {
			if (this.get('name').match(/id$/)) { 
				return this.get('name').replace(/id$/, "ref");
			} else {
				return this.get('name') + "_ref";
			}
/* TODO			
		} else if (this.get('name') == 'id' && resolveRefs) {
			return 'ref'; 
*/
		} else {
			return this.get('name');
		}
	},

	typeName: function() {
		return Donkeylift.Field.typeName(this.get('type'));
	},

	setType: function(typeName, typeSuffix) {
		if ( ! Donkeylift.Field.TYPES[typeName]) {
			throw new Error("setType failed. Unknown type '" + typeName + "'");
		}	
		if (typeName == 'text' && typeSuffix.length > 0) {
			var length = typeSuffix.toUpperCase() == 'MAX' ? 'MAX' : parseInt(typeSuffix);
			this.set('type', typeName + '(' + length + ')');

		} else if (typeName == 'decimal' && typeSuffix.length > 0) {
			var parts = typeSuffix.split(',');
			this.set('type', typeName + '(' + parseInt(parts[0]) + ',' + parseInt(parts[1]) + ')');

		} else {
			this.set('type', typeName);
		}
	},

	typeSuffix: function() {
		return Donkeylift.Field.typeSuffix(this.get('type'));
	},

	getProp: function(name) {
		if ( ! this.propKey) return undefined;
		return Donkeylift.app.getProp(this.propKey(name));
	},

	setProp: function(name, value) {
		if ( ! this.propKey) return;
		Donkeylift.app.setProp(this.propKey(name), value);
	},

	allProps : function() {
		//TODO
	},

	visible: function() {
		var visible = this.getProp('visible');
		if (visible === undefined) {
			//hide if system field or name starts with _ 
			visible = !	(
				this.get('name')[0] == '_' || 
				_.contains(Donkeylift.Table.SYSTEM_FIELDS, this.get('name'))
			);	
		}  
		return visible;
	},

	attrJSON: function() {
		var attrs = _.clone(_.omit(this.attributes, 'props'));
		attrs.props = this.allProps();
		//attrs.props = this.get('props').attributes;
		return attrs;
	},

	toJSON: function() {
		//var type = Donkeylift.Field.ALIAS[this.get('type')];

		return {
			name: this.get('name'),
			type: this.get('type'),
			disabled: this.get('disabled'),
			props: this.allProps()
		};
	},

	parse: function(val, opts) {
		opts = opts || {};
		var validate = opts.validate || false;
		var resolveRefs = opts.resolveRefs || false;
		var result = null;
		var resultError = true;

		//empty string becomes null	
		if ( ! val || val.length == 0) return result;

		var t = this.typeName();

		if (this.get('fk') == 1 && resolveRefs) {
			result = Donkeylift.Field.getIdFromRef(val);
			resultError = isNaN(result); 

		} else if (this.get('fk') == 1 && ! resolveRefs) {
			result = val.toString();
			resultError = false;

		} else if (t == Donkeylift.Field.TYPES.text) {
			result = val.toString();
			resultError = false;

		} else if (t == Donkeylift.Field.TYPES.integer) {
			result = parseInt(val);
			resultError = isNaN(result); 

		} else if(t == Donkeylift.Field.TYPES.decimal) {
			result = parseFloat(val);
			resultError = isNaN(result); 

		} else if(t == Donkeylift.Field.TYPES.date) {
			//dont parse, leave as yyyy-mm-dd string
			result = val.substr(0,4) + '-' + val.substr(5,2) + '-' + val.substr(8,2);
			//result = new Date(val.substr(0,4), val.substr(5,2) -1, val.substr(8,2));
			resultError = isNaN(Date.parse(val)); 
			//if ( ! resultError) result = result.toISOString().substr(0,10);

		} else if (t == Donkeylift.Field.TYPES.timestamp) {
			//return new Date(val);
			result = new Date(val);
			resultError = isNaN(Date.parse(val)); 
			//if ( ! resultError) result = result.toISOString();

		} else if (t == Donkeylift.Field.TYPES.float) {
			result = parseFloat(val);
			resultError = isNaN(result); 

		} else if (t == Donkeylift.Field.TYPES.boolean) {
			result = Boolean(JSON.parse(val));
			resultError = false; 
		}

		if (validate && resultError) {
			var err;
			if (this.get('fk') == 1) {
				err = new Error("Parse '" + val + "' ref failed.");
			} else {
				err = new Error("Parse '" + val + "'" + " to " + t + " failed.");
			}
			err.field = this.vname(opts);
			throw err;
		}
		return result;
	},

	//to formatted string (pretty-print)
	toFS: function(val) {
		//console.log(val);
		var t = this.typeName();
		if (_.isNumber(val) && this.getProp('scale')) {
			return val.toFixed(this.getProp('scale'));
		} else if (t == 'date') {
			if (Donkeylift.app.schema.localizeDatetime()) {
				var d = new Date(val.substr(0,4), val.substr(5,2) -1, val.substr(8,2));
				return d.toLocaleDateString(navigator.language);
			} else {
				//truncate eventual time portion
				return val.substring(0,10);
			}
		} else if (t == 'timestamp') {
			if (Donkeylift.app.schema.localizeDatetime()) {
				return this.parse(val).toLocaleString(navigator.language);
			} else {
				//JSON - Date ISO string
				return this.parse(val).toISOString();
			}
		} else if (t == 'text') {
			return _.escape(String(val));
		} else {
			return String(val);
		}
	},

	//to query string
	toQS: function(val, opts) {
		opts = opts || {};
		var resolveRefs = opts.resolveRefs || false;

		if (val === null) return "null";

		if (this.get('fk') == 1 && resolveRefs) {
			return Donkeylift.Field.getIdFromRef(val);
		} else if (this.get('fk') == 1 && ! resolveRefs) {
			return "'" + escapeStr(val) + "'";
		}

		var t = this.typeName();

		if (   t == Donkeylift.Field.TYPES.integer 
			|| t == Donkeylift.Field.TYPES.decimal
			|| t == Donkeylift.Field.TYPES.float
			|| t == Donkeylift.Field.TYPES.boolean) 
		{
			return val;

		} else {
			return "'" + escapeStr(val) + "'";
		}
	},

	setTypeByExample: function(val) {
		if (String(parseInt(val)) == val) {
			this.set('type', Donkeylift.Field.TYPES.integer);
			return;
		} 
		var num = val.replace(/[^0-9-.]/g, '');
		console.log(num);
		if (num.length > 0 && ! isNaN(num)) {
			this.set('type', Donkeylift.Field.TYPES.decimal);
			//TODO set precision
			return;
		} 
		if ( ! isNaN(Date.parse(val))) {
			this.set('type', Donkeylift.Field.TYPES.date);
			return;
		} 
		this.set('type', Donkeylift.Field.TYPES.text);
	},

	setStats: function(stats) {
		this.set('stats', {
			//min: this.toFS(stats.min),
			//max: this.toFS(stats.max)
			min: stats.min,
			max: stats.max
		});		
	}

});

Donkeylift.Field.create = function(name) {
	return new Donkeylift.Field({
		name: name,
		type: Donkeylift.Field.TYPES.text,
	});
}


Donkeylift.Field.TYPES = {
	text: 'text', 
	integer: 'integer', 
	decimal: 'decimal', 
	date: 'date', 
	timestamp: 'timestamp', 
	float: 'float',
	boolean: 'boolean'
};

Donkeylift.Field.typeName = function(fieldType) 
{
    var m = fieldType.match(/^[a-z]+/);
    if (m && m.length > 0) return m[0];
    return null;
}

Donkeylift.Field.typeSuffix = function(fieldType) 
{
    var m = fieldType.match(/\(([0-9]+,?[0-9]*)\)$/);
    if (m && m.length > 1) return m[1];
    return '';
}

Donkeylift.Field.toDate = function(dateISOString) {
	return new Date(dateISOString.split('-')[0],
					dateISOString.split('-')[1] - 1,
					dateISOString.split('-')[2]);
}

Donkeylift.Field.forceUTCDateString = function(dateISOString) {
	if (dateISOString.length > 10 &&  ! dateISOString.match(/Z$/)) {
		return dateISOString + 'Z';
	}
	return dateISOString;
}

Donkeylift.Field.getIdFromRef = function(val) {
	if (_.isNumber(val)) return val;
	//extract fk from ref such as 'Book [12]'
	var m = val.match(/^(.*)\[([0-9]+)\]$/);
	//console.log(val + " matches " + m);
	if (m && m.length == 3) return parseInt(m[2]);
	else return NaN;
}



