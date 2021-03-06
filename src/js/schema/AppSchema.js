/*global Backbone, Donkeylift, $ */

function AppSchema(params) {
	
	Donkeylift.AppBase.call(this, params);

	this.menuView = new Donkeylift.MenuSchemaView();
	this.router = new Donkeylift.RouterSchema();
	this.editorDialogs = {};

}

AppSchema.prototype = Object.create(Donkeylift.AppBase.prototype);
AppSchema.prototype.constructor=AppSchema; 

AppSchema.prototype.pageUrl = function() {
	return '/schema.html';
}

AppSchema.prototype.createTableView = function(table, params) {
	return new Donkeylift.SchemaTableView({model: table});
}

AppSchema.prototype.createSchema = function(path) {
	return new Donkeylift.Schema({path : path});
}

AppSchema.prototype.updateSchema = function(cbAfter) {
	Donkeylift.app.schema.update(function() {
		Donkeylift.app.resetTable();
		if (cbAfter) cbAfter();
	});
}

AppSchema.prototype.getEditorModal = function(name) {
	var editor = this.editorDialogs[name];
	if ( ! editor) {
		switch(name) {
			case 'table':
				editor = new Donkeylift.TableEditView();
				break;
			case 'field':
				editor = new Donkeylift.FieldEditView();
				break;
			case 'relation':
				editor = new Donkeylift.RelationEditView();
				break;
			case 'alias':
				editor = new Donkeylift.AliasEditView();
				break;
		}
		this.editorDialogs[name] = editor;
	}
	return editor;
}

AppSchema.prototype.getTableEditor = function() {
	return this.getEditorModal('table');
}

AppSchema.prototype.getFieldEditor = function() {
	return this.getEditorModal('field');
}

AppSchema.prototype.getRelationEditor = function() {
	var editor = this.getEditorModal('relation');
	editor.schema = this.schema;
	editor.table = this.table;
	return editor;
}

AppSchema.prototype.getAliasEditor = function() {
	return this.getEditorModal('alias');
}

Donkeylift.AppSchema = AppSchema;


