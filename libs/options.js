/**
 * @author Enrico Murru (@enreeco)
 * @link https://blog.enree.co
 * @description Options page
 */
$(function(){
	"use strict";
	
	var setMessage = function(message){
		var messageBox = $('#messageBox');
		messageBox.html(message);
	};


	//checks url
	return $Utils.parseOAuthPageUrlWebServerFlow(function(isFromOAuth, details){

		//successfull Oauth 
		if(isFromOAuth && !details){
			//removes current URL from browser to avoid storing the token
			window.location.replace('/options.html');
			return;
		}

		//error on Oauth 
		if(isFromOAuth && details){
			alert('Error on OAuth');
			setMessage(JSON.stringify(details,null,2));
			return;
		}

		//normal init page
		if(!isFromOAuth && !details){
			
			var content = $('#content');

			//login button
			$('#btnLogin').click(function(){
				var server = $('#server').val();
	            if(server == '0') server = 'https://login.salesforce.com';
	            else server = 'https://test.salesforce.com';
	            $Utils.startOAuthFlow(server);
			});

			//get all stored refresh tokens and create a table
			chrome.storage.local.get(['refresh_tokens'], function(params){
				params = params || {};
				params.refresh_tokens = params.refresh_tokens || {};
				var table = $('<table style="width: 80%"><thead><tr>'
					+'<th scope="col">User</th>'
					+'<th scope="col">Instance</th>'
					+'<th scope="col">ORG Id</th>'
					+'<th scope="col">User Id</th>'
					+'<th scope="col">Issued At</th>'
					+'<th scope="col"/>'
					+'</tr></thead><tbody></tbody></table>');

				table.addClass('slds-table slds-table_cell-buffer slds-table_striped');
				table.find('tr').addClass('slds-text-title_caps');

				//sorts stored tokens by username
				var sorted = [];
				for(var key in params.refresh_tokens){
					sorted.push(params.refresh_tokens[key]);
				}
				sorted.sort(function(a,b){
					if(!a) return 1;
					if(!b) return -1;
					var a = (a.username || '').toLowerCase();
					var b = (b.username || '').toLowerCase();
					if(a < b) return -1;
					else if(a > b) return 1;
					return 0;
				});

				//creates a new row for each token stored
				for(var i = 0; i < sorted.length; i++){
					var instance = (sorted[i].instance_url) || '';
					instance = instance.replace('https://','').split('.')[0];
					var tr = $('<tr >'
							+'<td>'+sorted[i].username+'</td>'
							+'<td>'+instance+'</td>'
							+'<td>'+sorted[i].orgId+'</td>'
							+'<td>'+sorted[i].userId+'</td>'
							+'<td>'+(new Date(parseInt(sorted[i].issued_at))).toISOString()+'</td>'
							+'<td><button class="btn-uinfo slds-button slds-button_neutral">test</button>'
							+'<button class="btn-refresh slds-button  slds-button_destructive">refresh</button></td>'
						+'</tr>');

					table.find('tbody').append(tr);

					//refresh token handler
					tr.find('button.btn-refresh')
						.attr('data-user-id', sorted[i].userId)
						.attr('data-org-id', sorted[i].orgId)
						.click(function(){

							var userId = $(this).attr('data-user-id');
							var orgId = $(this).attr('data-org-id');

							setMessage('Loading...');

							//searches for the tokens of the given user
							return chrome.storage.local.get(['refresh_tokens'], function(params){

								params = params || {};
								params.refresh_tokens = params.refresh_tokens || {};

								var token = params.refresh_tokens[userId+'_'+orgId];
								if(!token){
									return alert('Tokens not found');
								}

								return $Utils.doRefreshToken(token.instance_url, 
										token.refresh_token, 
										function(err, results){
									if(err){
										return setMessage('ERROR OCCURRED:\n'+JSON.stringify(err,null,2));
									}
									window.location.reload();
								});
							});
						});

					//test connection button
					tr.find('button.btn-uinfo')
						.attr('data-user-id', sorted[i].userId)
						.attr('data-org-id', sorted[i].orgId)
						.click(function(){

							var userId = $(this).attr('data-user-id');
							var orgId = $(this).attr('data-org-id');

							setMessage('Loading...');

							//searches for the tokens of the given user
							return chrome.storage.local.get(['refresh_tokens'], function(params){

								params = params || {};
								params.refresh_tokens = params.refresh_tokens || {};

								var token = params.refresh_tokens[userId+'_'+orgId];
								if(!token){
									return alert('Tokens not found');
								}

								//does a "getUserInfo" call
								return $Utils.getUserInfo(token.id, token.access_token, function(err, result){
									if(err){
										return setMessage('ERROR OCCURRED:'+JSON.stringify(err,null,2));
									}
									return setMessage(JSON.stringify(result,null,2));
								});
							});	
						});
				}

				content.append(table);
			});
			return;
		}
	});

});