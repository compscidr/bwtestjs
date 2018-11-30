/**
 * @summary       JSWBWTest
 * @description   jquery based download, upload throughput test, rtt test
 * @version       1.0.0 (27/11/2018)
 * @author        Jason Ernst, RightMesh
 * @license       Apache 2.0
 *
 * Features:
 * - File download and upload, RTT (ping-like)
 * - Multiple TCP connections to max out fast connections (similar to iperf -P)
 * - Scalable test from slow to fast connections
 * - Any webserver (Apache HTTP, Apache Tomcat, IIS, nginx)
 * - cross-browser support
 * - multiple-runs of test
 *
 * Requirements:
 * - An HTTP server which allows GET and POST calls
 * - jQuery 1.3 or newer
 *
 * For details please refer to:
 * https://github.com/compscidr/bwtestjs
 * Inspired by JQSpeedTest:
 * https://github.com/skycube/jqspeedtest
 */
function JSBWTest(options) {
  //************************** Configuration START *********************//
  var defaults = {
    // Callback function for Download output
		testDlCallback: defaultCallbackFunction,
		// Callback function for Upload output
		testUlCallback: defaultCallbackFunction,
		// Callback function for Response output
		testRttCallback: defaultCallbackFunction,
		// Callback function for State
		testStateCallback: defaultCallbackFunction,
		// Callback function for the finish
		testFinishCallback: defaultCallbackFunction,
		// Count of Download Samples taken
		countDlSamples: 1,
		// Count of Upload Samples taken
		countUlSamples: 1,
		// Count of Response Samples taken
		countReSamples: 1,
		// Upload Unit Output
		uploadUnit: 'bps',
		// Download Unit Output
		downloadUnit: 'bps',
    // Include the Unit on Return,
		returnUnits: false,
    // Number of parallel connections
    parallelConnections: 10,
    // Maximum amount of time (s) for the entire test to run in
    maxExecution: 10,

    // mapping of file sizes to files
    //if you want a difference amount of time for execution you likely need to
    //recompute and regenerate these files. The sizes were based on a target of
    //5s for each data rate: https://www.download-time.com/
    //all of the files were generated with /dev/urandom and the dd command
    //https://www.ostechnix.com/create-files-certain-size-linux/
    tests: [
      { name: '28.8kbps', size: 20480, file: '20kb.dat' },
      { name: '56.6kbps', size: 40960, file: '40kb.dat' },
      { name: '256kbps', size: 184320, file: '180kb.dat' },
      { name: '512kbps', size: 368640, file: '360kb.dat' },
      { name: '1Mbps', size: 737280, file: '720kb.dat' },
      { name: '2Mbps', size: 1474560, file: '1440kb.dat' },
      { name: '8Mbps', size: 5898240, file: '5760kb.dat' },
      { name: '24Mbps', size: 17694720, file: '17280kb.dat' },
      { name: '100Mbps', size: 62914560, file: '60mb.dat' },
      { name: '500Mbps', size: 314572800, file: '300mb.dat' },
      { name: '1Gbps', size: 629145600, file: '600mb.dat' }
    ]
  };
  var settings = $.extend( {}, defaults, options );
  //************************** Configuration END *********************//

  //** Current State
	var currentState = 'stopped';

	//** Some Global Vars
	var dlCounts = 0; var dlIntervalId = 0; var dlTestRunning = 'no'
	var ulCounts = 0; var ulIntervalId = 0; var ulTestRunning = 'no'
	var reCounts = 0; var reIntervalId = 0; var reTestRunning = 'no'

  var uploadData = new Map();

  //** Set the current state var from outside
  this.state = function(state){
  	currentState = state;
  	return true;
  }

  // Set the current state var from internal and call a callback function
  function setCurrentState(state){
  	currenState = state;
  	typeof settings.testStateCallback === 'function' && settings.testStateCallback(state);
  }

  //** Get the current state var from outside
  this.getCurrentState = function(state){
  	return currentState;
  }

  //** Assumes the test is not already running
  this.start = function() {
    console.log('starting test');
    dlCounts = 0;
		ulCounts = 0;
		reCounts = 0;
		testStart();
  }

  //** Internal start and stop function
  function testStart(){
  	if(currentState == 'forcestop'){
  		setCurrentState('stopped');
  		typeof settings.testFinishCallback === 'function'
        && settings.testFinishCallback('finished');
  		return;
		}
    setCurrentState('running');
  	if(dlCounts < settings.countDlSamples){
  		if(dlTestRunning == 'no' && ulTestRunning == 'no'
          && reTestRunning == 'no'){
  			dlCounts++;
  			dlTestRunning = 'yes';
  			setTimeout(function(){TestDownload(settings.elDlOutput)},
          settings.testSleepTime);
  		}
  		clearTimeout(dlIntervalId)
  		dlIntervalId = setTimeout(function(){ testStart(); }, 1000);
  		return;
  	}
  	else if(ulCounts < settings.countUlSamples){
  		if(dlTestRunning == 'no' && ulTestRunning == 'no'
          && reTestRunning == 'no'){
  			ulCounts++;
  			ulTestRunning = 'yes';
  			setTimeout(function(){TestUpload(settings.elUlOutput)},
          settings.testSleepTime);
  		}
  		clearTimeout(ulIntervalId)
  		ulIntervalId = setTimeout(function(){ testStart(); }, 1000);
  		return;
  	}
  	else if(reCounts < settings.countReSamples
        || settings.countReSamples == 'loop') {
  		if(dlTestRunning == 'no' && ulTestRunning == 'no'
          && reTestRunning == 'no') {
  			reCounts++;
  			reTestRunning = 'yes';
  			setTimeout(
          function() {ulTestRunning = 'no';
            TestResponse(settings.elReOutput)
          },
          settings.testSleepTime);
  		}
  		clearTimeout(reIntervalId)
  		reIntervalId = setTimeout(function(){ testStart(); }, 1000);
			return;
  	}
  	currentState = 'stopped';
		setCurrentState('stopped');
  	typeof settings.testFinishCallback === 'function'
      && settings.testFinishCallback('finished');
  }

  async function TestDownload() {
    var previousDifference = 0;
    var testFiles = settings.tests.map(test => test.file);
    var testSizes = settings.tests.map(test => test.size);
    var latestResult = {throughput: 0, duration: 0};
    for(var i = 0; i < testFiles.length; i++) {
      //by using await here, we prevent multiple file sizes from
      //running at the same time throwing off the results.
      result = await TestFileDownload(testFiles[i], testSizes[i],
        settings.parallelConnections);

      previousDifference = result.duration - latestResult.duration;
      //determine if we have hit the limit of the connection yet
      //(ie: is it taking too long)
      if(result.duration == -1) {
        console.log("timed out getting result");
        break;
      }
      if(previousDifference + result.duration > (settings.maxExecution / 2)) {
        console.log("max duration reached for download test");
        latestResult = result;
        break;
      } else {
        console.log("duration under limit, proceeding to next test");
        latestResult = result;
      }

      if(currentState == 'forcestop') {
        break;
      }
    }
    dlTestRunning = 'no';
    typeof settings.testDlCallback === 'function'
      && settings.testDlCallback(latestResult.throughput, latestResult.duration);
  }

  async function TestFileDownload(file, size, parallel) {
    var sendDate = (new Date()).getTime();
    var maxDuration = 0;
    var totalDuration = 0;
    var totalBitsReceived = 0;
    console.log('starting: ', file, ' download. P: ', parallel);
    var promises = [];
    for(var j = 0; j < parallel; j++) {
      promises.push(
        $.ajax({
          type: "GET",
          url: file,
          timeout: (settings.maxExecution * 1000 * 2) / 3,
          cache: false,
          success: function(data) {
            console.log('successfully got ' + file);
            var receiveDate = (new Date()).getTime();
            var duration = (receiveDate - sendDate) / 1000;
            totalDuration = totalDuration + duration;
            if(duration > maxDuration) {
              maxDuration = duration;
            }
            var bitsLoaded = size * 8;
            totalBitsReceived = totalBitsReceived + bitsLoaded;

            if(!(uploadData.has(size))) {
              uploadData.set(size, data);
            }
          }
        }).catch(function(e) {
          totalBitsReceived = 0;
          maxDuration = -1;
        })
      );
    }

    //using await here means that this function will not return until all of
    //the parallel TCP connections are completed.
    await Promise.all(promises);
    var averageDuration = totalDuration / parallel;
    var throughputBps = (totalBitsReceived / averageDuration).toFixed(2);
    console.log(file + ' done. Throughput: ' + throughputBps + " bps. "
      + throughputBps / 1024 / 1024 + " Mbps. Time: "
      + maxDuration + "s");
    return {throughput: throughputBps, duration: maxDuration};
  }


  async function TestUpload() {
    var previousDifference = 0;
    console.log('Number of different upload files: ', uploadData.size);
    var latestResult = {throughput: 0, duration: 0};
    var iterator = uploadData[Symbol.iterator]();
    for(let upload of iterator) {
      result = await TestFileUpload(settings.parallelConnections,
        upload[1].length,  upload[1]);

      previousDifference = result.duration - latestResult.duration;
      //determine if we have hit the limit of the connection yet
      //(ie: is it taking too long)
      if(result.duration == -1) {
        console.log("timed out getting result");
        break;
      }
      if(previousDifference + result.duration > (settings.maxExecution / 2)) {
        console.log("max duration reached for upload test");
        latestResult = result;
        break;
      } else {
        console.log("duration under limit, proceeding to next test");
        latestResult = result;
      }

      if(currentState == 'forcestop') {
        break;
      }
    }
    ulTestRunning = 'no';
    typeof settings.testUlCallback === 'function'
      && settings.testUlCallback(latestResult.throughput, latestResult.duration);
  }

  async function TestFileUpload(parallel, size, data) {
    var sendDate = (new Date()).getTime();
    var maxDuration = 0;
    var totalDuration = 0;
    var totalBitsReceived = 0;
    console.log('starting: ', size, ' upload. P: ', parallel);

    var promises = [];
    for(var k = 0; k < parallel; k++) {
      promises.push(
        $.ajax({
          type: "POST",
          url: "",
          data: data,
          timeout: (settings.maxExecution * 1000),
          cache: false,
          success: function() {
            console.log("UPLOAD SUCCESS: " + data.length);
            var receiveDate = (new Date()).getTime();
            var duration = (receiveDate - sendDate) / 1000;
            totalDuration = totalDuration + duration;
            if(duration > maxDuration) {
              maxDuration = duration;
            }
            var bitsLoaded = size * 8;
            totalBitsReceived = totalBitsReceived + bitsLoaded;
          }
        }).catch(function(e) {
          console.log("Timeout on upload");
          totalBitsReceived = 0;
          maxDuration = -1;
        })
      );
    }
    await Promise.all(promises);
    var averageDuration = totalDuration / parallel;
    var throughputBps = (totalBitsReceived / averageDuration).toFixed(2);
    console.log(size + ' done. Throughput: ' + throughputBps + " bps. "
      + throughputBps / 1024 / 1024 + " Mbps. Time: "
      + maxDuration + "s");
    return {throughput: throughputBps, duration: maxDuration};
  }

  function TestResponse() {
    var sendDate = (new Date()).getTime();
		$.ajax({
			type: "HEAD",
			url: "",
			timeout: 60000,
			cache: false,
			success: function(){
				var receiveDate = (new Date()).getTime();
				var duration = receiveDate - sendDate;
				reTestRunning = 'no';
				typeof settings.testRttCallback === 'function' && settings.testRttCallback(duration);
			}
		});
  }

  this.stop = function() {
    console.log('stopping test');
    setCurrentState('forcestop');
  }

  //** Default callback function
	function defaultCallbackFunction(value) {
		window.console && console.log(value);
	}
}
