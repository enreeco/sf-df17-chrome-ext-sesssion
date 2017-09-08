# Amazing Salesforce Chrome Extension

## Introduction

The extension provides the following features:
* Login with OAuth in different ORGS (option page), with refresh token
* Uses the access token to get all fields of a given SObject

Uses [Web Server OAuth Flow](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/intro_understanding_web_server_oauth_flow.htm) with Connected App configured with **Require Secret for Web Server Flow** to avoid passing the *Consumer Secret*.

