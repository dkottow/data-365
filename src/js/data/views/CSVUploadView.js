/*global Donkeylift, Backbone, jQuery, _ */

Donkeylift.CSVUploadView = Backbone.View.extend({
	el:  '#modalCSVUpload',

	events: {
		'click #modalCSVUploadSubmit': 'evUploadCSVClick',
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

                me.checkChangelog(result.id, 3000);
            });
        }
	},

});


