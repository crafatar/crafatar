FROM node:12-alpine

ARG AVATAR_MIN
ARG AVATAR_MAX
ARG AVATAR_DEFAULT
ARG RENDER_MIN
ARG RENDER_MAX
ARG RENDER_DEFAULT
ARG FACE_DIR
ARG HELM_DIR
ARG SKIN_DIR
ARG RENDER_DIR
ARG CAPE_DIR
ARG CACHE_LOCAL
ARG CACHE_BROWSER
ARG EPHEMERAL_STORAGE
ARG REDIS_URL
ARG PORT
ARG BIND
ARG EXTERNAL_HTTP_TIMEOUT
ARG DEBUG
ARG LOG_TIME
ARG SPONSOR_SIDE
ARG TOP_RIGHT

ENV NODE_ENV production

RUN apk --no-cache --virtual .build-deps add git python build-base
RUN apk --no-cache --virtual .canvas-deps add cairo-dev pango-dev jpeg-dev giflib-dev

RUN mkdir -p /crafatar/images/faces
RUN mkdir -p /crafatar/images/helms
RUN mkdir -p /crafatar/images/skins
RUN mkdir -p /crafatar/images/renders
RUN mkdir -p /crafatar/images/capes

VOLUME /crafatar/images

COPY package.json www.js config.js crafatar/
COPY lib/ crafatar/lib/

WORKDIR /crafatar

RUN npm install

EXPOSE 3000
ENTRYPOINT npm start