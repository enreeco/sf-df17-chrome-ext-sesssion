$(function(){
    "use strict";
    
    var setMessage = function(message){
        var messageBox = $('#messageBox');
        messageBox.html(message+'');
    };

    var sessionId = $Utils.getURLParameter('sid');
    var objectId = $Utils.getURLParameter('id');
    var serverUrl = $Utils.getURLParameter('surl');

    var _sortField = 'label';

    var drawFieldsTable = function(objectDetails, describe){


        var fieldsMap = {};
        describe.fields.forEach(function (d) { fieldsMap[d.name] = d; });

        var table = $('<div>'
            +'<h2>'+describe.label+' <small>[ ' +describe.name+' ]</small></h2>'
            +'<h3>ID: <small>'+objectDetails.Id+'</small></h3>'
            +'<input class="ui-amzext-filter-input" placeholder="Filter columns..."/>'
            +'<table class="ui-amzext-table-fields"><thead>'
            +'<th class="ui-amzext-sort-th" data-sort-by="label"><a>Label</a></th>'
            +'<th class="ui-amzext-sort-th" data-sort-by="name"><a>Name</a></th>'
            +'<th class="ui-amzext-sort-th" data-sort-by="type"><a>Type</a></th>'
            +'<th>Value</th>'
            +'</thead><tbody/></table></div>');
        var tbody = table.find('tbody');

        table.find('th').each(function(evt){
            //sortable columns
            $(this).click(function(){
                var sortBy = $(this).attr('data-sort-by');
                if(!sortBy) return;
                _sortField = sortBy;
                $('#content')
                    .html('')
                    .append(drawFieldsTable(objectDetails, describe));
            });

        });

        //filter input
        table
            .find('input.ui-amzext-filter-input')
            .on('keyup', function(){
                var value = ($(this).val() || '').toLowerCase();
 
                tbody.find('tr').each(function(){
                    var el = $(this);
                    if(el.text().toLowerCase().indexOf(value) >= 0){
                        el.show();
                    }else{
                        el.hide();
                    }
                });
        });

        //filters fields removing "object" fields (e.g. Account.BillingAddress...)
        var fieldsArray = [];
        for(var key in objectDetails){
            if(key === 'attributes'
                || (objectDetails[key] 
                    && typeof objectDetails[key] === 'object')) continue;
            fieldsArray.push(fieldsMap[key]);
        }

        //sorts by field label
        fieldsArray.sort(function(a,b){
            if(!a || !a.label) return 1;
            if(!b || !b.label) return -1;
            var av = (a[_sortField]).toLowerCase();
            var bv = (b[_sortField]).toLowerCase();
            if(av < bv) return -1;
            if(av > bv) return 1;
            return 0;
        });

        for(var i = 0; i < fieldsArray.length; i++){
            var field = fieldsArray[i];
            if(field.type === 'address') continue;
            var tr = $('<tr/>');
            tr
                .attr('data-label', field.label)
                .attr('data-type', field.type)
                .attr('data-name', field.name)
                .append($('<td/>').text(field.label))
                .append($('<td/>').text(field.name))
                .append($('<td/>').text(field.type))
            tbody.append(tr);

            var pre = $('<pre>').html(objectDetails[field.name]);

            //if type is "reference" make it clickable
            if(objectDetails[field.name]
                && field.type === 'reference'){

                var swissKnifeUrl = $Utils.getSwissKnifeUrl(serverUrl,
                        sessionId,
                        objectDetails[field.name]);

                var a = $('<a/>')
                    .attr('href',swissKnifeUrl)
                    .attr('target','_blank')
                    .append(pre);
                tr.append($('<td/>').append(a));
            }else{
                tr.append($('<td/>').append(pre));
            }
        }
        return table;
    };

    

    if(!objectId
        || !sessionId
        || !serverUrl){
        return setMessage('Invalid "sid" and/or "id" and or "surl" parameters. Retry.');
    }

    $Utils.getSobject(serverUrl, sessionId, objectId, function(err, details){
        if(err){
            return setMessage(err);
        }
        $Utils.describeSobject(serverUrl, sessionId, details.attributes.type, function(err, describe){
            console.log(details, describe);
            var table = drawFieldsTable(details, describe);
            $('#content').append(table);
        });
    });

});