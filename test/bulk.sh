#!/usr/bin/env bash

hostname="crafatar.com"
async="true"
random="false"
interval="0.1"

usage() {
  echo "Usage: $0 [-s | -r | -i <interval> | -h <hostname>]... <host uri>" >&2
  exit 1
}

get_ids() {
  local shuf
  if [ "$random" = "true" ]; then
    while true; do uuid -v 4; done
  else
    # `brew install coreutils` on OS X for gshuf
    shuf=$(command -v shuf gshuf)
    # randomize ids
    $shuf < uuids.txt
  fi
}

bulk() {
  trap return INT # return from this function on Ctrl+C
  get_ids | while read id; do
    if [ "$async" = "false" ]; then
      curl -H "Host: $hostname" -sSL -o /dev/null -w "%{url_effective} %{http_code} %{time_total}s\\n" -- "$host/avatars/$id?overlay"
    else
      curl -H "Host: $hostname" -sSL -o /dev/null -w "%{url_effective} %{http_code} %{time_total}s\\n" -- "$host/avatars/$id?overlay" &
      sleep "$interval"
    fi
  done
}

while [ $# != 0 ]; do
  case "$1" in
    -s)
      async="false";;
    -r)
      random="true";;
    -i)
      interval="$2"
      shift;;
    *)
      [ -n "$host" ] && usage
      host="$1";;
  esac
  shift
done

[ -z "$host" ] && usage

time bulk