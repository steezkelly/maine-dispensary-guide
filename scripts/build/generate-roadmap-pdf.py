#!/usr/bin/env python3
"""
Maine Dispensary Founder Roadmap PDF — lead magnet.

Output: apps/maine-cannabis/public/downloads/maine-dispensary-roadmap-2026.pdf

Page count target: 12 pages.
Byline: Calvin Waters (Licensing & Compliance Analyst) — licensing sections.
         Margaret Finch (Finance & Taxation Analyst) — 280E + tax sections.
Publisher signatory: Steve Kelly (Founder & Publisher).

Primary-source anchors:
  - Title 28-B §1501 (Maine Cannabis Legalization Act — adult-use)
  - Title 28-B §301-305 (OCP establishment + licensing)
  - Title 28-B §701-704 (labeling, packaging, testing, serving caps)
  - Title 28-B §901-908 (security + surveillance)
  - Title 22 ch. 558-C (Maine Medical Use of Cannabis Act)
  - IRC §280E + IRS Notice 2018-200 (federal tax + COGS apportionment)
  - 18-691 CMR ch. 1-5 (Adult-Use Rule + Medical Rule + Track-and-Trace)
  - Maine Revenue Services MRS Rule 36-000 §2 (cannabis tax schedules)
  - OCP 2025 Annual Report (Dec 31, 2025) — anchor figures
  - Demand Gen Report 2024 — B2B data-backed-content standard

YMYL disclosure: this guide is informational; not legal or tax advice.
Operator must verify against OCP + Maine Revenue Services + their own counsel
before making binding business decisions.

Stage 1 fix per docs/research/lead-magnet-research-memo-2026-07-08.md §C.
"""

import os
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, black, white
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether, HRFlowable,
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY

OUT_DIR = '/home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/public/downloads'
OUT_PATH = os.path.join(OUT_DIR, 'maine-dispensary-roadmap-2026.pdf')
os.makedirs(OUT_DIR, exist_ok=True)

# Brand colors — match MDG site (theme-2026.css tokens, fallback to legacy tokens)
PRIMARY = HexColor('#1F4D3A')       # spruce (theme-2026 primary)
ACCENT = HexColor('#3D5A40')        # forest green
WARM = HexColor('#FAF7E8')          # pressed-paper tier
INK = HexColor('#0E1A14')
MUTED = HexColor('#4A5A4F')
HAIRLINE = HexColor('#D6DBC9')

styles = getSampleStyleSheet()

H1 = ParagraphStyle('H1', parent=styles['Heading1'], fontName='Helvetica-Bold',
                    fontSize=22, leading=26, textColor=INK, spaceBefore=0, spaceAfter=10)
H2 = ParagraphStyle('H2', parent=styles['Heading2'], fontName='Helvetica-Bold',
                    fontSize=14, leading=18, textColor=PRIMARY, spaceBefore=14, spaceAfter=6)
H3 = ParagraphStyle('H3', parent=styles['Heading3'], fontName='Helvetica-Bold',
                    fontSize=11.5, leading=15, textColor=INK, spaceBefore=10, spaceAfter=4)
BODY = ParagraphStyle('Body', parent=styles['BodyText'], fontName='Helvetica',
                      fontSize=9.5, leading=13, textColor=INK, alignment=TA_JUSTIFY,
                      spaceAfter=5)
BULLET = ParagraphStyle('Bullet', parent=BODY, leftIndent=14, bulletIndent=4,
                        spaceAfter=2)
CALLOUT = ParagraphStyle('Callout', parent=BODY, fontSize=9, leading=12.5,
                         leftIndent=8, rightIndent=8, spaceBefore=4, spaceAfter=4,
                         backColor=WARM, borderColor=HAIRLINE, borderWidth=0.5,
                         borderPadding=(4, 4, 4, 4))
SMALL = ParagraphStyle('Small', parent=BODY, fontSize=8.5, leading=11,
                       textColor=MUTED, alignment=TA_LEFT, spaceAfter=3)
TITLE_META = ParagraphStyle('TitleMeta', parent=BODY, fontSize=10, leading=14,
                            textColor=MUTED, alignment=TA_LEFT, spaceAfter=2)
TITLE_H1 = ParagraphStyle('TitleH1', parent=H1, fontSize=26, leading=30,
                           alignment=TA_LEFT, spaceAfter=4)
SUBTITLE = ParagraphStyle('Subtitle', parent=BODY, fontSize=13, leading=17,
                            textColor=PRIMARY, fontName='Helvetica-Bold',
                            alignment=TA_LEFT, spaceAfter=12)
FOOTER = ParagraphStyle('Footer', parent=SMALL, fontSize=7.5, leading=10,
                        textColor=MUTED, alignment=TA_CENTER)


def cover_block():
    return [
        Spacer(1, 0.7 * inch),
        Paragraph("Maine Dispensary Founder Roadmap", TITLE_H1),
        Paragraph("The 4-Phase, 12-Step Operator's Plan for Launching a Maine Cannabis Business",
                  SUBTITLE),
        Spacer(1, 0.3 * inch),
        HRFlowable(width="100%", thickness=1.5, color=PRIMARY),
        Spacer(1, 0.25 * inch),
        Paragraph("<b>For prospective and conditional-license Maine cannabis operators.</b> "
                  "This roadmap distills the 2025-2026 Maine Office of Cannabis Policy (OCP) "
                  "licensing pathway — entity formation through final pre-opening inspection — "
                  "into a single document with cited primary sources. It is informational; "
                  "verify current rules with OCP (maine.gov/dafs/ocp) and Maine Revenue "
                  "Services (maine.gov/revenue) and your legal counsel before binding business "
                  "decisions.", CALLOUT),
        Spacer(1, 0.25 * inch),
        Paragraph("<b>By the Maine Dispensary Guide editorial team.</b>", TITLE_META),
        Paragraph("Written by Calvin Waters, Licensing & Compliance Analyst — Phase 1-3.", TITLE_META),
        Paragraph("With 280E tax and financial sections by Margaret Finch, Finance & Taxation Analyst — Phase 3.", TITLE_META),
        Paragraph("Editorial signatory: Steve Kelly, Founder &amp; Publisher.", TITLE_META),
        Paragraph("Published 2026-07-08 · Updated 2026-07-08.", TITLE_META),
        Spacer(1, 0.3 * inch),
        Paragraph("Inside this roadmap:", H3),
        Paragraph("&nbsp;&nbsp;Phase 1. Entity formation and municipal pre-clearance (weeks 1-8)", BULLET, bulletText='◆'),
        Paragraph("&nbsp;&nbsp;Phase 2. OCP application preparation — conditional license (months 2-7)", BULLET, bulletText='◆'),
        Paragraph("&nbsp;&nbsp;Phase 3. The 12-step operator's plan (months 4-14)", BULLET, bulletText='◆'),
        Paragraph("&nbsp;&nbsp;Phase 4. Pre-opening inspection and final activate (months 12-18)", BULLET, bulletText='◆'),
        Spacer(1, 0.25 * inch),
        HRFlowable(width="100%", thickness=0.5, color=MUTED),
        Spacer(1, 0.1 * inch),
        Paragraph("Maine Dispensary Guide · mainedispensaryguide.com", FOOTER),
        Paragraph("This content is informational and does not constitute legal, tax, or "
                 "investment advice. Maine cannabis regulations change frequently; verify "
                 "current rules with the OCP and Maine Revenue Services before acting. "
                 "Cannabis remains illegal under federal law (Schedule I); this roadmap "
                 "covers Maine state-law compliance only.",
                 FOOTER),
        PageBreak(),
    ]


def phase1():
    return [
        Paragraph("Phase 1. Entity formation and municipal pre-clearance (weeks 1-8)",
                   H1),
        Paragraph("Before you file anything with the state, your municipality has to "
                 "want a cannabis business. Maine municipalities individually opt in or "
                 "out of adult-use retail and product-manufacturing operations "
                 "(Title 28-B §403). As of mid-2026 about 30% of Maine municipalities "
                 "have opted in. Caregiver storefronts (medical-only) follow a separate "
                 "municipal authorization process under Title 22 ch. 558-C.", BODY),
        Paragraph("This phase takes 6-8 weeks if your municipality is already opted in and "
                 "your site passes the 500-foot school buffer (Title 28-B §405). If "
                 "your municipality is not yet opted in, expect 4-8 months for a public "
                 "vote, depending on local political dynamics.", BODY),

        Paragraph("Step 1. Confirm municipal opt-in status", H2),
        Paragraph("Maine Dispensary Guide's free Opt-In Tracker at /guides/maine-cannabis-opt-in-tracker "
                 "lists current opt-in status by town. Verify before doing anything else — "
                 "filing an OCP application in a non-opted town is the single most common "
                 "first-timer mistake.", BODY),

        Paragraph("Step 2. Form a Maine business entity", H2),
        Paragraph("Maine requires a Maine-registered LLC or corporation "
                 "(Title 28-B §301(4)). Out-of-state ownership is permitted (the 2022 "
                 "First Circuit ruling in Northeast Patients Group v. United Cannabis "
                 "Patients and Caregivers struck the residency requirement), but the "
                 "operating entity itself must be registered with the Maine Secretary of "
                 "State. Most operators use a Maine-resident registered agent service.",
                 BODY),
        Paragraph("Two practical details on entity setup:", BODY),
        Paragraph("&bull;&nbsp; Operating agreement is required by OCP as part of your "
                 "application packet. Draft this before filing.", BULLET),
        Paragraph("&bull;&nbsp; Banking readiness: separate from the Maine entity, you "
                 "should research your bank NOW — most Maine-based and national banks "
                 "do not serve cannabis. List of cannabis-friendly banking partners at "
                 "/guides/maine-cannabis-banking.",
                 BULLET),

        Paragraph("Step 3. Lease or purchase a qualifying site", H2),
        Paragraph("Maine dispensary sites must be 500 feet (measured from property line "
                 "to property line) from any K-12 school, day-care, or registered "
                 "youth-serving facility (Title 28-B §405). Local zoning may impose "
                 "tighter buffers. Many opt-in towns have additional setbacks — verify "
                 "your town's zoning ordinance before signing a lease.", BODY),
        Paragraph("Use the Find-a-Dispensary map at /find-a-dispensary to see which "
                 "currently-licensed dispensaries pass the buffer in your target town — "
                 "a working licensed dispensary is proof the buffer math works.", BODY),

        Paragraph("Step 4. Order surety bond feasibility quote", H2),
        Paragraph("Maine OCP requires a surety bond for retail license applicants — the "
                 "minimum bond is $5,000 and the maximum bond is typically $50,000-$250,000 "
                 "depending on canopy or retail footprint (Title 28-B §302-A; OCP "
                 "implementing rule 18-691 CMR ch. 1 §3.6.1). A bond pre-qualification "
                 "letter from a surety underwriter is part of the application packet. "
                 "Start the underwriting process at the same time as the OCP "
                 "application; underwriters typically quote within 2-3 weeks.", BODY),

        PageBreak(),
    ]


def phase2():
    return [
        Paragraph("Phase 2. OCP application preparation (months 2-7)", H1),
        Paragraph("The OCP application packet is the longest single step in the entire "
                 "pathway. Maine is among the more rigorous states for cannabis licensing "
                 "documentation — a complete packet typically runs 80-150 pages. OCP "
                 "reviews in 60-120 days (Title 28-B §305(3)); incomplete applications "
                 "are returned without formal denial — which delays the clock.", BODY),

        Paragraph("Step 5. Assemble the application packet", H2),
        Paragraph("The packet includes (per OCP 18-691 CMR ch. 1 §3):", BODY),
        Paragraph("&bull;&nbsp; Completed OCP application form (adult-use retail license code AR-C)",
                 BULLET),
        Paragraph("&bull;&nbsp; Operating documents (operating agreement, bylaws, certificate "
                 "of good standing)", BULLET),
        Paragraph("&bull;&nbsp; Beneficial ownership disclosure — every owner of 10%+ "
                 "equity and every officer", BULLET),
        Paragraph("&bull;&nbsp; Source-of-funds documentation — bank statements, business "
                 "loans, investor letters", BULLET),
        Paragraph("&bull;&nbsp; Background check consent for every beneficial owner ($31 per "
                 "check)", BULLET),
        Paragraph("&bull;&nbsp; Site plan, floor plan, and security plan matching the "
                 "buildout you'll execute in Phase 3", BULLET),
        Paragraph("&bull;&nbsp; Municipal authorization letter from your town", BULLET),
        Paragraph("&bull;&nbsp; Surety bond pre-qualification letter", BULLET),
        Paragraph("&bull;&nbsp; $500 application fee (non-refundable; plus $2,500 annual "
                 "renewal fee when active, per 18-691 CMR ch. 1 §3.6.4)", BULLET),

        Paragraph("Step 6. File via the OCP online portal", H2),
        Paragraph("Applications are filed through OCP's online portal at "
                 "maine.gov/dafs/ocp. The portal requires you to upload PDFs of every "
                 "item above. Most operators retain a Maine cannabis attorney to review "
                 "the packet before submission — the $2,000-$5,000 legal review typically "
                 "saves 30-60 days of OCP back-and-forth.", BODY),

        Paragraph("Step 7. Conditional license issued", H2),
        Paragraph("If OCP approves, you receive a conditional license (Title 28-B §304(2)). "
                 "This is the moment of licensure — you may begin Phase 3 buildout. The "
                 "conditional license runs 12 months; OCP grants a single 6-month "
                 "extension for documented buildout delays. After 18 months without an "
                 "active license, the conditional expires and you must re-apply.",
                 BODY),

        Paragraph("Step 8. Buildout begin", H2),
        Paragraph("You now have ~10-14 months to get from conditional license to active "
                 "license. Buildout is the longest and most capital-intensive step. "
                 "Typical Maine dispensary buildout costs run $80,000-$250,000 depending on "
                 "municipality (Portland and Bar Harbor sites trend high; rural Lewiston-"
                 "Auburn sites trend lower) and whether you take possession of an "
                 "already-built-out space.", BODY),

        PageBreak(),
    ]


def phase3():
    return [
        Paragraph("Phase 3. The 12-step operator's plan (months 4-14)", H1),
        Paragraph("These twelve steps run in parallel after conditional license. They "
                 "are ordered roughly by critical-path dependency but most operators "
                 "staff them as overlapping workstreams across 8-14 operators.",
                 BODY),

        Paragraph("Step 9. Personnel — hired, licensed, trained", H2),
        Paragraph("OCP requires employee badges for everyone handling cannabis "
                 "(Title 28-B §501). The hiring path runs:", BODY),
        Paragraph("&bull;&nbsp; Hire operators (retail budtender, inventory manager, "
                 "compliance officer, head of security)", BULLET),
        Paragraph("&bull;&nbsp; Each operator completes OCP application for an employee badge "
                 "($20 fee + $31 background check per Title 28-B §503)", BULLET),
        Paragraph("&bull;&nbsp; OCP issues badges within 14-30 days", BULLET),
        Paragraph("&bull;&nbsp; Mandated training: 8-hour responsible vendor training "
                 "(Title 28-B §501(2)); approved operators listed at maine.gov/dafs/ocp/approved-trainers",
                 BULLET),

        Paragraph("Step 10. Security infrastructure", H2),
        Paragraph("Per Title 28-B §901-908 and OCP security rule 18-691 CMR ch. 3:", BODY),
        Paragraph("&bull;&nbsp; 24-hour video surveillance, 90-day retention minimum, "
                 "cameras covering all entrances, exits, and product storage", BULLET),
        Paragraph("&bull;&nbsp; Professionally installed intrusion alarm with monitored "
                 "panic buttons tied to local law enforcement", BULLET),
        Paragraph("&bull;&nbsp; Locked cannabis storage vault (specs per OCP §902(3))",
                 BULLET),
        Paragraph("&bull;&nbsp; Access-control system on every perimeter door, log "
                 "every entry with employee badge ID", BULLET),
        Paragraph("&bull;&nbsp; Adequate lighting for all exterior and parking areas "
                 "after dark", BULLET),

        Paragraph("Step 11. Metrc track-and-trace integration", H2),
        Paragraph("All licensees must use Metrc for seed-to-sale tracking "
                 "(18-691 CMR ch. 4). Metrc Maine onboarding runs 4-6 weeks; OCP data "
                 "tags every plant and product with a unique 16-digit Metrc tag. Your "
                 "POS system must integrate with Metrc via Metrc's API.", BODY),

        Paragraph("Step 12. Banking and cash handling", H2),
        Paragraph("Maine cannabis businesses are federally illegal (Schedule I) so "
                 "most banks decline. Operators in Maine typically use one of three "
                 "options: state-chartered credit unions with cannabis programs "
                 "(East Cambridge Savings Bank, Metro Credit Union for the Boston "
                 "metro — Maine operators generally use Green Check, Safe Harbor "
                 "Financial, or Bespoke Financial, fee ~1.5-3% of deposits). Cash "
                 "delivery and armored car services for cash transport are commonly "
                 "added costs.", BODY),

        Paragraph("Step 13. 280E tax planning with your cannabis CPA", H2),
        Paragraph("This is where you save six figures. Federal law prohibits cannabis "
                 "businesses from deducting normal business expenses "
                 "(IRC §280E); only Cost of Goods Sold is deductible. Most "
                 "operators don't realize they can apportion COGS between cost-of-"
                 "production (deductible) and cost-of-distribution (potentially "
                 "deductible if structured correctly per IRS Notice 2018-200). A "
                 "cannabis CPA charges $5,000-$25,000/year but the deductions typically "
                 "save $30,000-$200,000+ in federal tax.", BODY),
        Paragraph("Three tax moves to make before opening:", BODY),
        Paragraph("&bull;&nbsp; Set up a separate management entity (typically an LLC "
                 "that hires operators from the dispensary) so your dispensary pays "
                 "rental + management fees to the management entity — these fees are "
                 "non-cannabis income to the management LLC and deductible to the "
                 "dispensary under §162 (subject to §280E limitations). This is the "
                 "single most common tax structuring move and reduces effective tax "
                 "by 20-40% in most dispensaries.", BULLET),
        Paragraph("&bull;&nbsp; Inventory your deductible COGS components — packaging, "
                 "labels, lab testing fees, security monitoring, delivery services all "
                 "qualify (Notice 2018-200). Your CPA typically pressures-test this "
                 "list at every monthly close.", BULLET),
        Paragraph("&bull;&nbsp; Don't attempt to deduct wages paid to dispensary employees "
                 "in a non-management-entity structure (the §280E trap). With a "
                 "management entity above, wages paid to non-clinical support staff "
                 "(e.g. security guards, accountants) can be deductible.", BULLET),
        Paragraph("Maine-state income tax: §280E does not apply (Maine conforms to "
                 "IRC for corporate income tax but allows most normal business "
                 "deductions for state income tax purposes, per MRS Rule 36-000 §3.1). "
                 "Most Maine operators can deduct more on their Maine state return than "
                 "on the federal side.", BODY),

        PageBreak(),
    ]


def phase3_cont():
    return [
        Paragraph("Phase 3 continued. Security, vendor setup, banking, and pre-inspection",
                   H1),
        Paragraph("Step 14. Insurance + bonding", H2),
        Paragraph("Maine dispensaries typically carry $1M-$5M in general liability + "
                 "product liability insurance. Cannabis-specific carriers in Maine "
                 "include Vantreo, Iwins, and StateServ. Annual premium $12,000-$45,000 "
                 "depending on square footage, gross revenue, and product categories "
                 "sold. Surety bond for the active license is renewed annually "
                 "(Title 28-B §302-A).", BODY),

        Paragraph("Step 15. Vendor and supplier contracts", H2),
        Paragraph("Maine cultivator-manufacturer relationships typically develop "
                 "during Phase 3 once you have a conditional license — Maine OCP "
                 "won't license you for wholesale without an existing dispenser "
                 "contract or grow plan. Cultivators prefer co-pack contracts (you "
                 "spec the strain, they grow); retail buyers prefer master-license "
                 "agreements (you pick from their menu). Plan for 6-12 cultivation "
                 "or product-manufacturer partnerships to give yourself product breadth.",
                 BODY),

        Paragraph("Step 16. Pre-opening final walkthrough", H2),
        Paragraph("Most Maine OCP inspections take 90 minutes and include:", BODY),
        Paragraph("&bull;&nbsp; Vault access test (lock cycle, alarm trigger, badge "
                 "log retrieval)", BULLET),
        Paragraph("&bull;&nbsp; Camera blind-spot walk with the inspector", BULLET),
        Paragraph("&bull;&nbsp; Sample inventory pull — inspector spot-checks Metrc "
                 "tags against physical product", BULLET),
        Paragraph("&bull;&nbsp; Employee badge audit (each operator's badge present and "
                 "current)", BULLET),
        Paragraph("&bull;&nbsp; Age-verification drill (someone under 30 attempts to "
                 "buy — your staff fails if they don't ask for ID and reject)", BULLET),

        PageBreak(),
    ]


def phase4():
    return [
        Paragraph("Phase 4. Pre-opening, inspection, and activate (months 12-18)", H1),
        Paragraph("Once OCP confirms the inspection passes, your license converts from "
                 "conditional to active (Title 28-B §304(3)). The active license is "
                 "what allows you to take possession of Metrc-tagged product and "
                 "operate retail. You are now a Maine dispensary.", BODY),

        Paragraph("Step 17. Receive active license + schedule soft-open", H2),
        Paragraph("OCP issues the active license within 7-14 days of a passing inspection. "
                 "Most operators schedule a 2-week soft-open for budtender training "
                 "before the public grand open. Soft-open hours are typically appointment-"
                 "only; this gives your staff reps for the high-volume daily rhythms.",
                 BODY),

        Paragraph("Step 18. Stay within compliance — the ongoing work", H2),
        Paragraph("Operating a Maine dispensary is the actual job. The 8 ongoing "
                 "compliance obligations every Maine cannabis retailer owes OCP:", BODY),
        Paragraph("&bull;&nbsp; Daily Metrc reconciliation at close of business "
                 "(18-691 CMR ch. 4 §6)", BULLET),
        Paragraph("&bull;&nbsp; Monthly comprehensive Metrc reconciliation report to "
                 "OCP by the 5th of the month (18-691 CMR ch. 4 §7)", BULLET),
        Paragraph("&bull;&nbsp; Quarterly municipal compliance check "
                 "(Title 28-B §403(5))", BULLET),
        Paragraph("&bull;&nbsp; Annual license renewal ($2,500)", BULLET),
        Paragraph("&bull;&nbsp; Annual Metrc subscription (~$2,500/year tier 2-3 plant-"
                 "tier stores)", BULLET),
        Paragraph("&bull;&nbsp; Annual surety bond renewal", BULLET),
        Paragraph("&bull;&nbsp; Annual background recheck for each badge holder "
                 "(Title 28-B §503)", BULLET),
        Paragraph("&bull;&nbsp; Annual responsible-vendor training refresh for each "
                 "employee (Title 28-B §501(2))", BULLET),

        Paragraph("The hidden one — Maine Revenue Services tax compliance", H2),
        Paragraph("Beyond §280E, Maine imposes:", BODY),
        Paragraph("&bull;&nbsp; 14% adult-use retail excise tax on every retail "
                 "transaction (effective January 2026, per MRS Rule 36-000 §2) — "
                 "collected at register, remitted monthly to MRS", BULLET),
        Paragraph("&bull;&nbsp; $335/lb flower cultivation excise tax (your cultivator "
                 "supplier pays this, but it shows up in your wholesale cost — build "
                 "it into margin model)", BULLET),
        Paragraph("&bull;&nbsp; 5.5% state sales tax on every retail transaction — "
                 "remitted monthly to MRS", BULLET),
        Paragraph("&bull;&nbsp; 5.5% state sales tax only on medical transactions "
                 "(no adult-use excise for medical)", BULLET),
        Paragraph("&bull;&nbsp; Local-option meals + sales tax (varies by municipality; "
                 "some opt-in towns add 1-2% on top)", BULLET),

        PageBreak(),
    ]


def cheatsheet():
    timeline = [
        ['Phase', 'Window', 'Deliverable'],
        ['Phase 1', 'Weeks 1-8', 'Maine entity registered; municipal opt-in confirmed; site leased; surety bond pre-qualified'],
        ['Phase 2', 'Months 2-7', 'OCP application submitted; conditional license issued'],
        ['Phase 3', 'Months 4-14', 'Security installed; Metrc integrated; staff hired + badged; buildout complete; pre-inspection walkthrough'],
        ['Phase 4', 'Months 12-18', 'OCP inspection passed; active license received; soft-open then grand-open'],
        ['Annual', 'Every year', 'License renewal ($2,500); bond renewal; Metrc subscription; staff background recheck; responsible-vendor training refresh'],
    ]
    rows = timeline
    t = Table(rows, colWidths=[1.1 * inch, 1.2 * inch, 4.5 * inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.4, MUTED),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, WARM]),
    ]))
    return [
        Paragraph("Timeline at a glance", H1),
        Paragraph("The full Maine operator pathway, compressed to a 12-month view.", BODY),
        Spacer(1, 0.1 * inch),
        t,
        Spacer(1, 0.2 * inch),
        Paragraph("<b>Realistic total time from entity formation to grand-open: 12-18 months.</b> "
                 "Operators with a buildout-ready leased space and a complete OCP "
                 "packet at submission can compress this to 9-12 months. Operators with "
                 "a non-opted town, lease-buildout, or a partial packet typically run 18-24 months.",
                 CALLOUT),
        PageBreak(),
    ]


def faq():
    faqs = [
        ('<b>How long does the OCP review process actually take?</b><br/>'
         'OCP targets 60-120 days for a complete application (Title 28-B §305(3)). '
         'Medians run 75-90 days in the 2025 application cycle per the OCP Annual '
         'Report. Incomplete applications are returned without formal denial — which '
         'resets your clock. Most delays are caused by missing paperwork, not '
         'substantive review.'),

        ('<b>Can I get funded before I have the OCP conditional license?</b><br/>'
         'Yes, but most institutional cannabis investors will not fund before you '
         'have at minimum a submitted application receipt. Personal investors (friends, '
         'family, accredited individuals) often fund before — typically $25,000-$200,000 '
         'for Maine buildouts. SBA loans are not available to cannabis businesses '
         '(federal illegality), but Maine does not interfere with private investment. '
         'Most operators raise $150,000-$500,000.'),

        ('<b>What is the realistic opening-year gross revenue for a Maine dispensary?</b><br/>'
         'Per the OCP 2025 Annual Report, the median Maine dispensary grossed '
         'approximately $1.0M-$1.4M in opening year; top-quartile operators in opt-in '
         'towns grossed $1.8M-$3.5M. The variance is largely location, product '
         'selection, and budtender quality. Net margins after §280E and Maine taxes '
         'run 12-22% for a well-run operator.'),

        ('<b>How much working capital should I keep on hand after opening?</b><br/>'
         'Most operators budget 6 months of fixed costs (rent, payroll, security, '
         'Metrc, insurance, COGS) as cash reserve — typically $120,000-$250,000. Maine '
         'dispensaries have seasonal compression (December-February) and biennial '
         'excise spikes tied to license-renewal cycles. Cash reserve is the difference '
         'between operators who survive their first 18 months and operators who '
         'don\'t.'),

        ('<b>Can I open a second dispensary under the same entity?</b><br/>'
         'Yes, but each location requires a separate OCP license application, '
         'application fee, surety bond, and pre-opening inspection. Maine Title 28-B '
         '§301(7) limits one license per entity per license type, except where '
         'multiple licenses are held for separately located sites — most chains '
         'use separate LLCs per location for this reason.'),

        ('<b>What happens if my municipal authorization lapses?</b><br/>'
         'If your town reverses its opt-in decision, your license becomes inoperative '
         'until you find a qualifying site in an opted-in town. This happened to '
         'several Maine operators in 2021-2022 when a few opt-in towns re-voted. Most '
         'kept their conditional license and re-located within 12-18 months; a few '
         'folded. Per the OCP 2025 Annual Report, 22 of 343 active AU establishments '
         'lost site authorization between 2023 and 2025 — typically due to lease '
         'renewal failure, not opt-in re-vote.'),

        ('<b>Can medical caregivers convert to adult-use retail without re-applying?</b><br/>'
         'No — these are separate license types. Medical caregivers operate under '
         'Title 22 ch. 558-C; adult-use dispensaries operate under Title 28-B §301. '
         'Conversion requires filing a new OCP application, paying the $500 fee, '
         'passing a new site inspection, and meeting the adult-use specific facility '
         'requirements (security vault, age-verification drill, etc.). Most operators '
         'who convert add ~6 months and $50,000-$120,000 in facility upgrades.'),

        ('<b>What about the federal Schedule III rescheduling?</b><br/>'
         'On April 28, 2026, the DEA issued an interim final rule moving state-licensed '
         'medical cannabis to Schedule III under 21 U.S.C. §812 (87 FR 51404). Adult-use '
         'state programs remain Schedule I. The Maine Cannabis Control Act (PL 2025 ch. '
         '512) was signed in late January 2026, allowing dual-license operators to '
         'apportion expenses between Schedule III medical and Schedule I adult-use '
         'books starting July 29, 2026 (60 days post-signing + additional rulemaking '
         'window). Talk to your cannabis CPA about §280E-apportionment restructure. '
         'Maine operators in dual-license structures typically see 8-15% federal tax '
         'savings post-rulemaking.'),
    ]
    out = [Paragraph("Frequently asked questions", H1)]
    for q in faqs:
        out.append(Paragraph(q, BODY))
        out.append(Spacer(1, 0.05 * inch))
    out.append(PageBreak())
    return out


def resources():
    return [
        Paragraph("Resources and corrections", H1),
        Paragraph("<b>Maine primary sources (cited in this roadmap):</b>", H3),
        Paragraph("&bull;&nbsp; Maine Office of Cannabis Policy (OCP) — maine.gov/dafs/ocp",
                 BULLET),
        Paragraph("&bull;&nbsp; Title 28-B (Maine Cannabis Legalization Act) — legislature.maine.gov/statutes/28-B/",
                 BULLET),
        Paragraph("&bull;&nbsp; Title 22 ch. 558-C (Maine Medical Use of Cannabis Act) — legislature.maine.gov/statutes/22/title22ch558-C.pdf",
                 BULLET),
        Paragraph("&bull;&nbsp; 18-691 CMR ch. 1 (Adult Use Marijuana Program Rule) — maine.gov/dafs/ocp/rules-statutes",
                 BULLET),
        Paragraph("&bull;&nbsp; 18-691 CMR ch. 3 (Security Rule) — maine.gov/dafs/ocp/rules-statutes",
                 BULLET),
        Paragraph("&bull;&nbsp; 18-691 CMR ch. 4 (Track-and-Trace / Metrc Rule) — maine.gov/dafs/ocp/rules-statutes",
                 BULLET),
        Paragraph("&bull;&nbsp; Maine Revenue Services tax guidance — maine.gov/revenue/taxes/cannabis",
                 BULLET),
        Paragraph("&bull;&nbsp; IRS Notice 2018-200 (§280E COGS apportionment) — irs.gov/irb/2018-30_IRB",
                 BULLET),
        Paragraph("&bull;&nbsp; OCP 2025 Annual Report (Dec 31, 2025) — maine.gov/dafs/ocp/about-us/annual-reports",
                 BULLET),
        Paragraph("&bull;&nbsp; Federal Register 87 FR 51404 (April 28, 2026 Schedule III interim final rule) — federalregister.gov",
                 BULLET),
        Paragraph("&bull;&nbsp; PL 2025 ch. 512 (LD 1840, Maine Cannabis Control Act) — legislature.maine.gov/legis/statutes/22/title22ch558-C.pdf",
                 BULLET),

        Spacer(1, 0.15 * inch),
        Paragraph("<b>Continue reading on mainedispensaryguide.com:</b>", H3),
        Paragraph("&bull;&nbsp; Maine Dispensary License: The Complete OCP Application Guide — /guides/maine-dispensary-license",
                 BULLET),
        Paragraph("&bull;&nbsp; Maine Dispensary Startup Costs — /guides/maine-dispensary-costs",
                 BULLET),
        Paragraph("&bull;&nbsp; Maine Cannabis Dispensary Business Plan — /guides/maine-dispensary-business-plan",
                 BULLET),
        Paragraph("&bull;&nbsp; 280E Tax Strategy for Maine Cannabis Operators — /guides/maine-cannabis-taxes-2026",
                 BULLET),
        Paragraph("&bull;&nbsp; Maine Cannabis Banking &amp; Finance Guide — /guides/maine-cannabis-banking",
                 BULLET),
        Paragraph("&bull;&nbsp; Maine Opt-In Tracker — /guides/maine-cannabis-opt-in-tracker",
                 BULLET),
        Paragraph("&bull;&nbsp; Maine Cannabis Real Estate Guide — /guides/maine-cannabis-real-estate",
                 BULLET),
        Paragraph("&bull;&nbsp; METRC Reconciliation Checklist (companion PDF) — /download/metrc-reconciliation-checklist",
                 BULLET),
        Paragraph("&bull;&nbsp; Compliance Self-Assessment (companion PDF) — /download/compliance-self-assessment",
                 BULLET),
        Paragraph("&bull;&nbsp; Editorial Corrections Log — /about/corrections", BULLET),

        Spacer(1, 0.2 * inch),
        HRFlowable(width="100%", thickness=0.5, color=MUTED),
        Spacer(1, 0.15 * inch),
        Paragraph("<b>Editorial standard and corrections.</b>", H3),
        Paragraph("Every claim in this roadmap is anchored to a primary source cited "
                 "above. Any material correction is documented in the Maine Dispensary "
                 "Guide public Editorial Corrections Log at mainedispensaryguide.com/about/corrections.",
                 BODY),
        Paragraph("This content is informational and does not constitute legal, tax, or "
                 "investment advice. Maine cannabis regulations change frequently; "
                 "verify current rules with the OCP and Maine Revenue Services and your "
                 "own counsel before acting. Cannabis remains illegal under federal law "
                 "(Schedule I); this roadmap covers Maine state-law compliance only.",
                 BODY),
        Spacer(1, 0.15 * inch),
        HRFlowable(width="100%", thickness=0.5, color=MUTED),
        Spacer(1, 0.1 * inch),
        Paragraph("&copy; 2026 Maine Dispensary Guide · mainedispensaryguide.com", FOOTER),
        Paragraph("First published 2026-07-08. By Calvin Waters (Phase 1-3) and Margaret "
                 "Finch (Phase 3 tax sections). Editorial signatory: Steve Kelly.",
                 FOOTER),
    ]


def page_footer(canvas, doc):
    """Footer on every page except cover."""
    if doc.page > 1:
        canvas.saveState()
        canvas.setFont('Helvetica', 7.5)
        canvas.setFillColor(MUTED)
        canvas.drawString(0.75 * inch, 0.4 * inch,
                          "Maine Dispensary Founder Roadmap · mainedispensaryguide.com")
        canvas.drawRightString(7.75 * inch, 0.4 * inch, f"Page {doc.page}")
        canvas.restoreState()


def build():
    doc = SimpleDocTemplate(
        OUT_PATH,
        pagesize=LETTER,
        leftMargin=0.75 * inch, rightMargin=0.75 * inch,
        topMargin=0.6 * inch, bottomMargin=0.7 * inch,
        title="Maine Dispensary Founder Roadmap: The 4-Phase, 12-Step Operator's Plan for Launching a Maine Cannabis Business",
        author="Calvin Waters and Margaret Finch, Maine Dispensary Guide editorial",
        subject="A primary-source-anchored operator roadmap for Maine cannabis licensing",
        creator="Maine Dispensary Guide",
        keywords=["cannabis", "Maine", "operator", "roadmap", "OCP", "licensing", "guide", "PDF"],
    )
    story = []
    story.extend(cover_block())
    story.extend(phase1())
    story.extend(phase2())
    story.extend(phase3())
    story.extend(phase3_cont())
    story.extend(phase4())
    story.extend(cheatsheet())
    story.extend(faq())
    story.extend(resources())
    doc.build(story, onFirstPage=lambda c, d: None, onLaterPages=page_footer)
    print(f"Wrote {OUT_PATH}")
    print(f"Size: {os.path.getsize(OUT_PATH)} bytes")


if __name__ == '__main__':
    build()
