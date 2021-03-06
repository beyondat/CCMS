//////////////////////////////////////////////////
//
//  CCMS - ccms.js
//
//  Purpose: To create server
//  Created: 2013.12.11
//
//////////////////////////////////////////////////

// Module dependencies
var express = require('express');
var http = require('http');
var path = require('path');
var mongoose = require('mongoose');
var swig = require('swig');

// Route
var routes = require('./routes');
var user = require('./routes/user');
var form = require('./routes/form');
var category = require('./routes/category');
var transaction = require('./routes/transaction');
var ranking = require('./routes/ranking');
var admin = require('./routes/admin');

// Utilities
var config = require('./config');
var errorHandler = require('./lib/errorHandler');
var util = require('./lib/util');
var model = require('./lib/model');

var app = express();

// all environments
app.set('port', process.env.PORT || 8888);
app.engine('html', swig.renderFile);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.bodyParser());
app.use(express.session());
app.use(app.router);
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
  app.set('view cache', false);
  swig.setDefaults({ cache: false });
}

// login check
var checkLogin = function (req, res, next) {
  if ( !req.session.user_id ) {
    res.redirect('/login');
    return;
  }
  req.errorHandler = errorHandler;
  next();
};

var checkAdminLogin = function (req, res, next) {
  if ( !req.session.user_id ) {
    res.redirect('/admin/login');
    return;
  }

  var User = require('./lib/model.js').User;
  var admins = config.admins;

  User.find({ $or: admins }, function (err, admins) {
    if (err) throw err;

    var isAdminLoggedIn = false;
    for ( var i in admins ) {
      if ( req.session.user_id.toString() === admins[i]._id.toString() ) {
        isAdminLoggedIn = true;
      }
    }

    if ( !isAdminLoggedIn ) {
      res.redirect('/');
      return;
    }

    next();
  });
};

mongoose.connect('mongodb://localhost/nonyang', { user: config.mongoose.username, pass: config.mongoose.password });

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {

  // INDEX
  app.get('/', routes.index);
  app.get('/login', routes.login);
  app.post('/login', user.login);
  app.get('/logout', user.logout);

  // USER
  app.get('/users', user.list);
  app.get('/users/all', user.listAll);
  app.post('/users/create', user.create);
  app.post('/users/delete', user.delete);
  app.get('/users/pending', checkLogin, user.pending);
  app.post('/users/approve', checkLogin, user.approve);
  app.post('/users/edit', user.edit);

  app.get('/editForm', user.editForm);
  // app.get('/editInfo', user.editInfo);;

  // FORM
  app.get('/form/login', form.login);
  app.get('/form/user', form.user);

  // CATEGORY
  app.post('/category/create', category.create);
  app.get('/category/all', category.listAll);

  // TRANSACTION
  app.get('/transaction/list', transaction.list);
  app.get('/transaction/personal', transaction.personal);
  app.get('/transaction/public', transaction.public);
  app.get('/transaction/count', transaction.count);
  app.post('/transaction/create', checkLogin, transaction.create);
  app.post('/transaction/approve', checkLogin, transaction.approve);
  app.post('/transaction/refusal', checkLogin, transaction.refusal);

  // RANKING
  app.get('/ranking/nonyangRank', ranking.nonyangRank);
  app.get('/ranking/tradeRank', ranking.tradeRank);

  // ETC.
  // app.get('/update/wallet', util.updateAllWallets);

  // ADMIN
  app.get('/admin', checkAdminLogin, admin.index);
  app.get('/admin/login', admin.loginForm);
  app.post('/admin/login', admin.login);
  app.get('/admin/users', checkAdminLogin, admin.users);
  app.post('/admin/users/approve', checkAdminLogin, admin.usersApproval);
  app.post('/admin/users/delete', checkAdminLogin, admin.usersDelete);
  app.get('/admin/transactions', checkAdminLogin, admin.transactions);

  http.createServer(app).listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
  });

});