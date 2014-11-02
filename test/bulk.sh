#!/bin/bash
dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
rm -f "$dir/../skins/"*.png || exit 1
for uuid in `cat "$dir/uuids.txt"`; do
  uuid=`echo "$uuid" | tr -d '\r'`
  size=$(( ((RANDOM<<15)|RANDOM) % 514 - 1 )) # random number from -1 to 513
  helm=""
  if [ "$(( ((RANDOM<<15)|RANDOM) % 2 ))" -eq "1" ]; then
    helm="&helm"
  fi
  curl -sS -o /dev/null -w "%{url_effective} %{http_code} %{time_total}s\\n" "http://crafatar.com/avatars/$uuid?size=$size$helm" || exit 1
done
