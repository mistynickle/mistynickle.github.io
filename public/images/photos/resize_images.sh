#!/bin/bash 
mkdir -p 100x100
cp -R ./*.png 100x100
cd 100x100
sips -Z 100 *.png
cd ..

mkdir -p 1200x1200
cp -R ./*.png 1200x1200
cd 1200x1200
sips -Z 1200 *.png
cd ..