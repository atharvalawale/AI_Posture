---
title: "AI in physiotherapy: what a phone camera can and cannot do for your recovery"
slug: "ai-physiotherapy-india"
description: "Camera-based AI can count reps and check form at home. Here is what it does well, where it falls short, and what it means in India."
category: "Technology"
date: "2026-10-27"
readingMinutes: 7
author: "FiixBE Clinical Team"
reviewedBy: "Dr. Gayatri Bodas"
featured: false
image:
  src: "/images/blog/ai-physiotherapy-india.webp"
  page: "https://unsplash.com/photos/woman-exercising-on-yoga-mat-watching-laptop-7Kz3H4p_q64"
  photographer: "Vitaly Gariev"
  alt: "A woman exercises on a mat in her living room with a laptop open in front of her"
sources:
  - title: "Wade L et al. Applications and limitations of current markerless motion capture methods for clinical gait biomechanics. PeerJ, 2022"
    url: "https://europepmc.org/article/MED/35237469"
  - title: "Lam WWT, Tang YM, Fong KNK. A systematic review of the applications of markerless motion capture (MMC) technology for clinical measurement in rehabilitation. Journal of NeuroEngineering and Rehabilitation, 2023"
    url: "https://europepmc.org/article/MED/37131238"
  - title: "Cottrell MA et al. Real-time telerehabilitation for the treatment of musculoskeletal conditions is effective and comparable to standard practice: a systematic review and meta-analysis. Clinical Rehabilitation, 2017"
    url: "https://europepmc.org/article/MED/27141087"
  - title: "Lambert TE et al. An app with remote support achieves better adherence to home exercise programs than paper handouts in people with musculoskeletal conditions: a randomised trial. Journal of Physiotherapy, 2017"
    url: "https://europepmc.org/article/MED/28662834"
  - title: "Argent R, Daly A, Caulfield B. Patient involvement with home-based exercise programs: can connected health interventions influence adherence? JMIR mHealth and uHealth, 2018"
    url: "https://europepmc.org/article/MED/29496655"
  - title: "India: member organisation profile (World Physiotherapy)"
    url: "https://world.physio/membership/india"
  - title: "Rehabilitation fact sheet (World Health Organization)"
    url: "https://www.who.int/news-room/fact-sheets/detail/rehabilitation"
  - title: "Affordable and Accessible Healthcare for All (Press Information Bureau, Government of India)"
    url: "https://www.pib.gov.in/FactsheetDetails.aspx?id=150834&ModuleId=16&reg=48&lang=1"
---

You may have seen apps that watch you exercise through your phone camera. They count your squats, tell you to bend your knee a little more, and keep a record of every session.

This is real technology, and it is useful. It is also easy to oversell. This article explains how it works, what it does well, where it falls short, and why it matters for patients in India.

## How a camera "sees" your body

The technology is called pose estimation. Software looks at each video frame and finds key points on your body, such as your shoulders, elbows, hips, knees and ankles. It joins these points into a simple stick figure.

From that stick figure, the software can work out a few useful things:

- **Joint angles.** For example, how far your knee bends during a squat.
- **Repetitions.** Each time your body moves through a full cycle, it counts one rep.
- **Timing.** How long you hold a position, and how fast you move.
- **Form.** Whether your movement matches what your plan asks for, such as keeping your knee in line with your toes.

No special suit or sensors are needed. A phone or laptop camera is enough.

## What it does well

### Counting and recording

Counting reps and timing holds depend on spotting when a movement starts and ends. That is easier for a camera than measuring exact angles. A 2022 review found that camera-based timing and step measures during walking were broadly similar to those from lab equipment.

This matters more than it sounds. Your physio usually has no idea what you did at home between visits. A record of each session closes that gap.

### Giving feedback in the moment

When you exercise alone, it is hard to know if you are doing it right. Real-time feedback can remind you to slow down, go a little deeper or stay in line. A 2018 review noted that feedback showing patients they are exercising correctly may improve both confidence and adherence.

### Keeping you going

Doing home exercises consistently is hard for many people. A 2017 trial compared an exercise app, backed by phone calls and motivational text messages, with a paper handout. People using the app reported better adherence. The difference was modest. It still shows that tools can help when a person stays involved.

## What it cannot do

### Measure angles as precisely as a lab

The same 2022 review found that joint angles from camera systems are not yet accurate enough for clinical measurement. In some studies, lower limb angles differed from lab systems by 3 to 11 degrees. With a single camera, ankle angles were sometimes out by as much as 30 degrees.

That is fine for spotting a clear mistake, like a knee that caves inwards. It is not good enough to replace your physio's careful measurements.

### See what is hidden

The camera only sees what is in front of it. Researchers describe these common problems:

- **Hidden body parts.** If one leg blocks the other, the software can lose track or even mix up left and right.
- **Camera angle.** Angles are most reliable when the camera faces the movement squarely, for example from the side for a knee bend.
- **Twisting movements.** Rotation around the length of a limb is hard to capture with current methods.
- **Loose clothing.** Most testing has been done with tight-fitting clothes. Baggy clothes may affect accuracy.
- **Depth.** A single camera has to guess how far each body part is from the lens.

### Replace clinical judgement

A camera cannot feel a stiff joint or a weak muscle. It cannot see swelling, ask about your pain, or know your medical history. It cannot diagnose a problem or decide when you are ready for the next stage.

A 2023 systematic review of 65 studies found the technology promising for assessment, with a shift towards smartphone video. The authors also said the benefits were still unclear and clinical use was at an early stage.

So the right role for AI is support. A licensed physiotherapist assesses you, writes the plan and adjusts it. The software helps you follow that plan between visits.

## Does remote physiotherapy work?

Remote care is not second best for everyone. A 2017 review pooled 13 studies with 1,520 people who had muscle and joint problems. Physiotherapy delivered live and remotely improved physical function about as well as face-to-face care. Results for pain were also similar, although less certain.

These studies looked at live sessions with a clinician, not AI alone. That difference matters. The evidence supports remote care with a professional, not apps that work without one.

## Why this matters in India

India has far fewer physiotherapists than it needs. World Physiotherapy estimates there are about 52,000 practising physiotherapists in India. That is roughly 0.36 for every 10,000 people. In Australia, the figure is about 17 for every 10,000.

```chart
{
  "title": "Practising physiotherapists for every 10,000 people",
  "decimals": 2,
  "bars": [
    {"label": "India", "value": 0.36},
    {"label": "Australia", "value": 16.85}
  ],
  "note": "Both figures come from the country data table on World Physiotherapy's India profile.",
  "sources": [
    {"name": "World Physiotherapy, India member organisation profile", "url": "https://world.physio/membership/india"}
  ]
}
```

The World Health Organization says the need for rehabilitation in many countries is largely unmet. In some low- and middle-income countries, more than half the people who need rehabilitation do not receive it. WHO lists the reasons: few services outside cities, long waiting times, high out-of-pocket costs and too few trained staff.

Many Indian patients will recognise these problems. A daily clinic visit can mean long travel, lost wages and a family member taking time off. In many towns, there may be no physiotherapist nearby.

Remote care is already familiar to many Indians. The government's eSanjeevani telemedicine service had delivered over 49 crore consultations by August 2026. World Physiotherapy's profile for India also lists telehealth as a service physiotherapists may provide.

Camera-based tools can help in a few practical ways:

- **Fewer trips.** You can do most sessions at home and visit the clinic when you need hands-on care.
- **Wider reach.** A physiotherapist in a city can guide patients in smaller towns and review their sessions remotely.
- **Better use of time.** Your physio can spend appointments on what needs their skill, instead of only counting reps.

There are real limits too. You need a working phone, a stable internet connection and some floor space. Some people will need help from a family member to set up.

## Who should not rely on home AI tools alone

Some situations need closer, hands-on care. Talk to your physio before using any app if you:

- Have just had surgery and have not been cleared for home exercise
- Have poor balance or have fallen recently
- Have severe or worsening pain
- Have a neurological condition such as a stroke or Parkinson's disease, unless your physio has set up the programme for you
- Notice new numbness, tingling or weakness

## Getting the most from a camera-based app

If your physiotherapist recommends one, these tips will help the camera do its job:

1. Make sure a licensed physiotherapist has written or approved your plan.
2. Place the phone so your whole body is in the frame. Use the angle the app asks for, often from the side.
3. Exercise in good light, with fitted clothes.
4. Clear the space around you. Keep a sturdy chair nearby for support.
5. Treat the feedback as a guide. If something hurts, stop and tell your physio, whatever the app says.
6. Ask where your videos are stored and who can see them.

## Where FiixBE fits

FiixBE follows this model. Your physiotherapist writes your exercise plan. You do it at home in front of your phone camera. FiixBE counts your reps, measures joint angles and gives real-time feedback on your form. Each session goes to your physio, who decides what comes next. The web version works today in any browser, and you can try it there.
