# Speedtest Dashboard

Get an overview of your bandwidth speed on a given time span.

## Required libraries
  * [dygraphs](http://dygraphs.com/)
  * [jquery](http://jquery.com/)
  * [bootstrap 3.x](http://getbootstrap.com/)
  * [modified speedtest-cli](https://github.com/cjeanneret/speedtest-cli)

## How does it work?
On a computer that runs 24/7, with correct network interface (gigabit, fiber, etc),
configure a cronjob that calls the "speedtest" script.
You might need to edit the speedtest-cli git clone path in order to make it work.

You might as well want to edit the "wget" command in order to check with another website
than google.com. Just ensure it's a reliable target.

### Cronjob

The cron job must looks like that:
```Bash
*/2 *   *   *   *    /path/to/speedtest >> /var/www/speedtest/log.csv
```

With /var/www/speedtest/log.csv the file that will be accessed by dygraphs lib

### nginx/apache/other
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
