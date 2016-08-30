# Speedtest Dashboard

Get an overview of your bandwidth speed on a given time span.

![Alt text](/dashboard-example.jpg?raw=true "Screenshot")

![Alt text](/mobile-full.jpg?raw=true "Mobile view")

![Alt text](/mobile-info.jpg?raw=true "Mobile with information")

## Required libraries
  * [dygraphs](http://dygraphs.com/)
  * [jquery](http://jquery.com/)
  * [bootstrap 3.x](http://getbootstrap.com/)
  * [momentjs](http://momentjs.com/)
  * [modified speedtest-cli](https://github.com/cjeanneret/speedtest-cli)

Note: the modified speedtest-cli might become deprecated, as the next release should
allow computer-parsable outputs. Stay tuned!

## How does it work?
On a computer that runs 24/7, with correct network interface (gigabit, fiber, etc),
configure a cronjob that calls the "speedtest" script.
You might need to edit the speedtest-cli git clone path in order to make it work.

You might as well want to edit the "wget" command in order to check with another website
than google.com. Just ensure it's a reliable target.


### Configuration
You will need to configure some stuff:

#### Script
In the utils/speedtest, you need to fill two variables:
  * SPEEDTEST_CLI_PATH (directory where to find the modified speedtest_cli.py)
  * USE_CDB (whether you use couchdb or not — set it to 1 if in use)

#### Index file
In index.html, you will need to fill the following variables:
  * MAX_BW (maximum bandwidth as announced by your provider, in Mbit/s)
  * COUCHDB (are you using CouchDB [boolean, true or false])
  * DEFAULT_SPAN how many hours do you want to display by default

### Cronjob
#### CSV
The cron job looks like that:
```Bash
*/2 *   *   *   *    /path/to/speedtest >> /var/www/speedtest/log.csv
```
With /var/www/speedtest/log.csv the file that will be accessed by dygraphs lib

#### CouchDB
The cron job looks like that:
```Bash
*/2 *   *   *   *    /path/to/speedtest
```

## Application server
### CouchDB
It is recommended to use couchdb as a backend. For now, only a localhost, admin-party CDB is supported. If you 
don't know what that means, you might want to read a bit the doc on CDB ;).

In case you don't want to use CouchDB, please set the variables accordingly in both script and index.html.

### Web server
Configure a virtual host on your computer, something like (nginx):
```conf
server {
  listen 80;
  server_name bandwidth.localdomain.tld;
  add_header X-Frame-Options SAMEORIGIN;
  if ($http_transfer_encoding ~* chunked) {
    return 444;
  }

  location / {
    root /var/www/speedtest;
  }
}
```
Enable that vhost, and that's it.

You may find a better configuration example in the "examples" directory for nginx, with support for couchdb.
