import {readFileSync,writeFileSync} from 'node:fs';
let html=readFileSync(new URL('../v38.html',import.meta.url),'utf8');
html=html.replaceAll('emberwingBest','emberwingReviewBest');
const qa=readFileSync(new URL('./v38-review.js',import.meta.url),'utf8');
html=html.replace('const clock=new THREE.Clock();',qa+'\nconst clock=new THREE.Clock();');
html=html.replace('requestAnimationFrame(loop);const rawDt','requestAnimationFrame(loop);if(qaPaused){renderer.render(scene,camera);return;}const rawDt');
html=html.replace('updateTouchFlight();','qaTick(rawDt);updateTouchFlight();');
writeFileSync(new URL('../.review-v38.html',import.meta.url),html);
