# bwtestjs
This is a jquery-based speedtest tool which is inspired by JQSpeedTest: https://github.com/skycube/jqspeedtest

It is slightly different in the following ways:

1. It does not generate a random string for upload, it uses the same files that
were used for download to perform the upload
2. JQSpeedTest had the problem that for fast connections, a single TCP
connection could often not overwhelm the connection. This tool allows for
multiple parallel TCP connections inspired by
`iperf3 -P <# of parallel requests>`.
3. This test has different connection speeds in mind and can scale up the test
so that it starts with slow connections and gets more and more demanding if the connection can handle it. For instance, it starts with a 20kb file which should
be downloadable on a 28.8 kbit/s connection in 5 seconds. If this happens fast
enough, it will proceed to a 40kb file which should be downloadable in 5 seconds
on a 56.6 kbit/s connection. This continues all the way up to a 1Gpbs connection
with the target time of about 10 seconds for the total test.

## Instructions
1. Clone the repo into your webserver
2. On the webserver, run the `generate_data.sh` file to generate the data files.
3. If you wish to have a separate server to handle the load of the bandwidth
tests, host the test transfer files on that server, and set the server url
in the configuration.
4. On the client webpage, use jquery's onload, or attach a button click event
to starting the bandwidth test.
5. Tie-in to the event-driven callback functions to handle the results of the
test.
