/**
 * @author Enrico Murru (@enreeco)
 * @link https://blog.enree.co
 * @description Popup's controller
 */
$(function(){
	"use strict";
	
	var content = $('#content');

	//get all stored refresh tokens and create a table
	chrome.storage.local.get(['refresh_tokens'], function(params){
		params = params || {};
		params.refresh_tokens = params.refresh_tokens || {};
		
		var table = $('<table><thead><tr>'
			+'<th scope="col">User</th>'
			+'<th scope="col">Instance URL</th>'
			+'<th scope="col"/>'
			+'<tr></thead><tbody></tbody></table>');
		table.addClass('slds-table slds-table_cell-buffer slds-table_striped');
		table.find('tr').addClass('slds-text-title_caps');

		//sort refresh tokens by username
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

		//creates a row for each stored token
		for(var i = 0; i < sorted.length; i++){

			//gets the instance name
			var instance = (sorted[i].instance_url) || '';
			instance = instance.replace('https://','').split('.')[0];

			var tr = $('<tr>'
					+'<td ><small>'
						+(sorted[i].first_name || '') +' '
						+sorted[i].last_name
						+'</small><br/>'
						+'<strong>'+sorted[i].username+'</strong>'
					+'</td>'
					+'<td >'+instance+'</td>'
					+'<td><button class="btn-login slds-button slds-button_neutral">login</button></td>'
				+'</tr>');

			table.find('tbody').append(tr);

			//login button handler
			tr.find('button.btn-login')
				.attr('data-user-id', sorted[i].userId)
				.attr('data-org-id', sorted[i].orgId)
				.click(function(){

					var userId = $(this).attr('data-user-id');
					var orgId = $(this).attr('data-org-id');
					

					//searches for the tokens of the given user
					return chrome.storage.local.get(['refresh_tokens'], function(params){

						params = params || {};
						params.refresh_tokens = params.refresh_tokens || {};

						var token = params.refresh_tokens[userId+'_'+orgId];
						if(!token){
							return alert('Tokens not found');
						}

						//redirect to salesforce session id confirmation page
						function openTabAndLogin(url, sid){
							var loginUrl = url+'/secur/frontdoor.jsp?sid='+sid;
							chrome.tabs.create({ url: loginUrl });
						};

						//uses the "getUserInfo" call to understand if
						//a session token is still valid
						return $Utils.getUserInfo(token.id, token.access_token, function(err, result){
							if(err){
								//session token is not valid => needs refresh
								if(err.status === 401 
									|| err.status === 403){

									//tries the refresh token call
									$Utils.doRefreshToken(token.instance_url, 
										token.refresh_token, 
										function(errRef, data){
											if(errRef){
												return alert('ERROR OCCURRED while refreshing token: ', errRef);
											}
											token = data;
											//confirm session token on Salesforce
											return openTabAndLogin(token.instance_url, token.access_token);
										});
									return;
								}
								return;
							}
							//confirm session token on Salesforce
							return openTabAndLogin(token.instance_url, token.access_token);
						});

					});
				});

		}

		content.append(table);

		//redirects to options page to configure more tokens 
		$('#options-link').click(function() {
			//this function is not available on Chrome < 42
			if (chrome.runtime.openOptionsPage) {
				// New way to open options pages, if supported (Chrome 42+).
				chrome.runtime.openOptionsPage();
			} else {
				// Reasonable fallback.
				window.open(chrome.runtime.getURL('options.html'));
			}
		});
	});

});