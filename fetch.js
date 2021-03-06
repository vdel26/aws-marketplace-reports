var Imap    = require('imap')
var fs      = require('fs')
var rm      = require('rimraf')
var mkdirp  = require('mkdirp')
var split   = require('split')
var async   = require('async')
var request = require('request')
var Report  = require('./report')


var imap = module.exports = new Imap({
  user: process.env.GMAIL_EMAIL,
  password: process.env.GMAIL_PWD,
  host: 'imap.gmail.com',
  port: 993,
  tls: true
})


/**
 * checks if a URL is a link to an AWS Marketplace report
 */
function isReportUrl(string){
  var awsURLmatcher = /^\w+:\/\/aws-marketplace-reports\.s3\.amazonaws\.com\S*/m
  var match = string.match(awsURLmatcher)
  return match ? match[0] : ''
}


function openInbox(cb) {
  imap.openBox('[Gmail]/All Mail', true, cb)
}


/**
 * subject    {String} – 'Customer Subscriber Report'
 * dateString {String} – 'June 2, 2014'
 */
function getUrls (subject, dateString, callback) {
  var urlsArray = []

  imap.once('ready', function() {
    openInbox(function(err, box) {
      if (err) throw err

      var searchFilters = [
        ['SUBJECT', '*' + subject + '*'],
        ['FROM', 'support-fwd@3scale.net'],
        ['SINCE', dateString]
      ]

      imap.search(searchFilters, function(err, results) {

        if (err) throw err

        var f = imap.fetch(results, { bodies: '1' })

        f.on('message', function (msg, seqno) {
          msg.on('body', function (stream, info) {
            stream.pipe(split()).on('data', function (line) {
              var url = isReportUrl(line)
              if (url) urlsArray.push(url)
            })
          })
        })

        f.once('error', function (err) {
          console.log('Imap message error:' + err)
        })

        f.once('end', function() {
          console.log('Done fetching all messages...')
          imap.end()
        })
      })
    })

  })

  imap.once('error', function(err) {
    console.log('Imap error: ' + err)
  })

  imap.once('end', function() {
    console.log('Imap connection ended...')
    callback(null, urlsArray)
  })

  imap.connect()
}

/**
 * download report to customers/ directory
 **/
function downloadFile (url, callback) {
  var fileName = url.match(/[\w\-]*\.csv/)[0]
  fileName = 'customers/' + fileName
  request(url).pipe(fs.createWriteStream(fileName)).on('finish', function () {
    callback()
  })
}



/**
 * TASKS
 */
function runTasks () {
  async.waterfall([
    // make sure customers/ and datasets/ exist
    // and clean old csv reports
    function (callback) {
      rm('customers', function (err) {
        if (err) console.log(err)
        mkdirp('customers', function (err) {
          if (err) console.log(err)
          mkdirp('datasets', function (err) {
            if (err) console.log(err)
            callback()
          })
        })
      })
    },

    // search emails and extract URLs to AWS Marketplace reports
    function (callback) {
      var yesterday = new Date()
      yesterday.setDate((new Date()).getDate() - 1)
      getUrls('Customer Subscriber Report', yesterday, callback)
    },

    // download reports to customers/
    function (urlsArray, callback) {
      async.each(urlsArray, downloadFile, function (err) {
        if (err) console.log('Error: ' + err)
        else console.log('All reports downloaded!')
        callback()
      })
    },

    // create json datasets from reports
    // don't generate dataset if AWS URL has expired
    function (callback) {
      var csvFiles = fs.readdirSync('customers').map(function (file) {
        return 'customers/' + file
      })
      async.each(csvFiles, function (file, cb) {
        var rep = new Report(file)
        rep.parseCsv(function () {
          rep.generateDatasets('datasets/', cb)
        })
      }, callback)
    },

    // create json dataset for the report of total daily users
    // using data from all reports available at 'datasets/'
    function (callback) {
      var datasets = fs.readdirSync('datasets').map(function (file) {
        return 'datasets/' + file
      })

      console.log(datasets)

      var sevenDayReport = []
      datasets.forEach(function (file) {
        var data = JSON.parse(fs.readFileSync(file))
        sevenDayReport.push({
          date: data.reportDate,
          amount: data.numRecords
        })
      })

      fs.writeFile('datasets/total_users_report.json', JSON.stringify(sevenDayReport), function (err) {
        console.log('generating total users report...')
        callback()
      })
    }
  ],
  function (err) {
    console.log('DONE :)')
  })
}

module.exports = runTasks

// allow command line execution `npm run fetch`
if (require.main === module) {
  runTasks()
}
