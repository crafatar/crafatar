# Crafatar [![travis](https://img.shields.io/travis/crafatar/crafatar/master.svg?style=flat-square)](https://travis-ci.org/crafatar/crafatar/) [![Coverage Status](https://img.shields.io/coveralls/crafatar/crafatar.svg?style=flat-square)](https://coveralls.io/r/crafatar/crafatar) [![Code Climate](https://img.shields.io/codeclimate/github/crafatar/crafatar.svg?style=flat-square)](https://codeclimate.com/github/crafatar/crafatar)
[![dependency status](https://img.shields.io/david/crafatar/crafatar.svg?style=flat-square)](https://david-dm.org/crafatar/crafatar) [![devDependency status](https://img.shields.io/david/dev/crafatar/crafatar.svg?style=flat-square)](https://david-dm.org/crafatar/crafatar#info=devDependencies) [![docs status](https://inch-ci.org/github/crafatar/crafatar.svg?branch=master&style=flat-square)](https://inch-ci.org/github/crafatar/crafatar)


<img alt="logo" src="lib/public/logo.png" align="right">
<a href="https://crafatar.com">Crafatar</a> serves Minecraft avatars based on the skin for use in external applications.
Inspired by <a href="https://gravatar.com">Gravatar</a> (hence the name) and <a href="https://minotar.net">Minotar</a>.

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

# Installation

## Manual

- Install [nodejs](https://nodejs.org/) 12 (LTS)
- Install `redis-server`
- Run `npm install`  
  If that fails, it's likely because because of `node-canvas` dependencies. Follow [this guide](https://github.com/Automattic/node-canvas/wiki#installation-guides) to install them.
- Run `npm start`

Crafatar is now available at http://0.0.0.0:3000.

## Docker

Download the docker image from [releases](https://github.com/crafatar/crafatar/releases) (docker hub coming soon™️).

```sh
docker load -i crafatar-docker.tar
mkdir /path/to/crafatar-images
```

```sh
docker network create crafatar
docker run --net crafatar -d --name redis redis
docker run --net crafatar -v /path/to/crafatar-images:/crafatar/images -e REDIS_URL=redis://redis -p 3000:3000 crafatar:2.1.0
```

## Environment variables

| Variable            | Default                  | Description                        |
| :-                  | :-                       | :-                                 |
| `BIND`              | `0.0.0.0`                | Hostname to listen on              |
| `PORT`              | `3000`                   | Port to listen on                  |
| `DEBUG`             | `false`                  | Enable verbose debug logging       |
| `REDIS_URL`         | `redis://127.0.0.1:6379` | URI of the redis server            |
| `EPHEMERAL_STORAGE` |                          | If set, redis is flushed on start* |

\* Use this to avoid issues when you have a persistent redis database but an ephemeral storage

# Tests
```sh
npm test
```

If you want to debug failing tests:
```sh
# show logs during tests
env VERBOSE_TEST=true npm test
```

It can be helpful to monitor redis commands to debug caching errors:
```sh
redis-cli monitor
```