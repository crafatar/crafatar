#!/bin/bash

# deletes old images on heroku
# heroku provides only 300 MB available disk space

# number of files to delete (2 files ~ 400B)
amount="50000" # about 20MB

# max free MB (on /) to trigger deletion
trigger="50"

available=`df -m / | awk 'NR==2 { print $4 }'` # MB available on /
if [ "$available" -le "$trigger" ]; then
  echo "Deleting old images"
  for file in `ls -1tr "/app/skins/faces" | head -n $amount`; do
    rm -rf "/app/skins/faces/$file"
  done
  for file in `ls -1tr "/app/skins/helms" | head -n $amount`; do
    rm -rf "/app/skins/helms/$file"
  done
  echo "done."
else
  echo "More than $trigger MB are available ($available MB), not deleting!"
fi