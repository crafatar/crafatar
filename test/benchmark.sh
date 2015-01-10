#!/usr/bin/env bash
host="$1"
if [ -z "$host" ]; then
  echo "Usage: $0 <host uri> > benchmark.txt 2>&1"
  exit 1
fi

# insert newline after uuids
id_file="$(echo | cat 'uuids.txt' - 'usernames.txt')"
mapfile ids <<< $id_file

bench() {
  for id in $ids; do
    id=`echo "$id" | tr -d "\r"`
    curl -sSL -o /dev/null -w "%{url_effective} %{http_code} %{time_total}s\\n" "$host/avatars/$id?helm"
  done
}

time bench