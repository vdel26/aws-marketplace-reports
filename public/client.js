;(function (window, document, Chart){
  var ctxLeft = document.getElementById('leftChart').getContext('2d')
  var ctxRight = document.getElementById('rightChart').getContext('2d')
  var ctxMain = document.getElementById('mainChart').getContext('2d')
  var selector = document.querySelector('#report-selector')

  var leftChart = new Chart(ctxLeft)
  var rightChart = new Chart(ctxRight)
  var mainChart = new Chart(ctxMain)

  var host = window.location.origin

  var dataFormat = {
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

  function clone (target) {
    return JSON.parse(JSON.stringify(target))
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

    for (var j=0; j < lastUsedList.length; j++) {
      lastUsedLabels.push(lastUsedList[j].date)
      lastUsedData.push(lastUsedList[j].amount)
    }

    var dataLeft = clone(dataFormat)
    var dataRight = clone(dataFormat)

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
      scaleSteps: 15,
      scaleStepWidth: 1,
      scaleStartValue: 0
    })
  }


  function generateTotalReport () {
    var rawData = JSON.parse(this.responseText)
    var data = clone(dataFormat)

    for (var i=0; i < rawData.length; i++) {
      data.labels.push(rawData[i].date)
      data.datasets[0].data.push(rawData[i].amount)
    }

    mainChart.Line(data, {
      scaleOverride: true,
      scaleSteps: 36,
      scaleStepWidth: 1,
      scaleStartValue: 10
    })
  }

  // fetch report when selected from the list
  function onReportSelected (event) {
    var report = selector.selectedOptions[0].value
    document.querySelector('.more-reports').classList.add('active');

    var req = new XMLHttpRequest()
    req.open('GET', host + '/datasets/' + report, true)

    if (report === 'total_users_report.json')
      req.onload = generateTotalReport
    else
      req.onload = parseDataset

    req.send()
  }

  // initialize
  function initialize () {
    selector.addEventListener('change', onReportSelected)
    getAvailableDatasets()

    var req = new XMLHttpRequest()
    req.open('GET', host + '/datasets/total_users_report.json', true)
    req.onload = generateTotalReport
    req.send()
  }

  initialize()

})(window, document, Chart);
