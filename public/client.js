;(function (window, document, Chart){
  var ctxLeft = document.getElementById('leftChart').getContext('2d')
  var ctxRight = document.getElementById('rightChart').getContext('2d')
  var ctxMain = document.getElementById('mainChart').getContext('2d')
  var selector = document.querySelector('#report-selector')

  var leftChart = new Chart(ctxLeft)
  var rightChart = new Chart(ctxRight)
  var mainChart = new Chart(ctxMain)

  var host = window.location.origin
  
  // TODO
  // 1. a cache should be kept locally to avoid making a request for every
  // dataset change
  //
  // 2. would possibly be a good idea to use a worker thread to fetch all the
  // datasets at the beginning, so changes after that don't make additional requests

  var dataLeft = {
    labels : [],
    datasets : [
      {
        fillColor : "rgba(151,187,205,0.5)",
        strokeColor : "rgba(151,187,205,1)",
        pointColor : "rgba(151,187,205,1)",
        pointStrokeColor : "#fff",
        data : []
      }
    ]
  }

  var dataRight = {
    labels : [],
    datasets : [
      {
        fillColor : "rgba(151,187,205,0.5)",
        strokeColor : "rgba(151,187,205,1)",
        pointColor : "rgba(151,187,205,1)",
        pointStrokeColor : "#fff",
        data : []
      }
    ]
  }

  // create options in report selector
  function populateSelector () {
    var datasetsList = JSON.parse(this.responseText)
    for (var i=0; i < datasetsList.length; i++) {
      var opt = document.createElement('option')
      opt.value = datasetsList[i]
      opt.label = datasetsList[i].split('.')[0]
      selector.appendChild(opt)
    }
  }

  // get a list of available reports
  function getAvailableDatasets () {
    var req = new XMLHttpRequest()
    req.open('GET', host + '/datasets', true)
    req.onload = populateSelector
    req.send()
  }

  // format data to be used in chart.js
  function parseDataset () {
    // { numRecords: 0, signupList:[{ amount: 0, date: 0 }], lastUsedList:[{ amount: 0, date: 0 }]}
    var rawData = JSON.parse(this.responseText)
    var lastUsedList = rawData.lastUsedList
    var signupList = rawData.signupList
    var signupLabels = []
    var lastUsedLabels = []
    var signupData = []
    var lastUsedData = []

    for (var i=0; i < signupList.length; i++) {
      signupLabels.push(signupList[i].date)
      signupData.push(signupList[i].amount)
    }

    for (var i=0; i < lastUsedList.length; i++) {
      lastUsedLabels.push(lastUsedList[i].date)
      lastUsedData.push(lastUsedList[i].amount)
    }

    dataLeft.labels = signupLabels
    dataLeft.datasets[0].data = signupData
    dataRight.labels = lastUsedLabels
    dataRight.datasets[0].data = lastUsedData

    leftChart.Bar(dataLeft, {
      scaleOverride: true,
      scaleSteps: 3,
      scaleStepWidth: 1,
      scaleStartValue: 0
    })
    rightChart.Bar(dataRight, {
      scaleOverride: true,
      scaleSteps: 10,
      scaleStepWidth: 1,
      scaleStartValue: 0
    })
  }

  function generateTotalReport () {
    var rawData = JSON.parse(this.responseText)
    var data = {
      labels : [],
      datasets : [
        {
          fillColor : "rgba(151,187,205,0.5)",
          strokeColor : "rgba(151,187,205,1)",
          pointColor : "rgba(151,187,205,1)",
          pointStrokeColor : "#fff",
          data : []
        }
      ]
    }

    for (var i=0; i < rawData.length; i++) {
      data.labels.push(rawData[i].date)
      data.datasets[0].data.push(rawData[i].amount)
    }

    mainChart.Line(data, {
      scaleOverride: true,
      scaleSteps: 22,
      scaleStepWidth: 1,
      scaleStartValue: 10
    })
  }

  // fetch report when selected from the list
  function onReportSelected (event) {
    var report = selector.selectedOptions[0].value
    var req = new XMLHttpRequest()
    req.open('GET', host + '/datasets/' + report, true)

    if (report === 'total_users_report.json')
      req.onload = generateTotalReport
    else
      req.onload = parseDataset

    req.send()
  }

  // DEBUG
  window.makeReq = getAvailableDatasets
  window.data = dataLeft

  // Initialize
  selector.addEventListener('change', onReportSelected)
  getAvailableDatasets()

})(window, document, Chart);
