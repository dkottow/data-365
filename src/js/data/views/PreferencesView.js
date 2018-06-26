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
		$('#modalInputRowSelectUsingCtrlShiftClick').prop('checked', 
			! (this.model.getPref('row_select_style') == 'multi')
		);
		$('#modalEditPrefs').modal();
		return this;
	},

	setValues: function() {
        this.model.setPref('skip_row_counts', $('#modalInputSkipRowCounts').is(':checked'));
        this.model.setPref('resolve_refs', $('#modalInputShowRowAlias').is(':checked'));
		this.model.setPref('localize_datetime', $('#modalInputLocalizeDatetime').is(':checked'));
		if ($('#modalInputRowSelectUsingCtrlShiftClick').is(':checked')) {
			this.model.setPref('row_select_style', 'os');
		} else {
			this.model.setPref('row_select_style', 'multi');
		}
	},

	evPreferencesApplyClick: function() {
		this.setValues();
		this.model.apply();
	},

	evPreferencesSaveClick: function() {
		this.setValues();
		this.model.update();
	}

});


