/*
   Copyright 2016 Daniel Kottow

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

var express = require('express');
var config = require('config');

var AccountManager = require('./AccountManagerFactory.js').AccountManagerFactory;

var ApiController = require('./ApiController.js').ApiController;

var app = express();
var log = require('./log.js').log;

var accounts;
var controller;

var accountConfig;

if (config.sql.engine == 'sqlite') {
	accountConfig = config.sql.dataDir;

} else if (config.sql.engine == 'mssql') {
	accountConfig = config.sql.connection;
}

accountConfig.accounts = config.accounts;

app.init = function(cbAfter) {
	log.info({config: accountConfig}, 'app.init()...');
	accounts = AccountManager.create(accountConfig);
	controller = new ApiController(accounts, { auth: config.auth });
	
	accounts.init(function(err) {
		if (err) throw err;
		initRoutes(function() {
			cbAfter();			
			log.info('...app.init()');
		});
	});
}

function initRoutes(cbAfter) {

	//enable CORS
	if (config.http.cors) {
		app.use(function(req, res, next) {
			res.header("Access-Control-Allow-Credentials", "true");
			res.header("Access-Control-Allow-Origin", config.http.headers.AccessControlAllowOrigin);
			res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, PATCH, OPTIONS'); 
			res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Access-Control-Request-Method, Access-Control-Request-Headers");
			if (req.method == 'OPTIONS') res.status(200).send();
			else next();
		});
	}

	controller.init(function(err) {
		if (err) throw err;

		app.use(config.apiRoute, controller.router);

		//other routes static (only used for testing, when node is standalone)
		app.use('/', express.static('./public', { fallthrough: false }));
	
		//uncaught exception handling 
		app.use(function(err, req, res, next) {
	
			log.debug({err: err}, 'app.use()...');
	
			if (res.headersSent) {
				return next(err);
			}
	
			log.error({req: req, err: err}, err.message);
			res.status(500).send({error: err.message});
		
			log.debug('...app.use');
		});

		cbAfter();
	});

}

exports.app = app; //you call app.init / app.listen to start server
