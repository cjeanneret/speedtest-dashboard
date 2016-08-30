var dygraphs_data;
var g;
var timer = 1000*60*1;
var cntdown = timer;
var offset = -1;
var one_day = -1;
var update_countdown;

if (COUCHDB) {
  var data_checker;
  dygraphs_data = [];

  $('#timemachine').val(DEFAULT_SPAN);
  $('#range-value').text(DEFAULT_SPAN);

  function getDoc(id) {
    $.couch.db('bandwidth').openDoc(id, {
      success: function(data) {
        dygraphs_data.push([
            parseFloat(data['_id']),
            parseFloat(data['latency']),
            parseFloat(data['upload']),
            parseFloat(data['download'])
        ]);
      },
      error: function(e) {
        one_day -= 1;
      }
    });
  }

  $('#timemachine').mousemove(function() {
    val = $('#timemachine').val();
    $('#range-value').text(val);
  });
  $('#timemachine').change(function() {
    dygraphs_data = [];
    $('#timemachine').prop('disabled', true);
    clearInterval(update_countdown);
    $('#progress-bar').attr('aria-valuenow', 0);
    $('#progress-bar').css('width', '0%');
    $('#progress').show();
    $('#loading').show();
    get_data();
  });

  function get_data() {
    $.couch.db("bandwidth").allDocs({
      success: function(data) {
        offset = data['rows'].length;
        docs = [];
        $.each(data['rows'], function(index, obj) {
          timestamp = parseFloat(obj['id']);
          if (moment(timestamp).isBetween(moment().subtract($('#timemachine').val(), 'hours').unix(), moment().unix(), null, '[]')) {
            docs.push(obj['id']);
          }
        });
        one_day = docs.length;
        $.each(docs, function(index, id) {
          getDoc(id);
        });
      }
    });
    data_checker = setInterval(function() {
      if (dygraphs_data.length == one_day) {
        clearInterval(data_checker);
        dygraphs_data.sort(function(a, b) {
          var keyA = a[0];
          var keyB = b[0];
          if(keyA < keyB) return -1;
          if(keyA > keyB) return 1;
          return 0;
        });
        draw_graph();
        $('#time-slider').show();
        $('#progress').hide();
        $('#timemachine').prop('disabled', false);
        $('#loading').hide();
      } else {
        percent = Math.round(dygraphs_data.length*100/one_day);
        $('#progress-bar').attr('aria-valuenow', percent);
        $('#progress-bar').css('width', percent+'%');
      }
    }, 500);
  }
  $(document).ready(function() {
    get_data();
  });
} else { // just download the log.csv file
  dygraphs_data = '/log.csv';
  draw_graph();
}
var legend_display = 'always';
if ($(window).width() < 768) {
  legend_display = 'onmouseover';
}

function formatDate(d, short=false) {
  if (short) {
    return moment.unix(d).format('H:mm');
  } else {
    return moment.unix(d).format('D MMM YYYY - H:mm:ss');
  }
}
function averages() {
  avg_up = 0;
  avg_down = 0;
  avg_lat = 0;
  for (var i=0; i<g.numRows(); i++) {
    avg_lat  += parseInt(g.getValue(i,1));
    avg_up   += parseInt(g.getValue(i,2));
    avg_down += parseInt(g.getValue(i,3));
  }
  $('li[name="down_avg"]').text('Download: '+(avg_down/g.numRows()).toFixed(2) +'Mbit/s');
  $('li[name="up_avg"]').text('Upload: '+    (avg_up/g.numRows()).toFixed(2)   +'Mbit/s');
  $('li[name="lat_avg"]').text('Latency: '+  (avg_lat/g.numRows()).toFixed(2)  +'ms');
}

function draw_graph() {
  g = new Dygraph(
      document.getElementById("dygraph"),
      dygraphs_data,
      { 
        labels: [ "Date", "Latency", "Upload", "Download" ],
        series: {
          "Upload": { axis: 'y1'},
          "Download": { axis: 'y1', showInRangeSelector: true },
          "Latency": { axis: 'y2' }
        },
        legend: legend_display,
        labelsSeparateLines: true,
        connectSeparatedPoints: true,
        fillGraph: true,
        colors: [
          "purple",
          "blue",
          "green",
        ],
        ylabel: "Bandwidth (Mbit/s)",
        y2label: "Latency (ms)",
        axes: {
          x: {
            valueFormatter: function(timestamp) {
              return formatDate(timestamp);
            },
            axisLabelFormatter: function(timestamp) {
              return formatDate(timestamp, true);
            }
          },
          y: {
            valueRange: [0, MAX_BW+50],
          },
          y2: {
            independentTicks: true,
            valueRange: [0, MAX_BW+50],
            labelsKMB: true,
          }
        },
        underlayCallback: function(canvas, area, g) {
          canvas.strokeStyle = 'red';
          var lines = [(MAX_BW*0.8),MAX_BW];
          var range = g.xAxisRange();
          for (var idy = 0; idy < lines.length; idy++) {
            var canvasy = g.toDomYCoord(lines[idy]);
            canvas.beginPath();
            canvas.moveTo(g.toDomXCoord(range[0]), canvasy);
            canvas.lineTo(g.toDomXCoord(range[1]), canvasy);
            canvas.lineWidth = 2;
            canvas.stroke();
            canvas.closePath();
          }
        },
        showRangeSelector: true,
        rangeSelectorPlotFillColor: 'green',
      }
  );
  g.ready(function() {
    averages();
    update_countdown = setInterval(function() { count_down() }, 1000);
  });
}


function updateGraph() {
  x = g.xAxisRange()[0];
  if (COUCHDB) {
    $.couch.db('bandwidth').allDocs({
      skip: offset,
      success: function(data) {
        docs = [];
        $.each(data['rows'], function(index, obj) {
          docs.push(parseFloat(obj['id']));
        });
        $.each(docs.sort(), function(index, id) {
          getDoc(id);
        });

        if (data['rows'].length != 0) {
          data_checker = setInterval(function() {
            if (dygraphs_data.length == (one_day + data['rows'].length)) {
              clearInterval(data_checker);
              g.updateOptions({
                file: dygraphs_data,
                dateWindow: [
                  x,
                  moment().unix()
                ]
              });
              offset += data['rows'].length;
              one_day += data['rows'].length;
            } else {
              console.log('Waiting for dataset');
            }
          }, 500);
        } else {
          console.log('No new data for now');
        }
      }
    });
  } else {
    g.updateOptions({
      file: dygraphs_data,
      dateWindow: [
        x,
        moment().unix()
      ]
    });
  }
  g.ready(averages);
}

function count_down() {
  if (cntdown <= 0) {
    cntdown = timer;
    updateGraph();
  }
  cntdown = cntdown - 1000;
  $('#cntdown').text(cntdown/1000);
}
