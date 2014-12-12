var config = {
  min_size: 1,                   // for avatars
  max_size: 512,                 // for avatars; too big values might lead to slow response time or DoS
  default_size: 160,             // for avatars; size to be used when no size given
  local_cache_time: 1200,        // seconds until we will check if the image changed. should be > 60 to prevent mojang 429 response
  browser_cache_time: 3600,      // seconds until browser will request image again
  cleaning_interval: 1800,       // seconds interval: deleting images if disk size at limit
  cleaning_disk_limit: 10240,    // min allowed available KB on disk to trigger cleaning
  cleaning_redis_limit: 24576,   // max allowed used KB on redis to trigger redis flush
  cleaning_amount: 50000,        // amount of avatar (and their helm) files to clean
  http_timeout: 1000,            // ms until connection to mojang is dropped
  faces_dir: "images/faces/",    // directory where faces are kept. should have trailing "/"
  helms_dir: "images/helms/",    // directory where helms are kept. should have trailing "/"
  skins_dir: "images/skins/",    // directory where skins are kept. should have trailing "/"
  renders_dir: "images/renders/",// Directory where rendered skins are kept. should have trailing "/"
  capes_dir: "images/capes/",     // directory where capes are kept. should have trailing "/"
  debug_enabled: false,          // enables logging.debug
  min_scale: 1,                  // for renders
  max_scale: 10,                 // for renders; too big values might lead to slow response time or DoS
  default_scale: 6               // for renders; scale to be used when no scale given
};

module.exports = config;
