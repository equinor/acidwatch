#!/usr/bin/env bash
# https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/robots
#
# This script gets rid of the tags and stuff that disallows web crawlers from
# crawling this website. The goal is to not have any development websites be
# indexed on web searchers. However, on prod we need to remove these tags so
# that only the prod is indexed.
set -ex

if [[ "$FRONTEND_URI" = "https://frontend-acidwatch-prod.radix.equinor.com" ]]
then
  sed -i '/name="robots"/d' /app/www/index.html
  rm -f /app/www/robots.txt
fi
