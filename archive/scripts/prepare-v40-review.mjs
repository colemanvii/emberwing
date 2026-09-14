import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
let html=read('../v40.html').replaceAll('emberwingBest','emberwingReviewBest');
html=html.replace('const clock=new THREE.Clock();',read('./v38-review.js')+read('./v40-review.js')+'\nconst clock=new THREE.Clock();');
html=html.replace('requestAnimationFrame(loop);const rawDt','requestAnimationFrame(loop);if(qaPaused){renderer.render(scene,camera);return;}const rawDt').replace('updateTouchFlight();','qaTick(rawDt);updateTouchFlight();');
writeFileSync(new URL('../.review-v40.html',import.meta.url),html);
