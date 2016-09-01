var dygraphs_data;
var g;
var timer = 1000*60*1;
var cntdown = 1000*REFRESH_INTER;
var offset = -1;
var one_day = -1;
var update_countdown;

$('#cntdown').text(REFRESH_INTER);

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
        start_time = moment(parseFloat(data['rows'][0]['id']), 's');

        time_span = moment().diff(start_time.unix(), 'hours');
        max_timemachine = Math.ceil(moment.duration(time_span, 's').asHours());
        $('#timemachine').attr('max', max_timemachine);
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
    }, 200);
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
function get_max_min(cur_max, cur_min, val) {
    if (val > cur_max) {
      cur_max = val;
    }
    if (cur_min < 0 && val > 0) {
      cur_min = val;
    }
    if (val > 0 && val < cur_min) {
      cur_min = val;
    }
    return [cur_max, cur_min];
}
function averages() {
  avg_up = 0;
  avg_down = 0;
  avg_lat = 0;
  down_max_speed = 0;
  down_min_speed = -1;
  up_max_speed = 0;
  up_min_speed = -1;
  lat_max = 0;
  lat_min = -1;
  for (var i=0; i<g.numRows(); i++) {
    up = parseFloat(g.getValue(i,2));
    down = parseFloat(g.getValue(i,3));
    lat = parseFloat(g.getValue(i,1));

    avg_lat  += lat;
    avg_up   += up;
    avg_down += down;

    vals = get_max_min(down_min_speed,down_max_speed, down);
    down_max_speed = vals[0];
    down_min_speed = vals[1];

    vals = get_max_min(up_min_speed,up_max_speed, up);
    up_max_speed = vals[0];
    up_min_speed = vals[1];

    vals = get_max_min(lat_max,lat_min, lat);
    lat_max = vals[0];
    lat_min = vals[1];

  }
  if (SHOW_DOWN_MIN_MAX) {
    $('span[name="down_avg"]').text((avg_down/g.numRows()).toFixed(2)+'Mbit/s ('+down_max_speed+'/'+down_min_speed+'Mbit/s)');
    $('span[name="down_avg"]').attr('title', 'Download (average, max, min)');
  } else {
    $('span[name="down_avg"]').text((avg_down/g.numRows()).toFixed(2)+'Mbit/s');
    $('span[name="down_avg"]').attr('title', 'Download (max: '+down_max_speed+', min: '+down_min_speed+'Mbit/s)');
  }
  if (SHOW_UP_MIN_MAX) {
    $('span[name="up_avg"]').text((avg_up/g.numRows()).toFixed(2)+'Mbit/s ('+up_max_speed+'/'+up_min_speed+'Mbit/s)');
    $('span[name="up_avg"]').attr('title', 'Upload (average, max, min)');
  } else {
    $('span[name="up_avg"]').text((avg_up/g.numRows()).toFixed(2)   +'Mbit/s');
    $('span[name="up_avg"]').attr('title', 'Upload (max: '+up_max_speed+' min: '+up_min_speed+'Mbit/s)');
  }
  if (SHOW_LAT_MIN_MAX) {
    $('span[name="lat_avg"]').text((avg_lat/g.numRows()).toFixed(2)  +'ms ('+lat_min+'/'+lat_max+'s)');
    $('span[name="lat_avg"]').attr('title', 'Latency (average, min, max)');
  } else {
    $('span[name="lat_avg"]').text((avg_lat/g.numRows()).toFixed(2)  +'ms');
    $('span[name="lat_avg"]').attr('title', 'Latency (min: '+lat_min+' max: '+lat_max+'s)');
  }
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
    $('#timemachine').prop('disabled', true);
    $.couch.db('bandwidth').allDocs({
      skip: offset,
      success: function(data) {
        docs = [];
        $.each(data['rows'], function(index, obj) {
          getDoc(obj['id']);
        });

        if (data['rows'].length != 0) {
          data_checker = setInterval(function() {
            if (dygraphs_data.length == (one_day + data['rows'].length)) {
              clearInterval(data_checker);
              dygraphs_data.sort(function(a, b) {
                var keyA = a[0];
                var keyB = b[0];
                if(keyA < keyB) return -1;
                if(keyA > keyB) return 1;
                return 0;
              });
              g.updateOptions({
                file: dygraphs_data,
                dateWindow: [
                  x,
                  moment().unix()
                ]
              });
              offset += data['rows'].length;
              one_day += data['rows'].length;
              $('#timemachine').prop('disabled', false);
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
