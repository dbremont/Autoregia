#!/usr/bin/env bash

# Store the formatted date and time as a commit message
MSG=$(date +"%Y-%m-%d %H:%M:%S:%3N")

# Check if there are changes in 'incoming.md'
if git diff --quiet incoming.md; then
    echo "No changes detected in incoming.md. Exiting."
    exit 0
fi

# Commit the changes
git add incoming.md
git commit -m "Savepoint: $MSG"
echo "Changes committed with message: Savepoint: $MSG"
