var config = {
  avatars: {
    // for avatars
    min_size: parseInt(process.env.AVATAR_MIN) || 1,
    // for avatars; large values might lead to slow response time or DoS
    max_size: parseInt(process.env.AVATAR_MAX) || 512,
    // for avatars; size to be used when no size given
    default_size: parseInt(process.env.AVATAR_DEFAULT) ||  160
  },
  renders: {
    // for 3D rendered skins
    min_scale: parseInt(process.env.RENDER_MIN) || 1,
    // for 3D rendered skins; large values might lead to slow response time or DoS
    max_scale: parseInt(process.env.RENDER_MAX) || 10,
    // for 3D rendered skins; scale to be used when no scale given
    default_scale: parseInt(process.env.RENDER_DEFAULT) || 6
  },
  directories: {
    // directory where faces are kept. must have trailing "/"
    faces: process.env.FACE_DIR || "./images/faces/",
    // directory where helms are kept. must have trailing "/"
    helms: process.env.HELM_DIR || "./images/helms/",
    // directory where skins are kept. must have trailing "/"
    skins: process.env.SKIN_DIR || "./images/skins/",
    // directory where rendered skins are kept. must have trailing "/"
    renders: process.env.RENDER_DIR || "./images/renders/",
    // directory where capes are kept. must have trailing "/"
    capes: process.env.CAPE_DIR || "./images/capes/"
  },
  caching: {
    // seconds until we will check if user's skin changed.
    // Should be > 60 to comply with Mojang's rate limit
    local: parseInt(process.env.CACHE_LOCAL) || 1200,
    // seconds until browser will request image again
    browser: parseInt(process.env.CACHE_BROWSER) || 3600,
    // If true, redis is flushed on start.
    // Use this to avoid issues when you have a persistent redis database but an ephemeral storage
    ephemeral: process.env.EPHEMERAL_STORAGE === "true",
    // Used for information on the front page
    cloudflare: process.env.CLOUDFLARE === "true"
  },
  // URL of your redis server
  redis: process.env.REDIS_URL || 'redis://localhost:6379',
  server: {
    // port to listen on
    port: parseInt(process.env.PORT) || 3000,
    // IP address to listen on
    bind: process.env.BIND || "0.0.0.0",
    // ms until connection to Mojang is dropped
    http_timeout: parseInt(process.env.EXTERNAL_HTTP_TIMEOUT) || 2000,
    // enables logging.debug & editing index page
    debug_enabled: process.env.DEBUG === "true",
    // set to false if you use an external logger that provides timestamps,
    log_time: process.env.LOG_TIME === "true",
    // rate limit per second for outgoing requests to the Mojang session server
    // requests exceeding this limit are skipped and considered failed
    sessions_rate_limit: parseInt(process.env.SESSIONS_RATE_LIMIT) || Infinity
  },
  sponsor: {
    sidebar: process.env.SPONSOR_SIDE,
    top_right: process.env.SPONSOR_TOP_RIGHT
  },
};

module.exports = config;