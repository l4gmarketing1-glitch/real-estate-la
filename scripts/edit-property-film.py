#!/usr/bin/env python3
"""Offline 30-second edit. Uses existing Seedance footage; never calls an API.
Requires Python 3, FFmpeg with libass, and DejaVu fonts.
"""
from pathlib import Path
import json, shutil, subprocess, tempfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'media/source/seedance-property-20s.mp4'
OUTPUT = ROOT / 'site/assets/media/film-30s-motion.mp4'
FPS = 24
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
    # Gentle digital camera movement on every photograph, without generating
    # or inventing property details. Alternate a slow push-in and pull-back.
    for index, (source, start, duration) in enumerate(SHOTS):
        target = tmp / f'{index:02d}.mp4'
        inputs = ['-ss', str(start), '-i', str(SOURCE)] if source == 'video' else ['-loop', '1', '-framerate', str(FPS), '-i', str(ROOT / f'site/assets/images/{source}-1024.webp')]
        if source == 'video':
            filters = 'scale=1280:720,setsar=1,fps=24,setpts=N/(24*TB),format=yuv420p'
            filter_args = ['-vf', filters]
        else:
            zoom = '1.02+0.035*on/47' if index % 2 else '1.055-0.035*on/47'
            pan = '0.4+0.2*on/47' if index % 2 else '0.6-0.2*on/47'
            filters = '[0:v]split=2[bg][fg];[bg]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,boxblur=25:3,eq=brightness=-0.12[blur];[fg]scale=1280:720:force_original_aspect_ratio=decrease[photo];[blur][photo]overlay=(W-w)/2:(H-h)/2,scale=2560:1440,setsar=1' + f",zoompan=z='{zoom}':x='(iw-iw/zoom)*({pan})':y='(ih-ih/zoom)/2':d=48:s=1280x720:fps=24,setpts=N/(24*TB),format=yuv420p[out]"
            filter_args = ['-filter_complex', filters, '-map', '[out]']
        run('ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *inputs, *filter_args, '-frames:v', int(duration * FPS), '-an', '-r', '24', '-fps_mode', 'cfr', '-c:v', 'libx264', '-bf', '0', '-video_track_timescale', '24000', '-preset', 'fast', '-crf', '19', '-threads', '2', target)
        info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=nb_frames,duration,start_time,r_frame_rate','-of','json',str(target)]))
        assert int(info['streams'][0]['nb_frames']) == 48 and abs(float(info['streams'][0]['duration'])-2) < 0.001, info
        print(f'Prepared shot {index+1}/{len(SHOTS)}: {source}, exactly 2 seconds', flush=True)
    concat = tmp / 'shots.txt'
    concat.write_text(''.join(f"file '{tmp / f'{i:02d}.mp4'}'\n" for i in range(len(SHOTS))))
    run('ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', concat, '-c', 'copy', tmp / 'joined.mp4')
    joined=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=nb_frames,duration','-of','json',str(tmp / 'joined.mp4')]))
    assert int(joined['streams'][0]['nb_frames']) == 720 and abs(float(joined['streams'][0]['duration'])-30) < 0.001, joined
    print('Joined 15 clips: 720 frames, exactly 30 seconds', flush=True)
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
    (ROOT / 'media/film-30s-storyboard.json').write_text(json.dumps({'duration':30, 'fps':FPS, 'shots':[{'source':s,'sourceStart':st,'duration':d,'motion':'Native Seedance camera motion' if s=='video' else 'Gentle animated zoom and pan'} for s,st,d in SHOTS], 'cards':[{'start':i*2,'end':(i+1)*2,'title':t,'detail':d} for i,(t,d) in enumerate(CARDS)], 'source':'Existing Seedance 2.5 footage and supplied listing photographs; no new generation'}, indent=2) + '\n')
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=codec_type,duration,nb_frames','-of','json',str(OUTPUT)]))
video=next(s for s in probe['streams'] if s['codec_type']=='video')
audio=next(s for s in probe['streams'] if s['codec_type']=='audio')
assert int(video['nb_frames']) == 720 and abs(float(video['duration'])-30) < 0.001, video
assert abs(float(audio['duration'])-30) < 0.05, audio
shutil.copyfile(OUTPUT, OUTPUT.with_name('film.mp4'))
shutil.copyfile(OUTPUT, OUTPUT.with_name('film-30s.mp4'))
manifest_file=OUTPUT.with_name('manifest.json')
manifest=json.loads(manifest_file.read_text())
manifest.update(ready=True, duration=30, film='film-30s-motion.mp4', shotCount=15, secondsPerShot=2, editing='Existing Seedance 2.5 footage and animated listing photographs, with compact English property captions')
manifest_file.write_text(json.dumps(manifest,indent=2)+'\n')
print(f'Created and validated {OUTPUT}: 15 shots, 720 frames, 30 seconds with audio', flush=True)
