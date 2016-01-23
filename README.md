# Crafatar [![travis](https://img.shields.io/travis/crafatar/crafatar/master.svg?style=flat-square)](https://travis-ci.org/crafatar/crafatar/) [![Coverage Status](https://img.shields.io/coveralls/crafatar/crafatar.svg?style=flat-square)](https://coveralls.io/r/crafatar/crafatar) [![Code Climate](https://img.shields.io/codeclimate/github/crafatar/crafatar.svg?style=flat-square)](https://codeclimate.com/github/crafatar/crafatar)
[![IRC: esper.net](https://img.shields.io/badge/IRC-esper.net-blue.svg?style=flat-square)](https://webchat.esper.net/?channels=crafatar "#crafatar") [![dependency status](https://img.shields.io/david/crafatar/crafatar.svg?style=flat-square)](https://david-dm.org/crafatar/crafatar) [![devDependency status](https://img.shields.io/david/dev/crafatar/crafatar.svg?style=flat-square)](https://david-dm.org/crafatar/crafatar#info=devDependencies) [![docs status](https://inch-ci.org/github/crafatar/crafatar.svg?branch=master&style=flat-square)](https://inch-ci.org/github/crafatar/crafatar)


<img alt="logo" src="lib/public/logo.png" align="right">
[Crafatar](https://crafatar.com) serves Minecraft avatars based on the skin for use in external applications.
Inspired by [Gravatar](https://gravatar.com) (hence the name) and [Minotar](https://minotar.net).

Image manipulation is done by [lwip](https://github.com/EyalAr/lwip). 3D renders are created with [node-canvas](https://github.com/Automattic/node-canvas) / [cairo](http://cairographics.org/).

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

# Installation

Have a look at [crafatar/setup](https://github.com/crafatar/setup) to see how we set things up at Crafatar.

For more info about local setup, Heroku, or Dokku please see [Installation](https://github.com/crafatar/crafatar/wiki/Installation) on the wiki.

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