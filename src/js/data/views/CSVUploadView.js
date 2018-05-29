/*global Donkeylift, Backbone, jQuery, _ */

Donkeylift.CSVUploadView = Backbone.View.extend({
	el:  '#modalCSVUpload',

	events: {
        'click #modalCSVUploadSubmit': 'evUploadCSVClick',
        'click button.close': 'evCloseClick',
        'change #modalCSVUploadFile': 'evCSVFileSelected'
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

    evCSVFileSelected: function() {
        var file = $('#modalCSVUploadFile').prop('files')[0];
        var reader = new FileReader();
        reader.onload = function(ev) {
            var rows = ev.target.result.split(/\r?\n/);
            var sizeStr;
            if (file.size < 1e3) sizeStr = file.size + ' bytes';
            else if (file.size < 1e6) sizeStr = (file.size / 1e3).toFixed(1) + ' kB';
            else sizeStr = (file.size / 1e6).toFixed(1) + ' MB';
            $('.modalCSVUploadFileInfo div').html(
                  file.name 
                + ' (' + file.type + ')' 
                + ' <br>' + sizeStr 
                + ' ' + rows.length + ' rows'
            );
            $('.modalCSVUploadFileInfo small').html(
                  '<br><b>' + rows[0].substr(0, 80) + '</b>'  
                + '<br>' + rows[1].substr(0, 80)
            );
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


