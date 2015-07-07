var app = require('http').createServer(handler)
var io = require('socket.io')(app);
var fs = require('fs');
var redis = require('redis');

var ngwords = require(__dirname + '/ngword.json');

// redis must run on localhost:6379, or die
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
var canWish = false;
function shoot() {
  timeoutId = setTimeout(function() {
    var shootlength = 0.8;
    var startx = randomInt(30, 70) / 100;
    var starty = randomInt(10, 30) / 100;
    var endx = randomInt(10, 90) / 100;
    // let shooting length constant
    var endy = Math.abs(starty - Math.sqrt(Math.pow(shootlength, 2) - Math.pow(startx - endx, 2))) + starty;
    // if a star overruns, round it
    endy = endy < 0.1 
      ? 0.1
      : endy > 0.9
        ? 0.9
        : endy;
        
    io.emit('shootStar', {
      expire: randomInt(9000, 10000),
      startx: startx,
      starty: starty,
      endx: endx,
      endy: endy,
      ease: 1
    });
    canWish = true;
    setTimeout(function() {
      canWish = false;
    }, 11000); // 雑
    shoot();
  }, randomInt(20000, 20000));
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
        angle: life % 360 / 0.25,
        speed: 360 / 0.25 // todo
      },
      {
        angle: life % 360 / 0.5,
        speed: 360 / 0.5
      },
      {
        angle: life % 360 / 1,
        speed: 360 / 1
      }
    ]);
  });
  
  io.emit('currentWatcher', socket.client.conn.server.clientsCount + 5);
  if (!timeoutId) shoot();
  
  socket.on('wish', function(data) {
    console.log(data);
    // validate data
    if (!data.wish) return;
    if (data.wish.length < 5) {
      socket.emit('result', {
        result: false,
        wish: "",
        error: "願い事が短いよ・・・"
      });
      return;
    }
    if (data.wish.length > 15) {
      socket.emit('result', {
        result: false,
        wish: "",
        error: "願い事が長いよ・・・"
      });
      return;
    }
    if (!canWish) return;
    if (isNg(data.wish)) {
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
    
    // respond
    socket.emit('result', {
      result: true,
      wish: data.wish
    });
    
    io.emit('showWish', {
      wish: data.wish,
      x: randomInt(3, 5) / 10,
      y: randomInt(2, 6) / 10,
      date: Date.now()
    });
  });
  
  socket.on('disconnect', function (client) {
    console.log('disconnect:' + client);
    io.emit('currentWatcher', socket.client.conn.server.clientsCount + 5);
  });
});


