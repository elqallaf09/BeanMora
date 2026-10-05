import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/methodGuides.json');
const guides = JSON.parse(fs.readFileSync(file, 'utf8'));
const required = ['moka_pot','cold_brew','french_press','april','orea'];

for (const method of required) {
  const guide = guides[method];
  if (!guide) throw new Error(`Missing method guide: ${method}`);
  for (const key of ['title','title_ar','intro','intro_ar','source','source_name']) {
    if (typeof guide[key] !== 'string' || !guide[key].trim()) throw new Error(`Missing ${key} for ${method}`);
  }
  if (!guide.video || typeof guide.video.url !== 'string' || !/^https:\/\/(www\.)?youtube\.com\//.test(guide.video.url)) {
    throw new Error(`Missing YouTube video for ${method}`);
  }
  if (!Array.isArray(guide.tips) || guide.tips.length < 2 || !Array.isArray(guide.tips_ar) || guide.tips_ar.length < 2) {
    throw new Error(`Incomplete tips for ${method}`);
  }
}
console.log(`Verified guides and videos for ${required.length} critical brew methods.`);
