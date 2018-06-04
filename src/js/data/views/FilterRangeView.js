/*global Donkeylift, Backbone, jQuery, _, $, noUiSlider */

Donkeylift.FilterRangeView = Backbone.View.extend({

	events: {
		//range filter evs
		'click #rangeReset': 'evFilterRangeResetClick',
		'change #inputFilterMin': 'evInputFilterChange',
		'change #inputFilterMax': 'evInputFilterChange',
	},

	initialize: function () {
		console.log("FilterRangeView.init " + this.model.get('table'));
	},

	render: function() {
		this.$('a[href=#filterRange]').tab('show');

		this._renderMinMaxInputs();
		this._renderSlider();
		this._renderDateTimePicker();

	},

	evInputFilterChange: function(ev) {

		var filterValues, boundValues;
		var stats = this.model.get('field').get('stats');

		if (this._canSlide()) {
			filterValues = [
				parseFloat($("#inputFilterMin").val()),
				parseFloat($("#inputFilterMax").val())
			];
			$('#inputSliderRange').slider('setValue', filterValues, false, false);

		} else if (this._isDatetime()) {
			filterValues = [
				$('#inputFilterMin').data("DateTimePicker").date().toISOString(),
				$('#inputFilterMax').data("DateTimePicker").date().toISOString()
			];

		} else {
			filterValues = [ $("#inputFilterMin").val(), $("#inputFilterMax").val() ];
		}

		if (filterValues[0] < stats.min) filterValues[0] = stats.min;
		if (filterValues[1] > stats.max) filterValues[1] = stats.max;

		if (filterValues[0] != stats.min || filterValues[1] != stats.max) {
			Donkeylift.app.filters.setFilter({
				table: this.model.get('table'),
				field: this.model.get('field'),
				op: Donkeylift.Filter.OPS.BETWEEN,
				value: filterValues
			});
		} else {
			Donkeylift.app.filters.clearFilter(this.model.get('table'), 
									this.model.get('field'));
		}

		Donkeylift.app.router.navReloadTable();
		//window.location.hash = "#reload-table";
	},

	evFilterRangeResetClick: function() {
		Donkeylift.app.filters.clearFilter(this.model.get('table'), 
								this.model.get('field'));

		Donkeylift.app.router.navReloadTable();
		//window.location.hash = "#reload-table";
		this.render();
	},
	
	_renderMinMaxInputs: function() {
		var stats = this.model.get('field').get('stats');

		var current = Donkeylift.app.filters.getFilter(
						this.model.get('table'),
						this.model.get('field'));
		var min, max;	
		if (current && current.get('op') == Donkeylift.Filter.OPS.BETWEEN) {
			min = current.get('value')[0];
			max = current.get('value')[1];
		} else {
			min = stats.min;
			max = stats.max;
		}	

		$("#inputFilterMin").val(this.model.get('field').toFS(min));
		$("#inputFilterMax").val(this.model.get('field').toFS(max));
	},

	_renderSlider: function() {

		if (this._canSlide()) {

			$('#sliderRange').show();
			$('#inputSliderRange').css('width', '100%');

			var stats = this.model.get('field').get('stats');
			var sliderValues = [ 
				parseFloat(this.$("#inputFilterMin").val()),
				parseFloat(this.$("#inputFilterMax").val())
			];

			if ($('#inputSliderRange').attr('data-slider-value').length == 0) {
				//instantiate slider

				if (this.model.get('field').get('type') == Donkeylift.Field.TYPES.integer) {
					$('#inputSliderRange').attr('data-slider-step', 1);
				} else {
					$('#inputSliderRange').attr('data-slider-step', Math.max((stats.max - stats.min) / 100, 1e-6));
				}
	
				$('#inputSliderRange').attr('data-slider-value', '[' + sliderValues.toString() + ']');
				$('#inputSliderRange').attr('data-slider-min', stats.min);
				$('#inputSliderRange').attr('data-slider-max', stats.max);
				
				$('#inputSliderRange').slider({});
				
				$('#inputSliderRange').on("slide", function(slideEvt) {
					$("#inputFilterMin").val(slideEvt.value[0]);
					$("#inputFilterMax").val(slideEvt.value[1]);
				});			

				$('#inputSliderRange').on('slideStop', function() {
					$("#inputFilterMin").change();
					$("#inputFilterMax").change();
				});
			} else {
				//just set the value
				$('#inputSliderRange').slider('setValue', sliderValues);
			}			
		} else {
			$('#sliderRange').hide();
		}
		
	},

	_renderDateTimePicker: function() {
		var me = this;

		if ( ! this._isDatetime()) {
			return;
		}

		var fieldType = this.model.get('field').get('type');

		var opts = {
			disabledHours: fieldType == Donkeylift.Field.TYPES.DATE,
			debug: false,
			widgetPositioning: {
				horizontal: 'auto',
				vertical: 'bottom'
			}
		}

		if (Donkeylift.app.schema.localizeDatetime()) {
			opts.locale = navigator.language;
			if (fieldType == Donkeylift.Field.TYPES.date) opts.format = 'L';
		} else if (fieldType == Donkeylift.Field.TYPES.date) {
			opts.format = 'YYYY-MM-DD';
		} else if (fieldType == Donkeylift.Field.TYPES.timestamp) {
			opts.format = 'YYYY-MM-DDTHH:mm:ss.SSS';
		}

		var evChangeDate = function(ev) {

			/* we need some massaging on date event handling:
				*    1) only trigger filter event if date changes.
				*    2) if input value is of type timestamp, 
				* 		 we force it to be UTC by making sure the datetime string ends with Z.
				*/

			if (ev.oldDate) {

				me.evInputFilterChange(ev);
			}

		}

		$('#inputFilterMin').on('dp.change', evChangeDate);
		$('#inputFilterMax').on('dp.change', evChangeDate);

		$("#inputFilterMin").datetimepicker(opts);
		$("#inputFilterMax").datetimepicker(opts);

	},
	
	_isDatetime: function() {
		var dateTypes = [
			Donkeylift.Field.TYPES.date,
			Donkeylift.Field.TYPES.timestamp
		];

		return _.contains(dateTypes, this.model.get('field').get('type'));
	},
	
	_canSlide: function() {
		if (this.model.get('field').get('fk')) return false;

		return _.contains([
			Donkeylift.Field.TYPES.integer,
			Donkeylift.Field.TYPES.decimal,
			Donkeylift.Field.TYPES.float
		], Donkeylift.Field.typeName(
			this.model.get('field').get('type')			
		));
	},

	loadRender: function() {
		var me = this;
		this.model.loadRange(function() {
			me.render();
		});
	},
	
});


