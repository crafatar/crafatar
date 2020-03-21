FROM node:12-alpine

ARG REDIS_URL
ARG DEBUG
ARG EPHEMERAL_STORAGE

RUN apk --no-cache --virtual .build-deps add git python build-base
RUN apk --no-cache --virtual .canvas-deps add cairo-dev pango-dev jpeg-dev giflib-dev

RUN mkdir -p /crafatar/images/faces
RUN mkdir -p /crafatar/images/helms
RUN mkdir -p /crafatar/images/skins
RUN mkdir -p /crafatar/images/renders
RUN mkdir -p /crafatar/images/capes

VOLUME /crafatar/images

COPY package.json www.js crafatar/
COPY config.example.js crafatar/config.js
COPY lib/ crafatar/lib/

WORKDIR /crafatar

RUN npm install

EXPOSE 3000
ENTRYPOINT npm start