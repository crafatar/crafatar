#!/usr/bin/env bash

async="true"
interval="0.1"
if [ "$1" = "-s" ]; then
  async=""
  shift
elif [ "$1" = "-i" ]; then
  interval="$2"
  shift 2
fi
host="$1"
shift
if [ -z "$host" ] || [ ! -z "$@" ]; then
  echo "Usage: $0 [-s | -i <interval>] <host uri>"
  exit 1
fi

# insert newline after uuids
ids="$(echo | cat 'uuids.txt' - 'usernames.txt')"
# `brew install coreutils` on OS X
ids="$(shuf <<< "$ids" 2>/dev/null || gshuf <<< "$ids")"

bulk() {
  trap return INT
  echo "$ids" | while read id; do
    if [ -z "$async" ]; then
      curl -sSL -o /dev/null -w "%{url_effective} %{http_code} %{time_total}s\\n" -- "$host/avatars/$id?overlay"
    else
      curl -sSL -o /dev/null -w "%{url_effective} %{http_code} %{time_total}s\\n" -- "$host/avatars/$id?overlay" &
      sleep "$interval"
    fi
  done
}

time bulk