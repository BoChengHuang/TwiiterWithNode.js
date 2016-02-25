var express = require('express')
var app = express()
var http = require('http')
var server = http.createServer(app)
var Twit = require('twit')
var io = require('socket.io').listen(server);
var readline = require('readline');
var expjs = require('./public/exp.js');

server.listen(8080, function() {
  console.log('listened on 127.0.0.1:8080');
});

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
      res.sendFile(__dirname + '/index.html');
});

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

var target;;
var src = new Array();
var exp = expjs.init();
var api = new Twit({
    consumer_key:         '7YWVh4sHtMepO0tM9bfBvw8oW'
  , consumer_secret:      'em5zUzGCv4FqJxv6ws7r6mx7ihwt1WkiZMagQt4Y8SdWN0NHsN'
  , access_token:         '440063350-8lQC7h6djwhibmmMUXOL0T2nFWyOM2gv1KrTY2p1'
  , access_token_secret:  'SJ3vMRui8I6vKJLYW9ljkBQBrH5GQDi7qcMKOqmkudncI'
})
var count = 0;
var keyword = new Array();
var threshold = 50;

io.sockets.on('connection', function (socket) {

  var stream_sample = api.stream('statuses/sample', {language: 'en'})

     stream_sample.on('tweet', function (tweet) {
      var arr = generate_keyword(tweet.text);
      for (var i = 0; i < arr.length; i++) { keyword.push(arr[i]); };
      if (count >= threshold) {
        stream_sample.stop();
        print_out_keyword(keyword, null);
        request_keyword_for_filter();
      }
    });

    stream_sample.on('connected', function (response) {
      console.log('Twitter Sample API Connected');
    });

    stream_sample.on('disconnect', function (disconnectMessage) {
      console.log('Twitter Sample API Disconnect');
    });

    function print_out_keyword (arr, keyword) {
    console.log('\nKeyword: ');
      for (var i = 0; i < arr.length; i++) { 
        if (keyword != arr[i]) {
        console.log(arr[i]); 
        }
      }
    }

    function request_keyword_for_filter () {
      rl.question('Which keyword do want to choose? ', function(ans) {
        console.log('You choose: ' + ans);
        if (ans != '') { request_from_filter(ans); }
      });
      // rl.close();
    }

    function generate_keyword (tweet) {
      process.stdout.write('\r' + ((count / threshold) * 100).toFixed(2) + '%');
      count++;
      var text = tweet.split(' ');
      var result = new Array();
      for (var i = 0; i < text.length; i++) {
        var flag = false;
        for (var j = 0; j < exp.length; j++) {
          if (String(text[i].toLowerCase().search(exp[j])) != -1) { flag = true; break;}
        }
        if (!flag) { result.push(text[i]); }
      }
      return result;
    }

    function request_from_filter (keywords) {
      var stream_filter = api.stream('statuses/filter', { track: keywords });
      keyword = new Array();
      count = 0;
      stream_filter.on('tweet', function (tweet) {
      var result = generate_keyword(tweet.text);
      for (var i = 0; i < result.length; i++) { keyword.push(result[i]); }
        if (count >= threshold) {
          stream_filter.stop();
          print_out_keyword(keyword, keywords);
          io.sockets.emit('keyword', {keyword: keyword, keywords: keywords});       
        }
      });
    }

 });
