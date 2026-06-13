#!/bin/bash
set -e

PLATFORM=~/Documents/GitHub/horizonsound-platform
PROD=~/horizonsound-prod

echo "Building static site..."
cd $PLATFORM
BUILD_TARGET=static npm run build

echo "Clearing production repo..."
cd $PROD
find . -maxdepth 1 ! -name '.git' ! -name '.' -exec rm -rf {} +

echo "Copying static build..."
cp -R $PLATFORM/dist/* .

echo "Finalizing..."
touch .nojekyll
git add -A
git commit -m "Deploy static site"
git push origin main

echo "Deployment complete."
