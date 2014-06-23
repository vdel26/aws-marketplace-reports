var csv   = require('ya-csv')
var _     = require('underscore')
var fs    = require('fs')
var path  = require('path')
var async = require('async')


/**
 * csvReportPath {String} – path to csv report from AWS e.g: customers/customer_subscriber_report_2014-06-04.csv
 */
function Report (csvReportPath) {
  if (!(this instanceof Report)) return new Report(csvReportPath)
  this.numRecords = 0
  this.filePath = csvReportPath
  this.filename = path.basename(csvReportPath)
  this.records = []
  this.lastUsedList = []
  this.signupList = []
}


Report.prototype.parseCsv = function (cb) {
  this.reader = csv.createCsvFileReader(this.filePath)

  this.reader.setColumnNames([ 'awsId', 'product', 'productId', 'productCode', 'lastUsed', 'reportDate', 'signupDate' ])

  this.reader.addListener('data', function(data) {
      delete data.product
      delete data.productId
      delete data.productCode
      this.records.push(data)
  }.bind(this))

  this.reader.addListener('end', function () {
    this.records.shift() // remove headers
    this.records.pop() // remove closing
    this.numRecords = this.records.length
    this.reportDate = this.records[0].reportDate
    console.log('-------------------------')
    console.log('REPORT DATE: ' + this.reportDate)
    console.log('# USERS: ' + this.records.length)
    console.log('-------------------------')
    cb()
  }.bind(this))

  this.reader.addListener('error', function (err) {
    // hack: this required patch in ya-csv to emit 'error' event
    console.log('Error parsing report. Skipping report...')
  })
}


Report.prototype.buildDatasets = function () {
  this.signupList = _.chain(this.records).groupBy('signupDate').map(function (value, key, list) {
    return { date: key, amount: value.length }
  }).sortBy('date', function (item) {
    return new Date(item.date)
  }).value()

  this.lastUsedList = _.chain(this.records).groupBy('lastUsed').map(function (value, key, list) {
    return { date: key, amount: value.length }
  }).sortBy('date', function (item) {
    return new Date(item.date)
  }).value()
}


Report.prototype.generateDatasets = function (outputDirectory, cb) {
  var self = this

  async.series([
    function (callback) {
      self.buildDatasets()
      callback()
    },
    function (callback) {
      var filename = outputDirectory + self.filename.split('.')[0] + '.json'
      var data = {}
      data.numRecords = self.numRecords
      data.reportDate = self.reportDate
      data.lastUsedList = self.lastUsedList
      data.signupList = self.signupList
      fs.writeFile(filename, JSON.stringify(data), function (err) {
        console.log('Saving to ' + filename)
        callback()
      })
    }
  ], function (err) {
    cb()
  })
}


module.exports = Report

/**
CSV HEADER FORMAT

"Customer AWS Account Number","Product Title","Product Id","Product Code","Last Usage Date","Report Date","Subscription Start Date"

**/
