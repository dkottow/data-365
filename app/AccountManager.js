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

var _ = require('underscore');
var util = require('util');

var config = require('config'); 
var log = require('./log.js').log;

var Account = require('./Account.js').Account;

function AccountManager() {
	this.accounts = {};
}

/* interfaces

AccountManager.prototype.init = function(cbAfter) {
}

AccountManager.prototype.create = function(name, cbAfter) {
}

*/

AccountManager.prototype.list = function() {
	var result = {};
	result.accounts = _.map(this.accounts, function(ac) {
		return { name: ac.name };
	});
	return result;
}

AccountManager.prototype.get = function(name) { 
	return this.accounts[name];
}

AccountManager.prototype.masterDatabase = function() { 
    var masterAccount = Account.MASTER;
    if (config.accounts) {
        masterAccount = config.accounts[0]; //_.keys(this.accounts)[0];
    }
    return this.accounts[masterAccount].master(); 
}

exports.AccountManager = AccountManager;

