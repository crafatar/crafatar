var config = {
  avatars: {
    min_size: 1,                                  // for avatars
    max_size: 512,                                // for avatars; too big values might lead to slow response time or DoS
    default_size: 160                             // for avatars; size to be used when no size given
  },
  renders: {
    min_scale: 1,                                 // for 3D rendered skins
    max_scale: 10,                                // for 3D rendered skins; too big values might lead to slow response time or DoS
    default_scale: 6                              // for 3D rendered skins; scale to be used when no scale given
  },
  cleaner: {
    interval: 1800,                               // interval seconds to check limits
    disk_limit: 10240,                            // min allowed free KB on disk to trigger image deletion
    redis_limit: 24576,                           // max allowed used KB on redis to trigger redis flush
    amount: 50000                                 // amount of skins for which all image types are deleted
  },
  directories: {
    faces: "/var/lib/crafatar/images/faces/",     // directory where faces are kept. must have trailing "/"
    helms: "/var/lib/crafatar/images/helms/",     // directory where helms are kept. must have trailing "/"
    skins: "/var/lib/crafatar/images/skins/",     // directory where skins are kept. must have trailing "/"
    renders: "/var/lib/crafatar/images/renders/", // directory where rendered skins are kept. must have trailing "/"
    capes: "/var/lib/crafatar/images/capes/"      // directory where capes are kept. must have trailing "/"
  },
  caching: {
    local: 1200,                                  // seconds until we will check if user's skin changed. should be > 60 to comply with Mojang's rate limit
    browser: 3600                                 // seconds until browser will request image again
  },
  server: {
    http_timeout: 1000,                           // ms until connection to Mojang is dropped
    debug_enabled: false,                         // enables logging.debug
    log_time: true                                // set to false if you use an external logger that provides timestamps
  }
};

module.exports = config;