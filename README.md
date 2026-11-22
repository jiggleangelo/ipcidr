# IP & CIDR — v1.0.0

Original MIT, zero-dependency offline IPv4/IPv6 calculator. Open index.html alongside its JS/CSS. Nothing is transmitted, stored or resolved; no server, install, account, CDN or address probe. BigInt powers all address, size, mask and allocation calculations. The browser must support ES2020 BigInt; the Node suite requires Node 18+ and the browser harness Node 22+.

Enter one address/prefix per line, then Calculate. Mixed families are allowed. Optional VLSM requests use the **first** input CIDR as parent. Editing either field immediately removes results/exports. Load example runs a fictional documentation-space sample; Clear removes both fields. System/dark/light appearance is not persisted. JSON and CSV download the current successful result only.

## Address and subnet rules

IPv4 requires four decimal octets 0–255 with no leading zeros. IPv6 allows one :: and 1–4 hex digits per group, including a trailing strict IPv4 address. Zones, brackets, internal whitespace, multiple slashes, signed/fractional/exponent/leading-zero prefixes, missing prefix and out-of-range prefixes fail. Outer whitespace and blank list lines are ignored; errors preserve the original nonblank source line number. Host bits are allowed and normalize to the network, with a visible warning.

Details include canonical CIDR, family/prefix, input address, normalization flag, mask, network, last address, total/usable counts, first/last usable and IPv4 broadcast. IPv4 /0–/30 reserve network+broadcast; /31 has two point-to-point addresses, /32 one host. IPv6 reserves no network/broadcast addresses. The usable count is an arithmetic convention, not a claim about special-purpose reservations or IPv6 subnet-router anycast policy.

Containment includes equality; equal rows contain each other. Mixed families never overlap. The report retains original input rows, including duplicates and order. The UI shows at most 500 overlapping pairs with the total; JSON contains every pair (up to 130816 for 512 duplicate rows).

## VLSM

## Exact minimal summarization

Subnets are treated as closed integer intervals and separated by family. Sorting/union removes duplicates and containment and merges touching ranges. Each union is covered greedily by the largest aligned power-of-two section that fits, producing the minimal exact set of CIDRs. No address outside the original union is introduced. Output sorts IPv4 before IPv6 and ascending address within each family; it never combines families. This is route-set aggregation, not routing policy or longest-prefix-match simulation.

## Export and resources

JSON contains subnets, overlap index pairs, exact summary and optional VLSM allocations. All address counts serialize as exact decimal strings; there is no BigInt serialization loss. CSV uses quoted fields and CRLF with one header and subnet/summary/allocation rows. CSV intentionally omits overlap pairs and unallocated count (available in JSON). Fields are strictly derived from parsed addresses, numbers and request grammar, so spreadsheet formula input cannot enter an exported field.

Bounds: 65536 list characters, 512 CIDRs, 32768 VLSM request characters, 512 requests. CIDR parsing is bounded to 90 characters, raw address parsing to 80. Pair inference is O(n²), capped at 512; no enumeration of hosts occurs even for ::/0. Displayed addresses wrap as text, and allocation tables scroll locally at small widths. Pure core APIs accept parser-produced subnet objects. Node logic test: `node --test tests/core.test.mjs`.


## Run, test and fork

Open `index.html` beside the supplied JavaScript and CSS files, or use any static server. The delivery includes paired suites and their shared test support. Use the delivery's `verify.sh` to run the complete suites in a disposable workspace with WebCrypto enabled; some retained suites require that workspace. The tool entrypoint is `tests/core.test.mjs` (`node:test`). Fork the MIT source and retain its license.

[Tool page](https://manykiln.com/tools/ipcidr/) · [Source code](https://github.com/jiggleangelo/ipcidr) · [Join the list](https://join.manykiln.com/?from=ipcidr) · [Privacy](https://manykiln.com/privacy)


Canonical IPv6 follows RFC 5952: lowercase hex, no leading group zeros, longest leftmost zero run of at least two groups; isolated zero groups stay explicit. IPv4-mapped values use ::ffff:dotted-decimal; other mixed inputs normalize to hex. This is textual math, not validation of real definitions or address reachability.

Use /prefix for an exact range or hosts:count for capacity, separated by commas/newlines; 1–512 requests. Decimal counts are strict positive integers. Largest ranges allocate first, with stable original order on equal sizes. Every range starts aligned within the normalized parent. Host requests select the smallest qualifying range using the same /31, /32 and IPv6 conventions above. The result includes request number, request text, subnet details and remaining address count. A failed request returns **no partial allocation**. Nothing mutates the parent or previous results. No reservation exclusions, address allocation, arbitrary free-space fragmentation or persisted plans.
