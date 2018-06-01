/*global Donkeylift, Backbone, jQuery, _ */

Donkeylift.CSVUploadView = Backbone.View.extend({
	el:  '#modalCSVUpload',

	events: {
        'click #modalCSVUploadSubmit': 'evUploadCSVClick',
        'click button.close': 'evCloseClick',
        'change #modalCSVUploadFile': 'evCSVFileSelected',
        'change input[name=modalCSVUploadMode]': 'evCSVModeChanged'
	},

	initialize: function() {
		console.log("CSVUploadView.init " + this.model.get('name'));
	},

	render: function() {
		console.log("CSVUploadView.render ");
        this.showResult(false);
        $('#modalCSVUpload').modal();
		return this;
	},

    showResult: function(row) {
        if (row) {
            if (row.Result) {
                $('.modalCSVUploadResult b').html('Result: ' + row.Result);    
                var details = row.ResultDetails;  
                if (row.Result == 'success') {
                    $('.modalCSVUploadResult small').html(
                        row.Action + ' ' + row.Metadata.rows + ' rows.' 
                    );
                } else {
                    $('.modalCSVUploadResult small').html(row.ResultDetails);    
                }
                $('#modalCSVUploadSubmit').prop('disabled', false);
            } else {
                $('.modalCSVUploadResult b').html('Processing...');                    
                $('.modalCSVUploadResult small').html('');    
                $('#modalCSVUploadSubmit').prop('disabled', true);
            }
            $('.modalCSVUploadResult').show();
        } else {
            $('#modalCSVUploadSubmit').prop('disabled', false);
            $('.modalCSVUploadResult').hide();
        }
    },

    evCSVModeChanged: function() {
        if ($('input[name=modalCSVUploadMode][value=update]').prop('checked')) {
            $('.modalCSVUploadMode').toggleClass('text-danger', true);
        } else {
            $('.modalCSVUploadMode').toggleClass('text-danger', false);
        }
    },

    evCSVFileSelected: function() {
        this.showResult(false);
        var file = $('#modalCSVUploadFile').prop('files')[0];
        if ( ! file) return;
        var reader = new FileReader();
        reader.onload = function(ev) {
            var rows = ev.target.result.split(/\r?\n/);

            var sizeStr;
            if (file.size < 1e3) sizeStr = file.size + ' bytes';
            else if (file.size < 1e6) sizeStr = (file.size / 1e3).toFixed(1) + ' kB';
            else sizeStr = (file.size / 1e6).toFixed(1) + ' MB';

            var lastModifiedStr;

            $('.modalCSVUploadFileInfo div').html(
                  file.name 
                + ' (' + file.type + ')' 
                + ' <br>' + sizeStr 
                + ' ' + rows.length + ' lines'
            );
            
            var previewStr = '<b>Failed</b>';

            if (rows && rows.length > 1) {
                previewStr = '<b>' + rows[0].substr(0, 80) + '</b>'  
                + '<br>' + rows[1].substr(0, 80)
            }
            $('.modalCSVUploadFileInfo small').html(previewStr);
            console.log(file, rows.length);
            console.log(rows[0].substr(0, 80) + '\n' + rows[1].substr(0, 80));
        };
        reader.readAsText(file);
	},
   
    checkChangelog: function(changeId, interval) {
        var me = this;
        me.checkFn = setInterval(function() {
            Donkeylift.app.schema.getChangelog(changeId, function(err, changelog) {
                if (err) return;

                if (changelog.Result) {
                    me.showResult(changelog);
                    clearInterval(me.checkFn);
                }
            });
        }, 2000); 
    }, 

    evUploadCSVClick: function() {
        var me = this;
		var files = $('#modalCSVUploadFile').prop('files');
		var options = {};
        options.delimiter = $('#modalCSVUploadFieldDelimiter').val();
        options.replace = $('input[name=modalCSVUploadMode]:checked').val() == 'update' ? 1 : 0;
        if (files.length == 1) {
            this.showResult(true);
            this.model.uploadCSV(files[0], options, function(err, result) {
                console.log('evUploadCSVClick', err, result);
                if (err) return;

                me.checkChangelog(result.id, 2000);
            });
        }
	},
   
    evCloseClick: function() {
        clearInterval(this.checkFn);
    }

});


