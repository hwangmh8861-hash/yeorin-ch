import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const community=await readFile(new URL('../community.js',import.meta.url),'utf8');
new vm.Script(community,{filename:'community.js'});

const build=await readFile(new URL('../build.mjs',import.meta.url),'utf8');
for(const needle of ["readFile(join(root,'community.js')","[native,gasZero,community]","'community.js'"]){
  if(!build.includes(needle))throw new Error('build missing community integration: '+needle);
}

for(const needle of ['yeorin_community_feed','yeorin_community_create','community-media','커뮤니티']){
  if(!community.includes(needle))throw new Error('community bundle missing: '+needle);
}

console.log('community validation ok');
