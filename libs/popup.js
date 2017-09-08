$(function(){
	"use strict";
	
	var content = $('#content');

	//get all stored refresh tokens and create a table
	chrome.storage.local.get(['refresh_tokens'], function(params){
		params = params || {};
		params.refresh_tokens = params.refresh_tokens || {};
		
		var table = $('<table><thead><th>Name</th><th>User</th><th>Instance URL</th><th/></thead><tbody></tbody></table>');

		for(var key in params.refresh_tokens){

			var tr = $('<tr>'
					+'<td style="border:1px grey solid;">'
						+(params.refresh_tokens[key].first_name || '') +' '
						+params.refresh_tokens[key].last_name
					+'</td>'
					+'<td style="border:1px grey solid;">'+params.refresh_tokens[key].username+'</td>'
					+'<td style="border:1px grey solid;">'+params.refresh_tokens[key].instance_url+'</td>'
					+'<td><button class="btn-login">LOGIN</button></td>'
				+'</tr>');

			table.find('tbody').append(tr);

			tr.find('button.btn-login')
				.attr('data-user-id', params.refresh_tokens[key].userId)
				.attr('data-org-id', params.refresh_tokens[key].orgId)
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

						function openTabAndLogin(url, sid){
							var loginUrl = url+'/secur/frontdoor.jsp?sid='+sid;
							chrome.tabs.create({ url: loginUrl });
						};

						return $Utils.getUserInfo(token.id, token.access_token, function(err, result){
							if(err){
								if(err.status === 401 && attemptNumber === 1){
									$Utils.doRefreshToken(token.instance_url, 
										token.refresh_token, 
										function(errRef, data){
											if(errRef){
												return console.log('ERROR OCCURRED while refreshing token: ', errRef);
											}
											token = data;
											return openTabAndLogin(token.instance_url, token.access_token);
										});
									return;
								}
								return;
							}
							return openTabAndLogin(token.instance_url, token.access_token);
						});

					});
				});

		}

		content.append(table);
	});

});