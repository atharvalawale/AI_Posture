#!/usr/bin/env bash
set -e

apt-get install -y libgles2 libgl1 libglib2.0-0

pip install -r requirements.txt
