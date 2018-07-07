/*global Donkeylift, Backbone, jQuery, _, $ */

Donkeylift.DataTableView = Backbone.View.extend({

	id: 'grid-panel',
	className: 'panel',

	events: {
		'click .data-cell': 'evDataCellClick',
	},

	initialize: function() {
		console.log("DataTableView.init ", this.model, this.attributes);
		this.attributes = this.attributes || {};
		this.listenTo(Donkeylift.app.filters, 'update', this.renderStateFilterButtons);
	},

	tableTemplate: _.template($('#grid-table-template').html()),
	columnTemplate: _.template($('#grid-column-template').html()),
	buttonWrapTextTemplate: _.template($('#grid-button-wrap-text-template').html()),

	isReadOnly: function() {
		return this.model.get('readOnly') == true; 
	},

	renderStateFilterButtons: function() {
		var fields = this.getColumnFields();
		_.each(fields, function(field, idx) {
			
			var filter = Donkeylift.app.filters.getFilter(
					this.model, 
					field.get('name')
				);
			
			var active = filter ? true : false;
			var $el = this.$('#col-' + field.vname() + ' button').first();
			$el.toggleClass('filter-btn-active', active); 

		}, this);
	},

	renderTextWrapCheck: function() {
		
		this.$('#grid_length').prepend(this.buttonWrapTextTemplate());
		this.$('#grid_wrap_text').click(function(ev) {
			var currentWrap = $("table.dataTable").css("white-space");
			var toggleWrap = currentWrap == 'normal' ? 'nowrap' : 'normal';
				
			$("table.dataTable").css("white-space", toggleWrap);
			$('#grid_wrap_text span')
				.toggleClass("glyphicon-text-height glyphicon-text-width");
		});

	},

	getOptions: function(params, fields) {
		params = params || {};
		var dtOptions = {};
		
		dtOptions.lengthMenu = params.lengthMenu || [5, 10, 25, 50, 100, 500];

		dtOptions.displayStart = params.$skip || 0;
		dtOptions.pageLength = params.$top || 10;

		dtOptions.selectStyle = Donkeylift.app.getProp('row_select_style') || 'os'; // 'multi'

		dtOptions.order = [];
		if (params.$orderby) {
			for(var i = 0; i < params.$orderby.length; ++i) {
				var orderName = params.$orderby[i].field;
				var orderDir = params.$orderby[i].order; 
				for(var j = 0; j < fields.length; ++j) {
					if (fields[j].vname() == orderName) {
						dtOptions.order.push([j, orderDir]);
					}
				}
			}
		}
		if (dtOptions.order.length == 0) {
			dtOptions.order.push([0, 'asc']);
		}

		var totalWidth = _.reduce(fields, function(s, f) {
			return s + f.getProp('width');
		}, 0);

		var columns = _.map(fields, function(field) {
			var col = {
				data: field.vname()
			}

			var width = (100 * field.getProp('width')) / totalWidth;
			col.width = String(Math.floor(width)) + '%';
			col.visible = field.visible();
			col.render = this.columnDataFn(field);

			return col;
		}, this);

		dtOptions.columns = columns;

		return dtOptions;
	},

	getEditorOptions: function() {
		var me = this;
		var dtEditorOptions = {};

		dtEditorOptions.fields = _.map(this.getEditorFields(), function(field) {
			var edField = {};

			edField.name = field.vname(); 
			edField.label = field.vname(); 

			if (field.get('type') == Donkeylift.Field.TYPES.date) {
				edField.type = 'datetime';
				edField.data = function(data, type, set) {
					if (type === 'set') {
						data[edField.name] = set;
					}
					return data[edField.name].substr(0,10);
				}

			} else if (field.getProp('width') > 60) {
				edField.type = 'textarea';

			} else if (field.get('fk') == 1) {
				var sourceFn = function(q, syncCb, asyncCb) {
					var fkTable = Donkeylift.app.schema.getTable(field.get('fk_table'));
					
					fkTable.fieldValues('ref', q, function(rows, info) {
						var options = _.map(rows, function(row) {
							return row.ref;
						});
						//console.log(options);
						if (info && info.cached) syncCb(options);
						else asyncCb(options);
					});
				}
				edField.type = 'typeahead';
				edField.opts = {
						options: {
							hint: false
						}
						, source: sourceFn 
				};

			} else {
				edField.type = 'text';
			}
			return edField;
		});

		return dtEditorOptions;
	},

	getColumnFields: function() {
		var enabledFields = new Donkeylift.Fields(this.model.get('fields').filter(function(field) {
			return ! field.get('disabled');
		}));
		return enabledFields.sortByOrder();
	},

	getEditorFields: function() {
		
		var editFields = _.filter(this.getColumnFields(), function(field) {
			return ! _.contains(Donkeylift.Table.NONEDITABLE_FIELDS, field.get('name'));
		});
		
		if (Donkeylift.app.user.isAdmin()) {
			return editFields;

		} else {		
			//only db-owner is allowed to change own_by fields.
			return _.reject(editFields, function(field) {
				return field.get('name') == 'own_by'; 
			});
		}
	},


	render: function() {
		var me = this;
		
		console.log('DataTableView.render ');			
		this.$el.html(this.tableTemplate());

		var fields = this.getColumnFields();
		_.each(fields, function(field, idx) {
			var align = idx < fields.length / 2 ? 
				'dropdown-menu-left' : 'dropdown-menu-right';
			
			//this.$('thead > tr').append('<th>' + field.vname() + '</th>');
			var colHtml = this.columnTemplate({
				name: field.vname(),
				dropalign: align	
			});
			this.$('thead > tr').append(colHtml);
			this.$('#col-' + field.vname() + ' .field-filter').click( function(ev) {
				me.evFilterButtonClick(ev);
			});

		}, this);

		
		this.renderStateFilterButtons();

		var filter = Donkeylift.app.filters.getFilter(this.model);			
		var initSearch = {};
		if (filter) initSearch.search = filter.get('value');

		var dtOptions = this.getOptions(this.attributes.params, fields);
		var dtEditorOptions = this.getEditorOptions();
		//console.log(dtEditorOptions);
		if ( ! this.isReadOnly()) {
			this.dataEditor = new $.fn.dataTable.Editor({
				table: '#grid',
				idSrc: 'id',
				fields: dtEditorOptions.fields,
				display: 'bootstrap',
				formOptions: {
					main: { 
						focus: -1 
					}
				},
				ajax: this.model.ajaxGetEditorFn(),
			});
		}

		var dtSettings = {
			serverSide: true,
			columns: dtOptions.columns,				
			ajax: this.model.ajaxGetRowsFn(),
			search: initSearch,
			lengthMenu: dtOptions.lengthMenu, 
			displayStart: dtOptions.displayStart, 
			pageLength: dtOptions.pageLength, 
			order: dtOptions.order,
			select: {
				style: dtOptions.selectStyle
			},
			colReorder: true,
			//dom: "lfrtip",
			buttons: [
				{ extend: 'colvis', text: 'Show Columns' }
			]
			
		};

		if (! this.isReadOnly()) {
			dtSettings.buttons = dtSettings.buttons.concat([
				{ extend: 'create', editor: this.dataEditor },
				{ extend: 'edit', editor: this.dataEditor },
				{ extend: 'remove', editor: this.dataEditor }
			]);
		}

		this.dataTable = this.$('#grid').DataTable(dtSettings);

		if (filter) {
			this.$('#grid_filter input').val(filter.get('value'));
		}

		this.renderTextWrapCheck();
	
		this.addEvents();

		/* trigger preInit.dt event since the table was added dynamically
		   and this event seems to be triggered by DT on dom load.
		   see comment in datatables source about 'Initialisation' in select plugin */
		$(document).trigger('preInit.dt', this.dataTable.settings() );
		//this.dataTable.select(); 

		return this;
	},

	evFilterButtonClick: function(ev) {
		ev.stopPropagation();

		var colName = $(ev.target).closest('button').data('column');

		var filter = new Donkeylift.Filter({
			table: this.model,
			field: this.model.getField(colName)
		}); //TODO - avoid using ctor directly

		var th = this.$('#col-' + colName);
		Donkeylift.app.setFilterView(filter, th);

	},

	addButtonEllipsisEvent: function() {
		
		//expand ellipsis on click
		this.$('button.ellipsis-init').click(function(ev) {				
			//wrap text before expaning
			$(ev.target).parents('span').css('white-space', 'normal');	

			var fullText = $(ev.target).parents('span').attr('title');
			$(ev.target).parents('span').html(fullText);
			console.log('ellipsis click ' + $(ev.target).text());
		});
		//dont add click handler again
		this.$('button.ellipsis-init').removeClass('ellipsis-init');
	},

	addEvents: function() {
		var me = this;

		this.dataTable.on('draw.dt', function() {
			me.addButtonEllipsisEvent();
		});

		this.dataTable.on('page.dt', function() {
			console.log("page.dt");
			Donkeylift.app.router.navigate(); //push browser history
			//Donkeylift.app.router.navReloadTable();	
		});

		this.dataTable.on('init.dt', function() {
			console.log("init.dt");

			me.dataTable.buttons().container()
				.removeClass('dt-buttons')
				.addClass('btn-group');

			me.dataTable.buttons().container().children()
				.removeClass('dt-button')
				.addClass('btn btn-default navbar-btn')

			$('#menu').append(me.dataTable.buttons().container());

			//customize to our bootstrap grid model which has 16, not 12 columns
			me.$('#grid_filter').parent()
				.removeClass('col-sm-6')
				.addClass('col-sm-10'); 
			me.$('#grid').parent()
				.removeClass('col-sm-12')
				.addClass('col-sm-16'); 
			me.$('#grid_paginate').parent()
				.removeClass('col-sm-7')
				.addClass('col-sm-11'); 
	
		});

		this.dataTable.on('buttons-action.dt', function (e, buttonApi, dataTable, node, config) {
			me.addButtonEllipsisEvent();
			if ($(buttonApi.node()).hasClass('buttons-columnVisibility')) {
				//set visibility prop of field according to Datatable colvis button	
				var field = me.model.getField(buttonApi.text());
				var visible = $(buttonApi.node()).hasClass('active');
				//TODO props vs prefs 
				field.setProp('visible', visible);
			}
		});

		//using order.dt event won't work because its fired otherwise, too

		this.$('th.sorting').click(function() {
			console.log("order.dt");
			Donkeylift.app.router.navigate(); //push browser history
			//Donkeylift.app.router.navReloadTable();			
		});

		//using search.dt event won't work because its fired otherwise, too
/*
		this.$('input[type="search"]').blur(function() {
			console.log("search.dt");
			Donkeylift.app.router.navigate("reload-table", {trigger: false});			
		});
		this.$('input[type="search"]').focus(function() {
			console.log("search.dt");
			Donkeylift.app.router.navigate("reload-table", {trigger: false});			
		});
*/
		this.dataTable.on('column-reorder', function (e, settings, details) {
			$(document).mouseup(function() {
				var columnOrders = me.dataTable.colReorder.order();
				//console.log('column-reorder done.', columnOrders);
				_.each(columnOrders, function(pos, idx) {
					var field = settings.aoColumns[pos].data;
					//TODO props vs prefs 
					me.model.getField(field).setProp('order', pos);
					//console.log('col idx ' + idx + ' ' + field + ' order ' + pos) 
				});

			});
		});

		if (this.dataEditor) {
			this.dataEditor.on('preSubmit', function(ev, req, action) {
				me.model.sanitizeEditorData(req);
				if (req.error) {
					me.dataEditor.error(req.error.field, req.error.message);
				}
			});

			this.dataEditor.on('submitError', function(ev, xhr, err, thrown, data) {
				me.dataEditor.error(xhr.responseText);
			});
		}		
	},

	evDataCellClick: function(ev) {
		console.log('evDataCellClick ' + $(ev.target).attr('data-target'));
		Donkeylift.app.router.navGotoTable($(ev.target).attr('data-target'));
	},

	columnDataFn: function(field) {

		var me = this;

		var btnExpand = '<button class="ellipsis ellipsis-init btn btn-default btn-xs"><span class="glyphicon glyphicon-option-horizontal" aria-hidden="true"></span></button>'
		var w = field.getProp('width');
		var abbrFn = function (data) {
			var s = field.toFS(data);
	   		return s.length > w
				//?  '<span title="' + s.replace(/"/g, '&quot;') + '">'
				?  '<span title="' + s + '">'
					+ s.substr( 0, w)
					+ ' ' + btnExpand
				: s;
		}

		var anchorFn = undefined;
		if (field.get('name') == 'id' 
			&& me.model.get('referenced') 
			&& me.model.get('referenced').length > 0) {
			//link to table rows referencing this id.
			anchorFn = function(id) {
				var target = me.model.get('referenced')[0].table
					+ '/' + me.model.get('name') + '.id=' + id;

				return '<a href="#" data-target="' + target + '" class="data-cell">' + id + '</a>';
			}

		} else if (field.get('fk') == 1) {
			//link to referenced table row.
			anchorFn = function(ref) {
				var target = field.get('fk_table')
					+ '/id=' + Donkeylift.Field.getIdFromRef(ref);

				return '<a href="#" data-target="' + target + '" class="data-cell">' + ref + '</a>';
			}
		}

		var dataFn = function (data, type, full, meta ) {

			if (type == 'display' && data) {
				return anchorFn ? anchorFn(data) : abbrFn(data);
			} else {
				return data;
			}
		}								

		return dataFn;	
	},
	
	getSelection: function() {
		return this.dataTable.rows({selected: true}).data().toArray();
	}

});


