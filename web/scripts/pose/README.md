# Pose clip extraction

`extract_pose.py` runs the MediaPipe pose landmarker (heavy model) over a video and writes the
compact pose clip that the homepage phone uses to draw the skeleton (`public/media/squat.pose.json`).

## Setup

Python 3.11 works. From `web/scripts/pose`:

```sh
python3.11 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

The first run downloads `pose_landmarker_heavy.task` (about 30 MB) to `~/.cache/fiixbe/`.
Set `POSE_MODEL=/path/to/model.task` to use a file you already have.

## Usage

```sh
.venv/bin/python extract_pose.py ../../public/media/squat-720.mp4 ../../public/media/squat.pose.json
```

The script samples about 15 frames per second, keeps 15 landmarks (nose, shoulders, elbows,
wrists, hips, knees, ankles, toes) and stores coordinates as integers in thousandths of the
frame size. A 30 second clip comes out at about 53 KB. Frames without a detected person reuse
the nearest detected pose.

If you change the kept landmarks, update `LANDMARKS` in `src/lib/pose/clip.ts` too.

## Replacing the clip

1. Encode the new video: `ffmpeg -i in.mp4 -an -c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p -movflags +faststart public/media/squat-720.mp4` (keep it under 3 MB).
2. Extract the poster: `ffmpeg -ss 0.5 -i public/media/squat-720.mp4 -frames:v 1 poster.png`, then save it as `public/media/squat-poster.webp` at quality 78.
3. Run the script above and `npx vitest run src/lib/pose` (the tests check the knee angle range and rep count, so update them for a different exercise).
4. Record the source in `credits/media.md`.
