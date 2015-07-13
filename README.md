# Crafatar [![travis](https://img.shields.io/travis/crafatar/crafatar/master.svg?style=flat-square)](https://travis-ci.org/crafatar/crafatar/) [![Coverage Status](https://img.shields.io/coveralls/crafatar/crafatar.svg?style=flat-square)](https://coveralls.io/r/crafatar/crafatar) [![Code Climate](https://img.shields.io/codeclimate/github/crafatar/crafatar.svg?style=flat-square)](https://codeclimate.com/github/crafatar/crafatar)
[![IRC: #crafatar](https://img.shields.io/badge/IRC-%23crafatar-blue.svg?style=flat-square)](http://webchat.esper.net/?channels=crafatar) [![dependency status](https://img.shields.io/david/crafatar/crafatar.svg?style=flat-square)](https://david-dm.org/crafatar/crafatar) [![devDependency status](https://img.shields.io/david/dev/crafatar/crafatar.svg?style=flat-square)](https://david-dm.org/crafatar/crafatar#info=devDependencies) [![docs status](http://inch-ci.org/github/crafatar/crafatar.svg?branch=master&style=flat-square)](http://inch-ci.org/github/crafatar/crafatar)


<img alt="logo" src="lib/public/logo.png" align="right">
[Crafatar](https://crafatar.com) serves Minecraft avatars based on the skin for use in external applications.
Inspired by [Gravatar](https://gravatar.com) (hence the name) and [Minotar](https://minotar.net).

Image manipulation is done by [lwip](https://github.com/EyalAr/lwip). 3D renders are created with [node-canvas](https://github.com/Automattic/node-canvas), based on math by [confuser](https://github.com/confuser/serverless-mc-skin-viewer).

# Contributions welcome!

There are usually a few [open issues](https://github.com/crafatar/crafatar/issues).  
We welcome any opinions or advice in discussions as well as pull requests.  
Issues tagged with [![help wanted](https://i.imgur.com/kkozGKY.png "help wanted")](https://github.com/crafatar/crafatar/labels/help%20wanted) show where we could especially need your help!

# Examples

| | | | |
| :---: | :---: | :---: | :---: |
| ![jomo's avatar](https://crafatar.com/avatars/ae795aa86327408e92ab25c8a59f3ba1?size=128) | ![Jake_0's avatar](https://crafatar.com/avatars/2d5aa9cdaeb049189930461fc9b91cc5?size=128) | ![Notch's avatar](https://crafatar.com/avatars/069a79f444e94726a5befca90e38aaf5?size=128) | ![sk89q's avatar](https://crafatar.com/avatars/0ea8eca3dbf647cc9d1ac64551ca975c?size=128) | ![md_5's avatar](https://crafatar.com/avatars/af74a02d19cb445bb07f6866a861f783?size=128) |
| ![jomo's 3d head](https://crafatar.com/renders/head/ae795aa86327408e92ab25c8a59f3ba1?scale=6) | ![Jake_0's 3d head](https://crafatar.com/renders/head/2d5aa9cdaeb049189930461fc9b91cc5?scale=6) | ![Notch's 3d head](https://crafatar.com/renders/head/069a79f444e94726a5befca90e38aaf5?scale=6) | ![sk89q's 3d head](https://crafatar.com/renders/head/0ea8eca3dbf647cc9d1ac64551ca975c?scale=6) | ![md_5's 3d head](https://crafatar.com/renders/head/af74a02d19cb445bb07f6866a861f783?scale=6) |
| ![jomo's 3d body](https://crafatar.com/renders/body/ae795aa86327408e92ab25c8a59f3ba1?scale=6) | ![Jake_0's 3d body](https://crafatar.com/renders/body/2d5aa9cdaeb049189930461fc9b91cc5?scale=6) | ![Notch's 3d body](https://crafatar.com/renders/body/069a79f444e94726a5befca90e38aaf5?scale=6) | ![sk89q's 3d body](https://crafatar.com/renders/body/0ea8eca3dbf647cc9d1ac64551ca975c?scale=6) | ![md_5's 3d body](https://crafatar.com/renders/body/af74a02d19cb445bb07f6866a861f783?scale=6) |
| ![jomo's skin](https://crafatar.com/skins/ae795aa86327408e92ab25c8a59f3ba1) | ![Jake_0's skin](https://crafatar.com/skins/2d5aa9cdaeb049189930461fc9b91cc5) | ![Notch's skin](https://crafatar.com/skins/069a79f444e94726a5befca90e38aaf5) | ![sk89q's skin](https://crafatar.com/skins/0ea8eca3dbf647cc9d1ac64551ca975c) | ![md_5's skin](https://crafatar.com/skins/af74a02d19cb445bb07f6866a861f783) |

## Usage / Documentation

Please [visit the website](https://crafatar.com) for details.

## Contact

* You can [follow](https://twitter.com/crafatar) us on twitter
* Open an [issue](https://github.com/crafatar/crafatar/issues/) on GitHub
* You can [join IRC](https://webchat.esper.net/?channels=crafatar) in #crafatar on irc.esper.net.

## Installation on Heroku
[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

## Installation on Dokku
##### [dokku server]
Install the [dokku-redis](https://github.com/ohardy/dokku-redis#redis-plugin-for-dokku) plugin.
```shell
dokku redis:start
dokku apps:create crafatar
dokku config:set crafatar BIND=0.0.0.0 PORT=5000
```
For persistent images and logs:
```shell
dokku docker-options:add crafatar deploy "-v /var/lib/crafatar/images:/app/images"
dokku docker-options:add crafatar deploy "-v /var/log/crafatar:/app/logs"
```
If you want to listen on extra domains:
```shell
dokku domains crafatar:add example.com
```
##### [your machine]
Add dokku remote and deploy!
```shell
git remote add dokku dokku@example.com:crafatar
git push dokku master
```

## Installation on your machine
* Use io.js
* [Install](https://github.com/Automattic/node-canvas/wiki) Cairo.
* `npm install`
* Start `redis-server`
* `npm start`
* Access [http://localhost:3000](http://localhost:3000)


## Tests
```shell
npm test
```

If you want to debug failing tests:
```shell
# show logs during tests
env VERBOSE_TEST=true npm test
```

It can be helpful to monitor redis commands to debug caching errors:
```shell
redis-cli monitor
```