var app = require('http').createServer(handler)
var io = require('socket.io')(app);
var fs = require('fs');
var redis = require('redis');

var ngwords = require(__dirname + '/ngword.json');

// localhost:6379 でredis動いてないと死
var client = redis.createClient();
client.on("error", function(err) {
  console.log("Error:" + err);
});

app.listen(80);

function handler (req, res) {
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
}

var key = function() { return "wishes"; };

var randomInt = function(min, max) {
  return Math.floor( Math.random() * (max - min + 1) ) + min;
};

var timeoutId = 0;

function shoot() {
  timeoutId = setTimeout(function() {
    io.emit('shootStar', {
      expire: randomInt(3000, 5000),
      startx: Math.random(),
      starty: Math.random(),
      endx: Math.random(),
      endy: Math.random(),
      ease: 1
    });
    shoot();
  }, randomInt(5000, 10000));
}

function isNg(wish) {
  return ngwords.some(function(x) { return wish.indexOf(x) >= 0; });
}

var life = 0;
setInterval(function() {
  life++;
}, 1000);

io.on('connection', function (socket) {
  console.log('connect...');
  
  client.lrange(key(), -10, -1, function(err, items) {
    if (err) {
      console.error("Error:" + err);
      return;
    }

    console.log(items);
    if (items.length) {
      var wishes = [];
      items.forEach(function(x) {
        wishes.push(JSON.parse(x));
      });
      socket.emit('initialize', { wishes: wishes });
    }
    
    console.log("life:" + life);
    
    // rotate
    socket.emit('rotate', [
      {
        angle: life % 360 / 6,
        speed: 360 / 6 // todo
      },
      {
        angle: life % 360 / 12,
        speed: 360 / 12
      },
      {
        angle: life % 360 / 24,
        speed: 360 / 24
      }
    ]);
  });
  
  io.emit('currentWatcher', socket.client.conn.server.clientsCount);
  if (!timeoutId) shoot();
  
  socket.on('wish', function(data) {
    console.log(data);
    // validate data
    if (isNg(data.wish)) {
      // response
      socket.emit('result', {
        result: false,
        wish: "",
        error: "願い事が微妙だよ・・・"
      });
      return;
    }
    
    // register data
    client.rpush(key(), JSON.stringify({
      wish: data.wish,
      date: Date.now()
    }));
    
    // response
    socket.emit('result', {
      result: true,
      wish: data.wish
    });
    
    io.emit('showWish', {
      wish: data.wish,
      x: Math.random(),
      y: Math.random(),
      date: Date.now()
    });
  });
  
  socket.on('disconnect', function (client) {
    console.log('disconnect:' + client);
    io.emit('currentWatcher', socket.client.conn.server.clientsCount);
  });
});


