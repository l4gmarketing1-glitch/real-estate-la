#!/usr/bin/env python3
"""Offline 30-second edit. Uses existing Seedance footage; never calls an API.
Requires Python 3 with Pillow, FFmpeg with libass, and DejaVu fonts.
"""
from pathlib import Path
import json, shutil, subprocess, tempfile, sys
from PIL import Image, ImageOps, ImageFilter, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'media/source/seedance-property-20s.mp4'
SPATIAL = '--spatial' in sys.argv
OUTPUT = ROOT / ('site/assets/media/film-30s-spatial.mp4' if SPATIAL else 'site/assets/media/film-30s-smooth.mp4')
SPATIAL_SHOTS = json.loads((ROOT / 'media/spatial/edit.json').read_text()) if SPATIAL else {}
if SPATIAL and not all(shot.get('reviewed') for shot in SPATIAL_SHOTS.values()):
    raise SystemExit('Review the generated scenes and cut points in media/spatial/edit.json before rendering.')
FPS = 48
# Source clips are kept inside their actual scene boundaries.
SHOTS = [
    ('video', 0, 2), ('facade', 0, 2), ('video', 5.1, 2),
    ('dining', 0, 2), ('video', 10, 2),
    ('bedroom', 0, 2), ('bedroom-two', 0, 2), ('bedroom-three', 0, 2),
    ('bath', 0, 2), ('bath-two', 0, 2), ('sunroom-wide', 0, 2),
    ('basement', 0, 2), ('garden', 0, 2), ('garage', 0, 2), ('video', 17, 2),
]
CARDS = [
    ('A Los Angeles original', 'Single-family home | 1927 Craftsman with Tudor Revival details'),
    ('Historic character', 'HPOZ contributing home | Curved gable & angled bay'),
    ('Restored original hardwood', 'Arched window | Fresh paint inside and out'),
    ('Room to gather', 'New roof | New plumbing'),
    ('Brand-new kitchen', 'New appliances | Thoughtfully updated'),
    ('Three bedrooms', '1,981 sq ft | Space for your next chapter'),
    ('Room to make your own', '1927 craftsmanship, preserved'),
    ('A fresh start', 'Move-in ready, with major systems upgraded'),
    ('Two bathrooms', 'Everyday comfort in a historic home'),
    ('Beautifully refreshed', 'Original character. Modern updates.'),
    ('Follow the sunlight', 'Enclosed porch | Space to unwind'),
    ('Fully renovated basement', 'Flexible additional space'),
    ('7,498 sq ft lot', 'Mature shade tree | Sweeping front lawn'),
    ('Detached 2-car garage', 'Gated driveway | Secure parking & extra storage'),
    ('Your next chapter starts here', 'Near dining, parks & shopping | San Fernando Valley'),
]
assert len(SHOTS) == len(CARDS) == 15
assert all(shot[2] == 2 for shot in SHOTS)
assert sum(shot[2] for shot in SHOTS) == 30

def run(*args):
    subprocess.run([str(a) for a in args], check=True, cwd=ROOT)

def timestamp(seconds):
    return f'0:{int(seconds)//60:02d}:{seconds%60:05.2f}'

with tempfile.TemporaryDirectory(prefix='lemay-edit-') as directory:
    tmp = Path(directory)
    # Fixed-scale, floating-point affine sampling avoids zoompan's integer
    # crop rounding. Every frame is sampled from the original, never the last frame.
    directions = {'facade': 1, 'dining': -1, 'bedroom': 1, 'bedroom-two': -1,
        'bedroom-three': 1, 'bath': -1, 'bath-two': 1, 'sunroom-wide': -1,
        'basement': 1, 'garden': -1, 'garage': 1}
    for index, (source, start, duration) in enumerate(SHOTS):
        target = tmp / f'{index:02d}.mp4'
        frames = int(duration * FPS)
        encode = ['-frames:v', str(frames), '-an', '-r', str(FPS), '-fps_mode', 'cfr',
                  '-c:v', 'libx264', '-bf', '0', '-video_track_timescale', '48000',
                  '-preset', 'fast', '-crf', '19', '-threads', '2', str(target)]
        if source == 'video' or SPATIAL:
            clip = SOURCE if source == 'video' else ROOT / SPATIAL_SHOTS[source]['file']
            clip_start = start if source == 'video' else SPATIAL_SHOTS[source]['start']
            direction = 'trim=duration=2,reverse,' if SPATIAL and source != 'video' and SPATIAL_SHOTS[source].get('reverse') else ''
            run('ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', clip_start, '-i', clip,
                '-vf', direction + f'scale=1280:720,setsar=1,fps={FPS},setpts=N/({FPS}*TB),format=yuv420p', *encode)
        else:
            photo = Image.open(ROOT / f'site/assets/images/{source}-1024.webp').convert('RGB')
            canvas = ImageOps.fit(photo, (1280,720), method=Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(25))
            canvas = ImageEnhance.Brightness(canvas).enhance(.88)
            foreground = ImageOps.contain(photo, (1280,720), method=Image.Resampling.LANCZOS)
            canvas.paste(foreground, ((1280-foreground.width)//2,(720-foreground.height)//2))
            # Constant lens scale avoids changing resampling sharpness between frames.
            scale = 1.04
            process = subprocess.Popen(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
                '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '1280x720', '-r', str(FPS),
                '-i', '-', '-vf', 'format=yuv420p', *encode], stdin=subprocess.PIPE)
            try:
                for frame in range(frames):
                    t = frame / (frames-1)
                    ease = t*t*(3-2*t)
                    offset = directions[source] * (ease-.5) * 22
                    transform = (1/scale, 0, (1280-1280/scale)/2 + offset,
                                 0, 1/scale, (720-720/scale)/2)
                    image = canvas.transform((1280,720), Image.Transform.AFFINE, transform,
                                             resample=Image.Resampling.BICUBIC)
                    process.stdin.write(image.tobytes())
            finally:
                process.stdin.close()
            assert process.wait() == 0
        info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=nb_frames,duration','-of','json',str(target)]))
        assert int(info['streams'][0]['nb_frames']) == frames and abs(float(info['streams'][0]['duration'])-2) < 0.001, info
        print(f'Prepared shot {index+1}/{len(SHOTS)}: {source}, exactly 2 seconds', flush=True)
    concat = tmp / 'shots.txt'
    concat.write_text(''.join(f"file '{tmp / f'{i:02d}.mp4'}'\n" for i in range(len(SHOTS))))
    run('ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', concat, '-c', 'copy', tmp / 'joined.mp4')
    joined=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=nb_frames,duration','-of','json',str(tmp / 'joined.mp4')]))
    assert int(joined['streams'][0]['nb_frames']) == 30 * FPS and abs(float(joined['streams'][0]['duration'])-30) < 0.001, joined
    print('Joined 15 clips: 1440 frames, exactly 30 seconds', flush=True)
    # Softly join two excerpts of the existing generated music; no new audio provider.
    run('ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', SOURCE, '-i', SOURCE,
        '-filter_complex', '[0:a]atrim=start=0:end=18,asetpts=PTS-STARTPTS[a1];[1:a]atrim=start=5:end=18,asetpts=PTS-STARTPTS[b1];[a1][b1]acrossfade=d=1:c1=tri:c2=tri,afade=t=in:d=0.4,afade=t=out:st=28.5:d=1.5[audio]',
        '-map', '[audio]', '-c:a', 'pcm_s16le', tmp / 'music.wav')
    ass = '''[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Header,DejaVu Sans,20,&H00F4F6F3,&H00FFFFFF,&H80000000,&H00000000,0,0,0,0,100,100,1,0,1,0,0,7,40,40,12,1
Style: Title,DejaVu Serif,28,&H00F4F6F3,&H00FFFFFF,&H80000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,40,40,601,1
Style: Detail,DejaVu Sans,20,&H00D5E5DB,&H00FFFFFF,&H80000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,40,40,640,1
Style: Facts,DejaVu Sans,18,&H00F4F6F3,&H00FFFFFF,&H80000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,2,40,40,10,1
Style: Label,DejaVu Sans,14,&H00D5E5DB,&H00FFFFFF,&H80000000,&H00000000,0,0,0,0,100,100,1,0,1,0,0,7,40,40,42,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:30.00,Header,,0,0,0,,14127 LEMAY STREET
Dialogue: 0,0:00:00.00,0:00:30.00,Label,,0,0,0,,VAN NUYS, CA 91405
Dialogue: 0,0:00:00.00,0:00:30.00,Header,,0,0,0,,{\\an9\\pos(1240,10)\\fs24}$1,175,000
Dialogue: 0,0:00:00.00,0:00:30.00,Label,,0,0,0,,{\\an9\\pos(1240,43)}FOR SALE | APPROX. $593 / SQ FT
Dialogue: 0,0:00:00.00,0:00:30.00,Facts,,0,0,0,,3 BEDROOMS     |     2 BATHROOMS     |     1,981 SQ FT     |     BUILT 1927
'''
    for index, (title, detail) in enumerate(CARDS):
        start, end = timestamp(index * 2), timestamp((index + 1) * 2)
        # Long final line receives a smaller explicit size instead of overflowing.
        size = '{\\fs26}' if len(title) > 45 else ''
        ass += f'Dialogue: 1,{start},{end},Title,,0,0,0,,{{\\fad(120,100)}}{size}{title}\n'
        ass += f'Dialogue: 1,{start},{end},Detail,,0,0,0,,{{\\fad(120,100)}}{detail}\n'
    (tmp / 'titles.ass').write_text(ass)
    run('ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', tmp / 'joined.mp4', '-i', tmp / 'music.wav',
        '-vf', f'drawbox=x=0:y=0:w=iw:h=68:color=0x142c23@0.62:t=fill,drawbox=x=0:y=592:w=iw:h=128:color=0x142c23@0.82:t=fill,drawbox=x=40:y=675:w=1200:h=1:color=0xc4d3b5@0.65:t=fill,ass={tmp / "titles.ass"}',
        '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'fast', '-crf', '21', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-threads', '2', OUTPUT)
    # Captions/timing are committed separately so the full content remains reviewable.
    (ROOT / 'media/film-30s-storyboard.json').write_text(json.dumps({'duration':30, 'fps':FPS, 'shots':[{'source':s,'sourceStart':st,'duration':d,'motion':'Native Seedance camera motion' if s=='video' or SPATIAL else 'Subpixel horizontal glide with smooth start and stop'} for s,st,d in SHOTS], 'cards':[{'start':i*2,'end':(i+1)*2,'title':t,'detail':d} for i,(t,d) in enumerate(CARDS)], 'source':'Original and newly generated Seedance 2.5 footage; offline edit only' if SPATIAL else 'Existing Seedance 2.5 footage and supplied listing photographs; no new generation'}, indent=2) + '\n')
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=codec_type,duration,nb_frames','-of','json',str(OUTPUT)]))
video=next(s for s in probe['streams'] if s['codec_type']=='video')
audio=next(s for s in probe['streams'] if s['codec_type']=='audio')
assert int(video['nb_frames']) == 30 * FPS and abs(float(video['duration'])-30) < 0.001, video
assert abs(float(audio['duration'])-30) < 0.05, audio
shutil.copyfile(OUTPUT, OUTPUT.with_name('film-30s-motion.mp4'))
shutil.copyfile(OUTPUT, OUTPUT.with_name('film.mp4'))
shutil.copyfile(OUTPUT, OUTPUT.with_name('film-30s.mp4'))
manifest_file=OUTPUT.with_name('manifest.json')
manifest=json.loads(manifest_file.read_text())
manifest.update(ready=True, duration=30, film=OUTPUT.name, shotCount=15, secondsPerShot=2, editing='Seedance 2.5 spatial camera scenes with compact English property captions' if SPATIAL else 'Existing Seedance 2.5 footage and animated listing photographs, with compact English property captions')
manifest_file.write_text(json.dumps(manifest,indent=2)+'\n')
print(f'Created and validated {OUTPUT}: 15 shots, 1440 frames, 30 seconds with audio', flush=True)
