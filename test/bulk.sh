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
id_file="$(echo | cat 'uuids.txt' - 'usernames.txt')"
mapfile ids <<< $id_file

bulk() {
  trap return INT
  for id in $ids; do
    if [ -z "$async" ]; then
      curl -sSL -o /dev/null -w "%{url_effective} %{http_code} %{time_total}s\\n" -- "$host/avatars/$id?helm"
    else
      curl -sSL -o /dev/null -w "%{url_effective} %{http_code} %{time_total}s\\n" -- "$host/avatars/$id?helm" &
      sleep "$interval"
    fi
  done
}

time bulk