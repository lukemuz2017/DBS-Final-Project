# Financial literacy as a Runway component: raw notes (2026-11-13)

## 1. Does financial education work?
- **Fernandes, Lynch & Netemeyer 2014**, Management Science 60(8):1861-83 (201 studies). Interventions explain ~0.1% of variance in behaviour (less for low-income). Effects decay: negligible ~20+ months out. Argues for "just-in-time" education tied to a specific decision. https://papers.ssrn.com/abstract=2333898
- **Kaiser, Lusardi, Menkhoff & Urban 2022**, JFE 145(2):255-72. 76 RCTs, 160k people, 33 countries. ~0.20 SD on knowledge, ~0.10 SD on behaviour; publication-bias corrected 0.15 / 0.057 SD. At least 3x Fernandes et al. No clear evidence of rapid decay up to ~2 yrs, "but no evidence against it either" (GFLEC slides). Mean cost $60/participant. https://www.diw.de/de/diw_01.c.785790.de/publikationen/diskussionspapiere/2020_1864/financial_education_affects_financial_knowledge_and_downstream_behaviors.html ; slides https://gflec.org/wp-content/uploads/2022/12/Meta_analysis_LusardiUrban-NEFE-final.pdf ; numbers via VoxEU https://cepr.org/voxeu/columns/financial-education-effective-and-efficient
  - Note: Lusardi/GFLEC are advocates of fin-ed; TIAA funds the P-Fin index. Not vendor, but interested parties.
- **Drexler, Fischer & Schoar 2014**, AEJ: Applied 6(2):1-31. RCT, 1,193 Dominican microentrepreneurs: simple rules of thumb (separate business/personal money) improved practices and revenues; standard accounting course did not. https://www.aeaweb.org/articles?id=10.1257/app.6.2.1
- **Isler, Rojas & Dulleck (ANU)**, preregistered experiment: defaults raised saving and cut errors; "educative nudges" had no effect. https://researchportalplus.anu.edu.au/en/publications/easy-to-shove-difficult-to-show-effect-of-educative-and-default-n/
- Reminders: mixed but sometimes effective (Karlan et al., "Getting to the top of mind"). https://poverty-action.org/publication/getting-top-mind-how-reminders-increase-saving
- Gap: found no RCT directly varying *timing* of education relative to a decision; "just-in-time" is an inference from decay, not a tested result. In-app contextual teaching: no rigorous evidence found.

## 2. Existing players
- **Zogo** (gamified lessons, rewards): survived by going B2B, banks/credit unions sponsor access codes (zogo.com/about, (c) 2026). PEAK6 acquisition claim (2025) from an unreliable source; unverified.
- **Greenlight** (teen debit + literacy): 6.5M parents+kids, ~75 bank partners (Sacra, May 2025); 21% layoff 2022; valuation down from $2.3B (2021). Revenue est. $228.5M 2024 (Sacra, estimate). Literacy is a sidecar to a card product.
- **Step** (teen/young adult banking): acquired by MrBeast's Beast Industries, announced 2026-02-09; ~6.5-7M users. https://wtop.com/news/2026/04/mrbeast-now-owns-this-popular-kids-money-app-should-you-be-concerned/
- **Copper** (teen banking): killed banking/debit May 2024 after Synapse collapse; pivoted to "Earn" (surveys/games). https://techcrunch.com/2024/05/21/teen-fintech-copper-had-to-emergency-discontinue-its-banking-debit-products
- **Cleo** (AI "money coach"): ~$254M 2025 revenue (Sacra estimate), ~62% from cash-advance express fees; FTC $17M settlement 2025-03-27 over advance marketing + cancellation. https://www.hunton.com/privacy-and-information-security-law/ftc-reaches-17-million-settlement-with-cash-advance-company-cleo-ai ; https://sacra.com/c/cleo
- **Albert**: "Genius" AI assistant subscription; help center says $39.99/mo; cancellation complaints (secondary). https://help.albert.com/hc/en-us/articles/21583583733271
- **Mint**: shut Jan 2024 (migration deadline Mar 23 2024) into Credit Karma, which dropped budgets.
- **YNAB**: teaching is the product: a method (Four Rules, reframed 2025 as questions) + free live workshops. Strongest proof that a *method* taught through your own money retains users.
- **Monarch**: Forecasting launched spring 2026 (blog says 2026-04-13; Plus tier). Single projection, decades-long, life events; "doesn't provide statistical probabilities"; no shortfall explanations; no AI in forecasting. https://www.monarch.com/blog/forecasting
- **Duolingo-for-finance clones**: CashLingo, Finlingo, Startvest, Birdwingo (EUR1.2M, 2024), Go Boldly, Your Juno... Crowded, mostly tiny Product Hunt launches.
- **Found / Lili**: auto tax set-aside per deposit (Found also computes quarterly estimates). Business-banking, backward-looking, no personal forward forecast. Flat % can be wrong with W-2 side income etc.

## 3. Demographics
- General: TIAA-GFLEC P-Fin 2025: adults 49% correct; Gen Z 38% (lowest). https://www.tiaa.org/public/about-tiaa/news-press/press-releases/2025/06-09
- NFCS 2024 (pub. July 2025, n>25,500): 46% have 3-month emergency fund (53% in 2021); knowledge flat; 18-34 inflation Q correct 34%->44%. https://www.finrafoundation.org/NFCSReport2024
- Fed SHED (2024 data, pub. May 2025): 11% struggled to pay bills because income varied; 19% under $25k vs 3% $100k+. 9% did task gig work; many say it's needed to make ends meet. https://www.federalreserve.gov/publications/2025-economic-well-being-of-us-households-in-2024-income-and-expenses.htm
- **Gig/nontraditional workers are NOT less literate**: Pew 2022 (2020 survey, n=1,000): 51.9% got all 3 Big-Three questions right vs 30% in NFCS 2018 (skews older, educated, male). Their problem is volatility/tooling, not knowledge. https://www.pew.org/en/research-and-analysis/issue-briefs/2022/09/nontraditional-workers-exhibit-high-levels-of-financial-literacy
- **Independents**: MBO Partners 2025: 72.9M independents, 27.6M full-time (vendor report). No first-year count found.
- **New freelancer taxes**: 2022 poll (1,000 independents, via Reed Corp): 47% set nothing aside monthly, 49% not paying quarterly. Lili 2022 (vendor): >90% Gen Z freelancers didn't know about quarterly taxes. FreshBooks 2025 (vendor): 26% fully confident on taxes. IRS/WSJ: penalised filers 7.2M (2010) -> 10M (2015); no newer count found. First-year safe harbor: 100% of prior-year tax (110% if AGI>$150k) -> first-year freelancers with low prior tax can avoid penalty but still face the April lump sum.
- **Grad students on fellowships**: universities don't withhold federal tax from fellowship stipends, no W-2/1099; students may owe quarterly estimates (MIT, Illinois, Northwestern, OSU guidance). Stipend adequacy: CU Boulder gradSERU 2025 only 37% say stipend covers cost of living. Summer gaps/irregular disbursement anecdotal. https://grad.illinois.edu/funding/understanding-taxability/tax-loan-information-u.s.-students-fellowships
- **International students**: 1,177,766 in 2024/25 (Open Doors 2025), incl. 294k on OPT; Fall 2025 snapshot -1%. Lacking US credit history, work restrictions, treaty tax rules. No literacy survey found. https://www.iie.org/news/open-doors-2025-press-release/
- Prior note (competitors_others.md): Penny Hoarder reviewer said Cleo's "can I afford" ignored quarterly tax set-aside.

## Gaps / unverified
- No RCT on in-app contextual explanations of a forecast.
- No first-year-freelancer count; tax-surprise stats are old or vendor-sourced.
- Zogo acquisition and Greenlight financials unverified/estimates.
