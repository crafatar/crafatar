var config = {
  min_size: 1,               // < 1 will (obviously) cause crash
  max_size: 512,             // too big values might lead to slow response time or DoS
  default_size: 160,         // size to be used when no size given
  local_cache_time: 1200,    // seconds until we will check if the image changed. should be > 60 to prevent mojang 429 response
  browser_cache_time: 3600,  // seconds until browser will request image again
  cleaning_interval: 1800,   // seconds interval: deleting images if disk size at limit
  cleaning_limit: 10240,     // minumum required available KB on disk to trigger cleaning
  cleaning_amount: 50000,    // amount of avatar (and their helm) files to clean
  http_timeout: 1000,        // ms until connection to mojang is dropped
  faces_dir: 'skins/faces/', // directory where faces are kept. should have trailing '/'
  helms_dir: 'skins/helms/', // directory where helms are kept. should have trailing '/'
  skins_dir: 'skins/skins/', // directory where skins are kept. should have trailing '/'
  renders_dir: 'skins/renders', // Directory where rendered skins are kept. should have trailing '/'
  debug_enabled: false,      // enables logging.debug
  default_scale: 6,          // the scale of rendered avatars
  maximum_scale: 10           // the maximum scale of rendered avatars
};

module.exports = config;