var http = require('http')
var static = require('node-static')
var fs = require('fs')
var path = require('path')
var url = require('url')
var fetch = require('./fetch')

var file = new static.Server('./public')

// quick&dirty web server
http.createServer(function (req, res) {

  var pathname = url.parse(req.url).pathname
  console.log('serving.. ' + pathname)

  // retrieve list of available datasets
  if (req.method === 'GET' && pathname === '/datasets') {
    fs.readdir('datasets', function (err, files) {
      res.end(JSON.stringify(files))
    })
  }

  // serve JSON datasets
  else if (req.method === 'GET' && /^\/datasets\/\w+/.test(pathname)){
    var filename = path.join(process.cwd(), pathname)
    fs.exists(filename, function (exists) {
      if (!exists) {
        res.writeHead(404)
        res.end()
        return
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      fs.createReadStream(filename).pipe(res)
    })
  }

  else if (req.method === 'GET' && /^\/webhook/.test(pathname)) {
    fetch()
    res.end()
    return
  }

  // client side static assets
  else if (req.method === 'GET') {
    file.serve(req, res, function (err) {
      if (err) {
        res.writeHead(err.status, err.headers)
        res.end()
      }
    })
  }

}).listen(process.env.PORT || 8000)
