var config = {
  min_size: 0,             // < 0 will (obviously) cause crash
  max_size: 512,           // too big values might lead to slow response time or DoS
  default_size: 180,       // size to be used when no size given
  browser_cache_time: 3600 // seconds until browser will request image again
};

module.exports = config;