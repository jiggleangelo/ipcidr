// Original tests. MIT License. Fictional documentation address space only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), ip = require('../core.js');
const cidr = ip.parseCIDR, addr = ip.parseAddress, fmt = ip.formatAddress;
for (const [input, expected] of [
 ['0:0:0:0:0:0:0:0','::'],['0:0:0:0:0:0:0:1','::1'],['2001:0DB8:0000:0000:0001:0000:0000:0001','2001:db8::1:0:0:1'],
 ['2001:0:0:1:0:0:1:1','2001::1:0:0:1:1'],['2001:db8:0:1:2:3:4:5','2001:db8:0:1:2:3:4:5'],
 ['::FFFF:C000:201','::ffff:192.0.2.1'],['::ffff:192.0.2.1','::ffff:192.0.2.1'],['2001:db8:0:0:0:0:192.0.2.1','2001:db8::c000:201'],
 ['FFFF:FFFF:FFFF:FFFF:FFFF:FFFF:FFFF:FFFF','ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff'],['192.0.2.255','192.0.2.255']
]) test('canonical ' + input, () => { const p = addr(input); assert.equal(fmt(p.value, p.bits), expected); assert.equal(addr(expected).value, p.value); });
for (const invalid of ['', '1.2.3','1.2.3.256','01.2.3.4','1.2.3.-1','1.2.3.+1','1.2.3.4.5','0x1.2.3.4','1e1.2.3.4',' 192.0.2.1','192.0.2.1 ','192.0.2.1/32','[::1]','fe80::1%eth0',':1','1:',':::','1::2::3','1:2:3:4:5:6:7','1:2:3:4:5:6:7:8:9','1:2:3:4:5:6:7:8::','12345::','2001:db8::g','::ffff:192.0.2.01','::ffff:192.0.2.999','1:2:3:4:5:192.0.2.1','1\n:2','<script>']) test('invalid address ' + JSON.stringify(invalid), () => assert.throws(() => addr(invalid)));
for (const invalid of ['192.0.2.1','::1','192.0.2.1/33','::/129','::/-1','::/+1','::/01','::/1.0','::/1e1','::/ 1','::/1/2',':: /1','192.0.2.1/','::/Infinity','::/NaN','::/１２８']) test('invalid CIDR ' + invalid, () => assert.throws(() => cidr(invalid)));
for (const bits of [32,128]) for (let prefix = 0; prefix <= bits; prefix++) test('exact mask/range /' + prefix + ' IPv' + bits, () => {
 const max = (1n << BigInt(bits)) - 1n, c = cidr(fmt(max, bits) + '/' + prefix), d = ip.describe(c), size = 2n ** BigInt(bits - prefix);
 assert.equal(c.size, size); assert.equal(c.network, max - size + 1n); assert.equal(c.last, max); assert.equal(d.addresses, String(size));
 assert.equal(addr(d.mask).value, max ^ (size - 1n)); assert.equal(cidr(c.cidr).network, c.network);
 assert.equal(d.usable, String(bits === 32 && prefix <= 30 ? size - 2n : size));
});
test('full IPv6 space stays exact through JSON', () => { const d = ip.analyze('::/0'); assert.equal(d.subnets[0].addresses, '340282366920938463463374607431768211456'); assert.deepEqual(JSON.parse(JSON.stringify(d)), d); });
test('host normalization, /31 and /32 semantics', () => {
 assert.equal(cidr('192.0.2.129/25').cidr,'192.0.2.128/25'); assert.equal(cidr(' 192.0.2.129/25 ').normalized,true);
 const d = ip.describe(cidr('192.0.2.2/31')); assert.equal(d.firstUsable,'192.0.2.2'); assert.equal(d.lastUsable,'192.0.2.3'); assert.equal(d.broadcast,null);
 assert.equal(ip.describe(cidr('192.0.2.1/32')).usable,'1'); assert.equal(ip.describe(cidr('2001:db8::/127')).usable,'2');
});
for (const [a,b,wanted] of [['192.0.2.0/24','192.0.2.64/26',[true,true,false]],['192.0.2.1/24','192.0.2.2/24',[true,true,true]],['192.0.2.0/25','192.0.2.128/25',[false,false,false]],['::/0','2001:db8::/32',[true,true,false]],['::/0','0.0.0.0/0',[false,false,false]],['2001:db8::/128','2001:db8::1/128',[false,false,false]]]) test('relation ' + a + ' ' + b, () => { const r = ip.relation(cidr(a),cidr(b)); assert.deepEqual([r.overlaps,r.aContainsB,r.bContainsA],wanted); });
test('summary removes duplicate/contained routes and separates families', () => {
 const list=ip.parseList('192.0.2.0/25\n192.0.2.128/25\n192.0.2.4/32\n192.0.2.0/25\n2001:db8::/64\n2001:db8:0:1::/64');
 assert.deepEqual(ip.summarize(list).map(x=>x.cidr),['192.0.2.0/24','2001:db8::/63']);
});
test('summary does not over-aggregate gaps', () => assert.deepEqual(ip.summarize(ip.parseList('192.0.2.0/26\n192.0.2.128/26')).map(x=>x.cidr),['192.0.2.0/26','192.0.2.128/26']));
test('summary zero/full range avoids overflow', () => assert.deepEqual(ip.summarize(ip.parseList('::/1\n8000::/1\n0.0.0.0/1\n128.0.0.0/1')).map(x=>x.cidr),['0.0.0.0/0','::/0']));
// Independent set-of-hosts oracle in a 256-address window, with random order and overlap.
let seed=9137; const rnd=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
for(let run=0;run<90;run++) test('set oracle summary '+run,()=>{
 const base=addr('192.0.2.0').value, items=[], set=new Set();
 for(let k=0;k<18;k++){const prefix=25+rnd(8), width=2**(32-prefix), offset=Math.floor(rnd(256)/width)*width; items.push(cidr('192.0.2.'+offset+'/'+prefix));for(let j=offset;j<offset+width;j++)set.add(j);}
 const out=ip.summarize(items), actual=new Set();
 for(const c of out)for(let n=c.network;n<=c.last;n++)actual.add(Number(n-base));
 assert.deepEqual([...actual].sort((a,b)=>a-b),[...set].sort((a,b)=>a-b));
 for(let i=0;i<out.length;i++)for(let j=i+1;j<out.length;j++){assert.equal(ip.relation(out[i],out[j]).overlaps,false);if(out[i].prefix===out[j].prefix && out[i].prefix>0){assert.notEqual(out[i].network/(out[i].size*2n),out[j].network/(out[j].size*2n));}}
 assert.deepEqual(ip.summarize(out).map(x=>x.cidr),out.map(x=>x.cidr));
});
for(let run=0;run<60;run++)test('128-bit round trip '+run,()=>{let value=0n;for(let k=0;k<4;k++)value=(value<<32n)|BigInt(rnd(0x100000000));assert.equal(addr(fmt(value,128)).value,value);});
test('VLSM largest first, stable ties, capacity, atomic failure',()=>{
 const parent=cidr('192.0.2.0/24'), v=ip.splitVLSM(parent,'hosts:2,hosts:50,/27,hosts:1');
 assert.deepEqual(v.allocations.map(x=>x.cidr),['192.0.2.0/26','192.0.2.64/27','192.0.2.96/31','192.0.2.98/32']);
 assert.deepEqual(v.allocations.map(x=>x.requestNumber),[2,3,1,4]);assert.equal(v.unallocatedAddresses,'157');
 assert.throws(()=>ip.splitVLSM(parent,'/25,/25,/32'),/Insufficient/);
 assert.equal(parent.cidr,'192.0.2.0/24');
});
test('VLSM exact 128-bit host requests',()=>{const v=ip.splitVLSM(cidr('2001:db8::/64'),'hosts:18446744073709551616');assert.equal(v.allocations[0].prefix,64);assert.equal(v.unallocatedAddresses,'0');});
for(const request of ['hosts:0','hosts:-1','hosts:01','hosts:2.5','/033','/33','/23','50','x','hosts:340282366920938463463374607431768211457'])test('VLSM invalid '+request,()=>assert.throws(()=>ip.splitVLSM(cidr('192.0.2.0/24'),request)));
for(let count=1;count<=64;count++)test('smallest IPv4 hosts allocation '+count,()=>{const a=ip.splitVLSM(cidr('192.0.2.0/24'),'hosts:'+count).allocations[0];const usable=p=>p===32?1:p===31?2:2**(32-p)-2;assert.ok(BigInt(a.usable)>=BigInt(count));if(a.prefix<32)assert.ok(usable(a.prefix+1)<count);});
test('CSV/JSON exact and deterministic',()=>{const r=ip.analyze('2001:db8::/64','/65,/65');const csv=ip.csv(r);assert.ok(csv.startsWith('"kind","request","cidr"'));assert.ok(csv.includes('"18446744073709551616"'));assert.equal(csv.split('\r\n').length,6);assert.equal(ip.csv(r),csv);assert.doesNotThrow(()=>JSON.stringify(r));});
test('resource bounds',()=>{assert.throws(()=>ip.parseList(''));assert.throws(()=>ip.parseList('::/0\n'.repeat(513)));assert.equal(ip.parseList('::/0\n'.repeat(512)).length,512);assert.throws(()=>ip.splitVLSM(cidr('::/0'),'/128,'.repeat(513)));assert.throws(()=>fmt(-1n,128));assert.throws(()=>fmt(1n<<128n,128));assert.throws(()=>fmt(0n,64));});
test('line diagnostic preserves blank source rows',()=>assert.throws(()=>ip.parseList('\n192.0.2.0/24\n\nbad'),/Line 4:/));
test('IPv6 VLSM retains precision above 64 bits',()=>{const r=ip.splitVLSM(cidr('::/0'),'hosts:170141183460469231731687303715884105728,hosts:170141183460469231731687303715884105728');assert.deepEqual(r.allocations.map(x=>x.cidr),['::/1','8000::/1']);assert.equal(r.unallocatedAddresses,'0');});
test('VLSM stable identical-size ordering',()=>{const r=ip.splitVLSM(cidr('192.0.2.0/24'),'/26,hosts:50,/26');assert.deepEqual(r.allocations.map(x=>x.requestNumber),[1,2,3]);assert.equal(r.unallocatedAddresses,'64');});
