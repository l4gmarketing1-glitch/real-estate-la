import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHiggsfieldClient } from '@higgsfield/client/v2';
const endpoint = 'bytedance/seedance-2.5/reference-to-video';
const directory = 'media/spatial';
await mkdir(directory, { recursive: true });
const plan = JSON.parse(await readFile(`${directory}/plan.json`, 'utf8'));
const credentials = process.env.HF_CREDENTIALS?.trim();
const headers = { Authorization: `Key ${credentials}`, 'Content-Type': 'application/json' };
const journal = { budgetUSD: 7, mode: plan.mode, requests: [] };
const save = () => writeFile(`${directory}/status.json`, JSON.stringify(journal, null, 2));
try {
  if (!credentials || !process.env.GITHUB_SHA) throw Error('missing_configuration');
  if (plan.mode === 'generate' && process.env.GITHUB_RUN_ATTEMPT !== '1') throw Error('rerun_blocked_to_prevent_duplicate_charges');
  const inputs = plan.batches.map(batch => ({duration:10,resolution:'480p',aspect_ratio:'16:9',generate_audio:false,bitrate_mode:'high',
    image_urls:batch.shots.map(shot => `https://raw.githubusercontent.com/${process.env.GITHUB_REPOSITORY}/${process.env.GITHUB_SHA}/site/assets/images/${shot.photo}-1024.webp`),
    prompt:`Create exactly ${batch.shots.length} separate real-estate scenes in 10 seconds, equal scene durations, each based ONLY on its corresponding ordered reference photograph. Hard cuts at scene boundaries, no dissolves, no morphing. ${batch.shots.map((shot,i)=>`Scene ${i+1}, seconds ${(i*10/batch.shots.length).toFixed(2)}-${((i+1)*10/batch.shots.length).toFixed(2)}, reference ${i+1}: ${shot.motion}.`).join(' ')} Genuine subtle three-dimensional camera translation with foreground/background parallax, as if a stabilized camera is physically travelling through this room. Not a sliding flat photograph, not digital zoom. Slow constant, fluid, restrained movement throughout each scene. Preserve the exact architecture, windows, doors, furniture, finishes, wall geometry and all visible features of the photograph. Keep the original framing recognizable; move only a short distance to avoid inventing unseen architecture. No people, no new furniture or objects, no text, no logos, no audio. No shaky camera, no wobbling walls, no breathing or warping surfaces. Warm natural light, professional architectural cinematography.` }));
  journal.estimates=[];
  for (const input of inputs) {
    const response=await fetch(`https://api.higgsfield.ai/estimate/${endpoint}`,{method:'POST',headers,body:JSON.stringify(input),signal:AbortSignal.timeout(30000)});
    if(!response.ok) throw Error(`estimate_http_${response.status}`);
    const estimate=await response.json();
    const description=estimate.pricing_description || '';
    // Accept only the known per-second, no-video-input 480p rate; fail closed otherwise.
    const match=description.match(/\$(\d+(?:\.\d+)?) per second of generated video at 480p/);
    if(!match) throw Error('unrecognized_pricing_requires_review');
    const rate=Number(match[1]);
    if(!Number.isFinite(rate)||rate<=0) throw Error('invalid_pricing');
    journal.estimates.push({duration:10,resolution:'480p',ratePerSecond:rate,estimatedUSD:rate*10});
  }
  journal.estimatedTotalUSD=journal.estimates.reduce((sum,x)=>sum+x.estimatedUSD,0);
  journal.reservedUSD=journal.estimatedTotalUSD*1.12;
  await save();
  if(journal.reservedUSD>7) throw Error('budget_exceeded');
  if(plan.mode !== 'generate') {console.log('Estimate only; no paid requests.');process.exit(0);}
  // Verify references before making any billable request.
  for(const input of inputs) for(const url of input.image_urls){const r=await fetch(url);if(!r.ok)throw Error('reference_unavailable');await r.arrayBuffer();}
  for(let index=0;index<inputs.length;index++) {
    const client=createHiggsfieldClient({credentials,maxRetries:0,headers:{'Idempotency-Key':`lemay-spatial-${process.env.GITHUB_SHA}-${index}`}});
    const record={batch:index,state:'submitting'};journal.requests.push(record);await save();
    let result=await client.subscribe(endpoint,{input:inputs[index],withPolling:false});
    record.requestId=result.request_id;record.state=result.status;await save();
    if(!result.request_id) throw Error('missing_request_id');
    const deadline=Date.now()+25*60*1000;
    while(!['completed','failed','nsfw'].includes(result.status)){
      if(Date.now()>deadline)throw Error('poll_timeout_do_not_resubmit');
      await new Promise(r=>setTimeout(r,10000));
      const response=await fetch(`https://api.higgsfield.ai/requests/${encodeURIComponent(result.request_id)}/status`,{headers,signal:AbortSignal.timeout(30000)});
      if(response.status>=500)continue;
      if(!response.ok)throw Error(`poll_http_${response.status}`);
      result=await response.json();
    }
    record.state=result.status;await save();
    if(result.status!=='completed'||!result.video?.url)throw Error('generation_not_completed');
    const url=new URL(result.video.url);if(url.protocol!=='https:')throw Error('invalid_video_url');
    const video=await fetch(url,{signal:AbortSignal.timeout(120000)});if(!video.ok)throw Error('download_failed');
    await writeFile(`${directory}/batch-${index}.mp4`,Buffer.from(await video.arrayBuffer()));
    record.state='downloaded';await save();console.log(`Batch ${index+1} downloaded.`);
  }
}catch(error){
  // Never log SDK error objects or credentials.
  journal.error=/^[a-z_]+(?:_\d+)?$/.test(error.message)?error.message:'provider_request_failed';
  journal.httpStatus=error.statusCode??error.response?.status??null;
  await save();console.error(journal.error);process.exitCode=1;
}
