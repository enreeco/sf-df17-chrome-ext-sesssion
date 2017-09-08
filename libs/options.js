$(function(){
	"use strict";
	
	var setMessage = function(message){
		var messageBox = $('#messageBox');
		messageBox.html(message);
	}


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
				console.log(params);
				var table = $('<table style="width: 80%"><thead><th>ORG Id</th><th>User Id</th><th>User</th><th>Instance URL</th><th>Issued At</th><th/></thead><tbody></tbody></table>');

				for(var key in params.refresh_tokens){

					var tr = $('<tr>'
							+'<td style="border:1px grey solid;">'+params.refresh_tokens[key].orgId+'</td>'
							+'<td style="border:1px grey solid;">'+params.refresh_tokens[key].userId+'</td>'
							+'<td style="border:1px grey solid;">'+params.refresh_tokens[key].username+'</td>'
							+'<td style="border:1px grey solid;">'+params.refresh_tokens[key].instance_url+'</td>'
							+'<td style="border:1px grey solid;">'+(new Date(parseInt(params.refresh_tokens[key].issued_at))).toISOString()+'</td>'
							+'<td><button class="btn-uinfo">TEST</button> <button class="btn-refresh">REFRESH</button></td>'
						+'</tr>');

					table.find('tbody').append(tr);

					tr.find('button.btn-refresh')
						.attr('data-user-id', params.refresh_tokens[key].userId)
						.attr('data-org-id', params.refresh_tokens[key].orgId)
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

					tr.find('button.btn-uinfo')
						.attr('data-user-id', params.refresh_tokens[key].userId)
						.attr('data-org-id', params.refresh_tokens[key].orgId)
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