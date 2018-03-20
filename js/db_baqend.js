/* --- VARIABLES --- */

$(document).ready(function() {
  DB.connect('misty-shape-74', true).then(function() {
    console.log("Verbunden");
  });
})
//Wait for connection
DB.ready().then(function() {
  if (DB.User.me) {
    //do additional things if user is logged in
    console.log('Willkommen ' + DB.User.me.username); //the username of the user
    transferToLogin(DB.User.me.securitykey);
  } else {
    //do additional things if user is not logged in
    transferToRegister();
  }
});


function register(data, callback) {
  var username = data[0].value;
  var password = data[1].value;
  var password_2 = data[2].value;

  if(username.length != 0) {
    if(username.length > 3) {
      if(password.length != 0) {
        if(password.length > 4) {
          if(password === password_2) {
            initUser(username, function(user, sk) {
              DB.User.register(user, password).then(function() {
                registermessage(function() {
                  createItemlist();
                  return callback(sk);
                });
              });
            })
          } else errormessage("Passwörter stimmen nicht überein.");
        } else errormessage("Passwort ist zu kurz.");
      } else errormessage("Bitte gebe ein Passwort ein.");
    } else errormessage("Benutzername ist zu kurz.");
  } else errormessage("Bitte gebe einen Namen ein.");
}

function login(data, callback) {
  var username = data[0].value;
  var password = data[1].value;

  DB.User.login(username, password).then(function() {
    return callback(DB.User.me.securitykey);
  }, function() {
    errormessage("Name oder Passwort ist nicht korrekt.");
  });
}

function logout() {
  DB.User.logout().then(function() {
    location.reload();
  });
}

String.prototype.hashCode = function() {
  var hash = 0, i, chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

function search(search_result) {
  console.log(search_result);
}

function subscribeRealtime(sk, callback) {
  if(DB.User.me.securitykey == sk) {
    testWebsocketConnection();

    var onNext = function(event) {
      updateItems(event);
    }
    var onError = function(err) {
      console.log(err);
    }

    var useritems = DB.User.me.items;
    var query = DB.Item.find();
    var stream = query.eventStream();
    var subscriptionFirst = stream.subscribe(onNext, onError);




    return callback([subscriptionFirst]);
  }
}

function testWebsocketConnection() {
  // var ws = new WebSocket('ws://app-starter.events.baqend.com/v1/events'); // also ws:// can be used
  var ws = new WebSocket('ws://misty-shape-74.events.baqend.com/v1/events');
  ws.onopen = function() { console.log('Websocket opened') };
  ws.onclose = function() { console.log('Websocket closed') };
  //expect opened to be logged but closed is called immediately
}

function initUser(username, callback) {
  console.log("Initialize User ...");
  // user object
  var user = new DB.User({
    'username': username,
    'securitykey': (CryptoJS.SHA256(username)).toString(CryptoJS.enc.Base64)
  });

  return callback(user, user.securitykey);
}

function createItemlist() {
  // items object for each individual user
  var items = new DB.Items(
    {
      'itemlist': new DB.List(),
      'user': DB.User.me
    }
  ).save();
}

function simulate() {
  var timeFirst = 1000;
  var timeSecond = 3000;

  var item1 = new DB.Item({
    'name': 'gold',
    'type': 'ore',
    'cost': 100,
    'weight': 10,
    'isAuction': false
  });

  console.log("Start simulating ...");

  setTimeout(function() {
    stepOne(item1, function() {
      setTimeout(function() {
        // stepTwo();
      }, timeSecond);
    })
  }, timeFirst);

  function stepOne(item, callback) {
    console.log("Step 1: Pushing item ...");
    addItem(item);

    return callback();
  }
  function stepTwo() {
    console.log("Step 2: Deleting item ...");
    // deleteItem("/db/Item/c5a52e7c-4dd2-48be-8765-52f8ade7a824");
  }
}

function addItem(item) {
  item.save().then(function(savedItem) {
    DB.Items.find()
            .equal('user',DB.User.me)
            .singleResult(function(listofitems) {
              listofitems.itemlist.push(item);
              listofitems.save();
            });
  });
}

function deleteItem(id) {
  //Remove from list
  DB.Item.load(id).then(function(item) {
    item.delete();
  });
  DB.Items.load(DB.User.me.items.id, {depth: 1}).then(function(itemlist) {
    itemlist.partialUpdate()
      .remove("itemlist", id)
      .execute();
  });
}
