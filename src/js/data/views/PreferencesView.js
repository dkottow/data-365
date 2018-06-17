/*global Donkeylift, Backbone, jQuery, _ */

Donkeylift.PreferencesView = Backbone.View.extend({
	el:  '#modalEditPrefs',

	events: {
		'click #modalEditPrefsApply': 'evPreferencesApplyClick',
		'click #modalEditPrefsSave': 'evPreferencesSaveClick',		
	},

	initialize: function() {
		console.log("PreferencesView.init " + this.model);
	},

	render: function() {
		console.log("PreferencesView.render ");
        $('#modalInputSkipRowCounts').prop('checked', this.model.getPref('skip_row_counts'));
        $('#modalInputShowRowAlias').prop('checked', this.model.getPref('resolve_refs'));
        $('#modalInputLocalizeDatetime').prop('checked', this.model.getPref('localize_datetime'));
		$('#modalEditPrefs').modal();
		return this;
	},

	evPreferencesApplyClick: function() {
        this.model.setPref('skip_row_counts', $('#modalInputSkipRowCounts').is(':checked'));
        this.model.setPref('resolve_refs', $('#modalInputShowRowAlias').is(':checked'));
        this.model.setPref('localize_datetime', $('#modalInputLocalizeDatetime').is(':checked'));
		this.model.apply();
	},

	evPreferencesSaveClick: function() {
		this.model.update();
	}

});


