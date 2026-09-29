# America.gov and the data shop

Notes only. No serving change. Checked 29 September 2026.

Door list used here is the live shop, not the 62-door snapshot in this git tree. `GET https://ticks.bnm.farm/.well-known/x402` returned 75 paid URLs. Source hosts are the ones named in `GET https://ticks.bnm.farm/llms.txt` and, for `/ticks`, in `src/ticks-ams.ts`. `docs/live-well-known.json` in this checkout is still the 18 September 2026 snapshot of 62.

## Bottom line

Affected, a little, and not in the way that breaks the shop.

America.gov is a GSA chatbot. Phase 1 answers questions and links to agency pages. It is not a bulk-data or agent API for the records these doors sell. The executive order covers high-volume services people apply for online. It keeps agency websites up, leaves each agency in charge of its own records, and says nothing about reselling public federal text. None of the 75 doors is that kind of service. No collector change is called for today.

The one real follow-up is the OMB memo the order requires within 90 days. That memo can add or drop covered services. It is not written yet.

## What was read

- Executive order, 29 September 2026: https://www.whitehouse.gov/presidential-actions/2026/09/streamlining-access-to-government-services-through-america-gov/
- Fact sheet: https://www.whitehouse.gov/fact-sheets/2026/09/fact-sheet-president-donald-j-trump-streamlines-access-to-government-services-through-america-gov/
- Nextgov: https://www.nextgov.com/digital-government/2026/09/white-house-launches-ai-powered-americagov-digital-front-door/416303/
- FedScoop: https://fedscoop.com/trump-launches-ai-site-america-gov/
- America.gov pages opened in a browser: https://america.gov/ , https://america.gov/terms , https://america.gov/privacy-policy , https://america.gov/privacy , https://america.gov/how-it-works , https://america.gov/about , https://america.gov/coming-soon , https://america.gov/faq
- `https://america.gov/robots.txt` fetched directly
- 17 U.S.C. § 105: https://www.govinfo.gov/content/pkg/USCODE-2023-title17/html/USCODE-2023-title17-chap1-sec105.htm
- Separate product, not America.gov: https://www.govinfo.gov/features/mcp-public-preview

OMB memorandum M-26-18 is cited by the order for Login.gov. This note does not rely on that memo; it was not read in full.

## What the order requires

Covered services are public-facing federal services with more than 100,000 users in 12 months that can be accessed or applied for online. Tax filing and national-security services of the Department of War and the Intelligence Community are out. OMB may add or exclude services by memorandum.

GSA, the National Design Studio, and OMB run America.gov and tie in Login.gov. Within 90 days OMB issues an implementation memo. Agencies then identify their covered services, connect public APIs, dashboards, and digital forms they already have, finish Login.gov on those services, and share usage data.

The order also says:

- Agencies keep custody of their records and their adjudicatory authority. Unifying access does not create one federal system of records about the public.
- In-person, phone, mail, and agency websites stay available. America.gov is another door, not the only door.
- Nothing in the order requires a disclosure that another law forbids, or lets a different agency read another agency's records about a person, except as the Privacy Act already allows.

It does not say to retire record pages, move dockets, or put public PDFs behind Login.gov.

## What the site exposes now

Phase 1, from https://america.gov/about : launched 29 September 2026 as a way to get information. Phase 2 begins in 2027 so people can apply, enroll, and track progress in the chat. https://america.gov/coming-soon says early 2027 for forms, applications, and renewals, and names Social Security, Veterans Affairs, Medicare and Medicaid, and a first passport.

No account is required. The FAQ says America.gov cannot see applications you have already filed, and cannot check status. It points you at the agency's own status tool.

A chat question, "Where are FDA warning letters published?", was answered with links to the public FDA list, including https://fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters . The FAQ says answers come from official sites, AI can be wrong, and the reader should check the linked sources. The "29,000 government websites" line means the government publishes across many agency sites and the chat helps you find them. It is not a claim that those sites are being replaced.

No developer docs, bulk download, MCP server, or `llms.txt` showed up.

- https://america.gov/api and https://america.gov/api/chat returned `{"error":"not_found"}`.
- https://america.gov/developers and https://america.gov/llms.txt were ordinary not-found pages.
- https://america.gov/openapi.json , https://america.gov/mcp , and https://america.gov/.well-known/mcp.json were blocked by Cloudflare from this environment, so those three paths were not read. Nothing on the public pages links to them.

`robots.txt` is Cloudflare's managed file. For `User-agent: *` it says `Content-Signal: search=yes,ai-train=no,use=reference` and `Allow: /`. Named training crawlers and agent browsers are `Disallow: /`, including GPTBot, ClaudeBot, Google-Extended, Perplexity-User, FirecrawlAgent, ChatGPT-User, Claude-User, and Google-Agent. The file says this is a reservation of rights under the EU copyright directive. It governs America.gov. It does not govern agency sites the shop collects.

GovInfo already has a separate, free MCP preview for GovInfo publications (https://www.govinfo.gov/features/mcp-public-preview , 22 January 2026). That is GPO, not America.gov. The page says the GovInfo website and API are unchanged. It does not claim to serve the agency enforcement PDFs these doors sell.

## Legal and terms

The order does not mention resale, licensing, or scraping of agency sites.

https://america.gov/terms (last updated 8 September 2026) says most content on America.gov is a US government work, in the public domain, and usable without GSA's permission. It also says not to scrape the site or put an unreasonable load on it, and not to use a seal in a way that implies endorsement. It does not ban commercial use or resale of the underlying public-domain text. Those two rules sit side by side: the content may be used; the chatbot may not be scraped.

17 U.S.C. § 105(a) says copyright is not available for a work of the United States Government. The statute's own limit, from the House report printed with that section: a work prepared by a contractor or grantee can still be copyrighted if the agency allows it. This note does not find that any current door is a contractor work. Agency orders, decisions, and reports written by officers and employees as part of their duties are the ordinary case the statute puts in the public domain.

America.gov's privacy policy (last updated 29 September 2026) is about prompts people type into the chat. It does not restrict reuse of agency records.

## Per-door risk

"Record" means the door sells a public report, order, decision, letter, or permit text. Under the order's definition that is not a service someone accesses or applies for. Risk today is low for every row. "Watch" means only that a later OMB memo, or a site redesign, could change a URL. The order does not require that.

Foreign and private sources are outside the order.

| Door | Upstream named by the shop | Under the order? |
| --- | --- | --- |
| `/swisspar` | Swissmedic PDFs | No. Not a US agency. |
| `/ico-mpn` | ico.org.uk | No. UK. |
| `/cma-ca98` | assets.publishing.service.gov.uk | No. UK. |
| `/ema-referrals` | ema.europa.eu | No. EU. |
| `/ofsted-inspections` | files.ofsted.gov.uk | No. UK. |
| `/ofwat-enforcement` | ofwat.gov.uk | No. UK. |
| `/ofgem-enforcement` | ofgem.gov.uk | No. UK. |
| `/orr-enforcement` | orr.gov.uk | No. UK. |
| `/aaib-reports` | assets.publishing.service.gov.uk | No. UK. |
| `/gmp`, `/gmp-md` | Health Canada report cards | No. Canada. |
| `/ticks` | ams.usda.gov market-report PDFs, plus esmis.nal.usda.gov, mymarketnews.ams.usda.gov, marsapi.ams.usda.gov. Private barn PDFs on producerslivestock.com are also inside this table. | USDA market reports are records, not a covered service. The private barn host is not federal. |

US federal records and dockets. Host is whatever `llms.txt` names. Where the live line names only the agency, the host is not in the shop copy and is not invented here.

| Door | Upstream | Under the order? |
| --- | --- | --- |
| `/import-alerts` | FDA import-alert table | Record. Not a covered service. |
| `/mariners`, `/mariners-d11`, `/mariners-d7`, `/mariners-d8`, `/mariners-d1`, `/mariners-d5`, `/mariners-d9`, `/mariners-d14`, `/mariners-d17` | USCG Local Notice to Mariners | Record. Not a covered service. USCG is not in the Department of War exclusion, and it is also not named as a covered service. |
| `/warning-letters` | FDA warning-letter text | Record. The chatbot still points at the public FDA list. |
| `/untitled-letters` | FDA untitled-letter PDFs | Record. |
| `/pcac` | FDA PCAC briefing memos | Record. |
| `/denovo-orders` | accessdata.fda.gov | Record. |
| `/cder-reviews` | accessdata.fda.gov | Record. |
| `/form-483` | FDA Form 483 FOIA PDFs | Record. |
| `/awa` | USDA APHIS inspection PDFs | Record. |
| `/air-letters` | direct.aphis.usda.gov | Record. |
| `/gain` | gain.fas.usda.gov | Record. |
| `/fsis-humane` | fsis.usda.gov | Record. |
| `/ftc-wl` | FTC warning-letter PDFs | Record. |
| `/ftc-orders` | ftc.gov | Record. |
| `/cfpb-orders` | CFPB order PDFs | Record. |
| `/occ-cd` | OCC order PDFs | Record. |
| `/fdic-orders` | FDIC order PDFs | Record. |
| `/frb-orders` | FRB order PDFs | Record. |
| `/ncua-orders` | NCUA order HTML | Record. |
| `/fincen-orders` | FinCEN order PDFs | Record. |
| `/ofac-orders` | ofac.treasury.gov | Record. |
| `/bis-orders` | bis.gov | Record. |
| `/cftc-orders` | cftc.gov | Record. |
| `/ttb-oic` | ttb.gov | Record. |
| `/ferc-orders` | cms.ferc.gov | Record. |
| `/ferc-issuances` | elibrary.ferc.gov | Record. |
| `/fifra-orders` | yosemite.epa.gov | Record. |
| `/superfund-rods` | semspub.epa.gov | Record. |
| `/npdes-permits` | epa.gov permit text | Record of issued permits. Uncertain whether EPA's permit application portal later counts as a covered service. The order would connect that portal to America.gov. It does not take the permit PDF down. |
| `/eis-reports` | EPA CDX e-NEPA EIS PDFs | Record. Host name is not a domain in the shop line. |
| `/epa-cafo` | yosemite.epa.gov and regional epa.gov | Record. |
| `/epa-alj` | yosemite.epa.gov/oarm/alj | Record. |
| `/epa-eab` | yosemite.epa.gov/oa/EAB_Web_Docket.nsf | Record. |
| `/phmsa-orders` | primis.phmsa.dot.gov | Record. |
| `/csb-reports` | csb.gov | Record. |
| `/hhs-oig-reports` | oig.hhs.gov and vaoig.gov | Record. Coming-soon names VA health benefits and Medicare. These are inspector-general PDFs, not those services. Uncertain whether a benefits redesign would touch these hosts. The order does not say it will. |
| `/fmshrc-orders` | fmshrc.gov | Record. |
| `/bsee-reports` | bsee.gov | Record. |
| `/oshrc-orders` | oshrc.gov | Record. |
| `/faa-civil-penalty` | drs.faa.gov | Record. |
| `/stb-decisions` | dcms-external.s3.amazonaws.com | Record. The file host is an S3 bucket the shop names, not an America.gov service. |
| `/oalj-decisions` | oalj.dol.gov and dol.gov | Record. |
| `/ecab-decisions` | dol.gov | Record. |
| `/fmc-orders` | www2.fmc.gov | Record. |
| `/nlrb-decisions` | apps.nlrb.gov | Record. |
| `/flra-decisions` | flra.gov | Record. |
| `/fcc-eb-orders` | docs.fcc.gov | Record. |
| `/nmb-determinations` | nmb.gov | Record. |
| `/eeoc-appellate` | eeoc.gov federal-sector appeals | Record. Not the public charge-filing service. |
| `/ttab-decisions` | ttab-reading-room.uspto.gov | Record. |
| `/ibla-decisions` | oha.doi.gov | Record. |
| `/ccb-determinations` | dockets.ccb.gov | Record. |
| `/uscg-alj-decisions` | uscg.mil | Record. |
| `/cbca-decisions` | cbca.gov | Record. |
| `/mspb-decisions` | mspbpublic.azurewebsites.net | Record. |

## Ranked actions

1. **Needed now: no product change.** Do not retarget collectors, do not add an America.gov door, and do not change prices. The order leaves the source pages in place.

2. **Worth a watch: the OMB memo.** Due within 90 days of 29 September 2026. It can add or drop covered services. Read it when it is posted. Revisit only if it tells agencies to retire public record pages or put them behind Login.gov. It does not say that today.

3. **Worth a watch: ordinary URL drift.** If an agency restyles a host while it hooks a real service into America.gov, a collector may need a new path. That is the same breakage the shop already handles. Nothing in the order schedules it.

4. **Worth doing as a sentence, not a build.** When the shop is described to agents, say it sells the official record as JSON with a stable id. America.gov answers a question and links to the agency page. It does not return the docket as data, and phase 2 is applications, not bulk records. The shop already has `/.well-known/x402`, `/openapi.json`, and `/mcp`. No serving change is required for that sentence.

5. **Not worth doing: a door of America.gov answers.** The terms forbid scraping the site. The site says the answers can be wrong. The public-domain sentence covers the government text, not a license to resell the chatbot.

6. **Not worth doing: passport, Medicare, Social Security, or VA enrollment as new doors.** Those are the services phase 2 is for. They are applications, not public records. The FAQ says the chat cannot see a filed application.
