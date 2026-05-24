#!/bin/bash
# Install system dependencies for MediaPipe
apt-get install -y libgles2 libgl1-mesa-glx libglib2.0-0 libsm6 libxext6 libxrender-dev
pip install -r requirements.txt