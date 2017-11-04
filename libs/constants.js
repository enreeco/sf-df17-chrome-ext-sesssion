/**
 * @author Enrico Murru (@enreeco)
 * @link https://blog.enree.co
 * @description Plugin's Constants
 */
window.$Constants = window.$Constants || (function(){
    "use strict";
    return{
        //internal constant (messages sent to background)
        MESSAGES: {
            GET_ORG_ID_BKG: 'BKG-GET-ORG-SID',
        },
        //main Salesforce API level
        API_LEVEL: '40.0',
        //client ID from Salesforce connected app
        CLIENT_ID: '@REPLACE_WITH_VALID_CONSUMER_KEY_FROM_CONNECTED_APP',
    };
})();