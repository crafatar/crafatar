#!/bin/bash
host="$1"
if [ -z "$host" ]; then
  echo "Usage: $0 <host>"
  exit 1
fi
dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
rm -f "$dir/../skins/"*.png || exit 1
for uuid in `cat "$dir/uuids.txt"`; do
  uuid=`echo "$uuid" | tr -d '\r'`
  size=$(( ((RANDOM<<15)|RANDOM) % 514 - 1 )) # random number from -1 to 513
  helm=""
  if [ "$(( ((RANDOM<<15)|RANDOM) % 2 ))" -eq "1" ]; then
    helm="&helm"
  fi
  curl -sSL -o /dev/null -w "%{url_effective} %{http_code} %{time_total}s\\n" "http://$host/avatars/$uuid?size=$size$helm" || exit 1
done
