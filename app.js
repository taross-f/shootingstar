var app = require('http').createServer(handler)
var io = require('socket.io')(app);
var fs = require('fs');

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

var initial = [
    {
        wish: '宝くじ1等あたる',
        date: Date.now()
    },
    {
        wish: '宝くじ2等あたる',
        date: Date.now()
    },
    {
        wish: '宝くじ3等あたる',
        date: Date.now()
    },
]

var watcher = 0;

io.on('connection', function (socket) {
  console.log('connect...');
  socket.emit('initialize', { wishes: initial });
  io.emit('currentWatcher', ++watcher);
  var count = 0;
  var intervalId = setInterval(function() {
    socket.emit('shootStar', 'shoot!:' + count++);
  }, 5000);
  
  socket.on('wish', function(data) {
    console.log(data);
    // validate data
    
    // register data
    
    // response
    socket.emit('result', {
      result: true,
      wish: data.wish
    });
    
    io.emit('showWish', {
      wish: data.wish,
      x: 0.2,
      y: 0.4,
      date: Date.now()
    });
  });
  
  socket.on('disconnect', function (client) {
    clearInterval(intervalId);
    console.log('disconnect:' + client);
    io.emit('currentWatcher', --watcher);
  });
});


