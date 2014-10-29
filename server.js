#!/usr/bin/env node
var debug = require('debug')('crafatar');
var app = require('./app');

app.set('port', process.env.PORT || 3000);

var server = app.listen(app.get('port'), function() {
  debug('Crafatar server listening on port ' + server.address().port);
});