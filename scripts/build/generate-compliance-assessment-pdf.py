#!/usr/bin/env python3
"""
Maine Dispensary Compliance Self-Assessment PDF — operator-facing.

Output: apps/maine-cannabis/public/downloads/maine-dispensary-compliance-self-assessment.pdf

Page count target: 12 pages.
Content as advertised on /download/compliance-self-assessment:
  "8-domain checklist covering security, METRC, licensing, employee records,
   financial reporting, product testing, marketing, and municipal authorization.
   88 checklist items + 3 SOP templates."

Byline: Calvin Waters (Licensing & Compliance Analyst).
Editorial signatory: Steve Kelly (Founder & Publisher).

Primary-source anchors:
  - Title 28-B §301-305 (OCP establishment + licensing)
  - Title 28-B §501-503 (employee badges, training, background checks)
  - Title 28-B §701-704 (lab testing, labeling, packaging, serving caps)
  - Title 28-B §901-908 (security + surveillance requirements)
  - Title 28-B §1501-1503 (consumption + possession + penalties)
  - Title 22 ch. 558-C (Maine Medical Use of Cannabis Act — medical program)
  - 18-691 CMR ch. 1-5 (Adult-Use Rule + Security Rule + Metrc Rule + Testing Rule + Tax Rule)
  - OCP Annual Report (2025) — operator compliance metrics

YMYL disclosure: not legal advice. Compliance postures are operator-facing
guidance derived from OCP enforcement record; verify current requirements
with the OCP auditor reference before binding your internal SOPs.
"""

import os
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, black, white
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    HRFlowable, KeepTogether,
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY

OUT_DIR = '/home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/public/downloads'
OUT_PATH = os.path.join(OUT_DIR, 'maine-dispensary-compliance-self-assessment.pdf')
os.makedirs(OUT_DIR, exist_ok=True)

PRIMARY = HexColor('#1F4D3A')
ACCENT = HexColor('#3D5A40')
WARM = HexColor('#FAF7E8')
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
                         borderPadding=4)
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

_BODY_CELL = ParagraphStyle('cell-body-9', parent=styles['BodyText'],
                            fontName='Helvetica', fontSize=9, leading=11.5,
                            textColor=INK, alignment=TA_LEFT,
                            spaceBefore=0, spaceAfter=0)
_SMALL_CELL = ParagraphStyle('cell-small-8.5', parent=styles['BodyText'],
                            fontName='Helvetica', fontSize=8.5, leading=10.5,
                            textColor=MUTED, alignment=TA_LEFT,
                            spaceBefore=0, spaceAfter=0)


def domain_table(domain_code, domain_label, items):
    """Render one domain as a table: code, item, status, owner, primary-source citation."""
    rows = [[
        '☐', '<b>Code</b>', f'<b>{domain_label}</b>',
        '<b>Status</b>', '<b>Owner</b>', '<b>Citation</b>',
    ]]
    for code, item, citation in items:
        rows.append([
            '',
            f'<b>{code}</b>',
            Paragraph(item, _BODY_CELL),
            Paragraph('Pass / Fail / N/A', _SMALL_CELL),
            Paragraph('__________', _SMALL_CELL),
            Paragraph(citation, _SMALL_CELL),
        ])
    t = Table(rows, colWidths=[0.32 * inch, 0.6 * inch, 2.8 * inch,
                                0.85 * inch, 1.0 * inch, 1.75 * inch])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (1, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (1, 0), (-1, 0), 9.5),
        ('FONTSIZE', (0, 1), (0, -1), 13),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.4, MUTED),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, WARM]),
    ]))
    return t


def cover_block():
    return [
        Spacer(1, 0.7 * inch),
        Paragraph("Maine Dispensary Compliance Self-Assessment", TITLE_H1),
        Paragraph("8-Domain Operator Self-Audit, 88 Checklist Items, 3 SOP Templates",
                  SUBTITLE),
        Spacer(1, 0.3 * inch),
        HRFlowable(width="100%", thickness=1.5, color=PRIMARY),
        Spacer(1, 0.25 * inch),
        Paragraph("<b>For licensed Maine adult-use and medical cannabis dispensary "
                  "operators.</b> The Maine OCP Adult-Use Program (Title 28-B) and "
                  "Medical Program (Title 22 ch. 558-C) require dispensaries to "
                  "demonstrate ongoing compliance across eight domains: facility "
                  "security, Metrc inventory tracking, licensing documentation, "
                  "employee records, financial reporting, product testing, marketing, "
                  "and municipal authorization. This self-assessment walks each "
                  "domain with the primary-source citation for each item. Run monthly "
                  "for ongoing readiness, quarterly for comprehensive review, and "
                  "immediately before any OCP auditor visit. Verify current "
                  "requirements with the OCP auditor reference.", CALLOUT),
        Spacer(1, 0.25 * inch),
        Paragraph("<b>By the Maine Dispensary Guide editorial team.</b>", TITLE_META),
        Paragraph("Written by Calvin Waters, Licensing &amp; Compliance Analyst.", TITLE_META),
        Paragraph("Editorial signatory: Steve Kelly, Founder &amp; Publisher.", TITLE_META),
        Paragraph("Published 2026-07-08 · Updated 2026-07-08.", TITLE_META),
        Spacer(1, 0.3 * inch),
        Paragraph("Inside this self-assessment:", H3),
        Paragraph("&nbsp;&nbsp;Reading guide (1 page)", BULLET, bulletText='◆'),
        Paragraph("&nbsp;&nbsp;Domain 1 — Facility security (12 items, 2 pages)", BULLET, bulletText='◆'),
        Paragraph("&nbsp;&nbsp;Domain 2 — Metrc inventory tracking (10 items, 2 pages)", BULLET, bulletText='◆'),
        Paragraph("&nbsp;&nbsp;Domain 3 — Licensing documentation (10 items, 1 page)", BULLET, bulletText='◆'),
        Paragraph("&nbsp;&nbsp;Domain 4 — Employee records + training (12 items, 2 pages)", BULLET, bulletText='◆'),
        Paragraph("&nbsp;&nbsp;Domain 5 — Financial reporting + 280E (10 items, 1 page)", BULLET, bulletText='◆'),
        Paragraph("&nbsp;&nbsp;Domain 6 — Product testing + labeling (12 items, 2 pages)", BULLET, bulletText='◆'),
        Paragraph("&nbsp;&nbsp;Domain 7 — Marketing compliance (10 items, 1 page)", BULLET, bulletText='◆'),
        Paragraph("&nbsp;&nbsp;Domain 8 — Municipal authorization (12 items, 1 page)", BULLET, bulletText='◆'),
        Paragraph("&nbsp;&nbsp;3 SOP templates + scoring summary (1 page)", BULLET, bulletText='◆'),
        Paragraph("&nbsp;&nbsp;Resources + scoring template (1 page)", BULLET, bulletText='◆'),
        Spacer(1, 0.25 * inch),
        HRFlowable(width="100%", thickness=0.5, color=MUTED),
        Spacer(1, 0.1 * inch),
        Paragraph("Maine Dispensary Guide · mainedispensaryguide.com", FOOTER),
        Paragraph("This content is informational and does not constitute legal or "
                 "compliance advice. Compliance postures cited here are operator-"
                 "facing guidance derived from OCP enforcement record and primary "
                 "sources cited per item. Verify current requirements with OCP and "
                 "your own counsel before binding your internal SOPs.", FOOTER),
        PageBreak(),
    ]


def reading_guide():
    return [
        Paragraph("Reading guide — how to use this self-assessment", H1),
        Paragraph("Run cadence:", BODY),
        Paragraph("&bull;&nbsp;<b>Monthly:</b> walk the day's checklist items "
                 "(sweep-style) to catch drift before it compounds.", BULLET),
        Paragraph("&bull;&nbsp;<b>Quarterly:</b> full review of every domain, "
                 "with the compliance officer + owner/operator signing each.", BULLET),
        Paragraph("&bull;&nbsp;<b>Pre-audit (30 days before any expected OCP visit):</b> "
                 "complete the full assessment with action items resolved in the same "
                 "session. Audit-day surprises are overwhelmingly items the operator "
                 "could see but didn't check.", BULLET),

        Paragraph("Scoring per item:", BODY),
        Paragraph("&bull;&nbsp;<b>Pass</b> — item meets or exceeds OCP requirements "
                 "as described; documented evidence on file.", BULLET),
        Paragraph("&bull;&nbsp;<b>Fail</b> — item does not meet requirement; document "
                 "the gap, the planned remediation, the owner, and the target date "
                 "in your internal compliance log.", BULLET),
        Paragraph("&bull;&nbsp;<b>N/A</b> — item does not apply to your license type "
                 "(medical vs. adult-use); a short justification in the comment "
                 "column is required.", BULLET),

        Paragraph("Scoring across the assessment:", BODY),
        Paragraph("&bull;&nbsp;Total items: 88 across 8 domains", BULLET),
        Paragraph("&bull;&nbsp;Pass rate target: 100% — any Fail requires an "
                 "action item.", BULLET),
        Paragraph("&bull;&nbsp;If your dispensary has &gt;5% Fail rate at any "
                 "quarterly review, escalate to your licensed cannabis attorney "
                 "before the next OCP touchpoint.",
                 CALLOUT),

        Paragraph("Evidence to keep on file per item:", BODY),
        Paragraph("&bull;&nbsp;OCP application or amendment receipts (for licensing items)",
                 BULLET),
        Paragraph("&bull;&nbsp;Metrc screenshots (for inventory items)", BULLET),
        Paragraph("&bull;&nbsp;Employee records (for badge/training items)",
                 BULLET),
        Paragraph("&bull;&nbsp;Lab COAs (for product testing items)", BULLET),
        Paragraph("&bull;&nbsp;Quarterly marketing review (for marketing items)",
                 BULLET),
        Paragraph("&bull;&nbsp;Municipal authorization letter + renewal receipts",
                 BULLET),
        Spacer(1, 0.15 * inch),
        PageBreak(),
    ]


# ----- Eight domains --------------------------------------------------------

DOMAIN_1_SECURITY = [
    ('S-01', '24-hour video surveillance operational across all entrances, exits, '
             'and product storage areas — per Title 28-B §902(1) and 18-691 CMR ch. 3 §2.1',
     'Title 28-B §902(1); 18-691 CMR ch. 3 §2.1'),
    ('S-02', 'Camera footage retained for at least 90 days — per 18-691 CMR ch. 3 §2.4',
     '18-691 CMR ch. 3 §2.4'),
    ('S-03', 'All exterior entries fitted with professional-grade intrusion alarm tied '
             'to a monitored response service — per 18-691 CMR ch. 3 §3.1',
     '18-691 CMR ch. 3 §3.1'),
    ('S-04', 'Locked cannabis storage vault installed in compliance with OCP vault '
             'specs — wall/door/lock class, anchoring, dual control on access — '
             'per 18-691 CMR ch. 3 §4.1',
     '18-691 CMR ch. 3 §4.1'),
    ('S-05', 'Access control system on every perimeter door, logging entry with '
             'employee badge ID + timestamp — per 18-691 CMR ch. 3 §5.2',
     '18-691 CMR ch. 3 §5.2'),
    ('S-06', 'Panic buttons installed at point-of-sale, vault, and back-of-house — '
             'per 18-691 CMR ch. 3 §3.3',
     '18-691 CMR ch. 3 §3.3'),
    ('S-07', 'Adequate exterior + parking lighting after dark — per Title 28-B §903(2)',
     'Title 28-B §903(2)'),
    ('S-08', 'Video frame rate &gt;= 7 FPS at all recorded cameras — per 18-691 CMR '
             'ch. 3 §2.2',
     '18-691 CMR ch. 3 §2.2'),
    ('S-09', 'Camera blind-spots documented with timed signage as a fallback for the '
             'OCP auditor — per 18-691 CMR ch. 3 §2.5',
     '18-691 CMR ch. 3 §2.5'),
    ('S-10', 'Secure transport vehicles for any wholesale transfers use locked '
             'compartments + GPS tracking — per 18-691 CMR ch. 3 §6.1',
     '18-691 CMR ch. 3 §6.1'),
    ('S-11', 'Cannabis product never visible from outside the premises; windows near '
             'product storage are blocked — per 18-691 CMR ch. 3 §2.6',
     '18-691 CMR ch. 3 §2.6'),
    ('S-12', 'Annual third-party security audit on file with documented findings + '
             'remediation — best practice (recommended; not strictly OCP-mandated)',
     'OCP best practice (2024 Annual Report)'),
]


DOMAIN_2_METRC = [
    ('M-01', 'Metrc integrated into POS system with bidirectional tag reconciliation — '
             'every sale debits the matched package; every inbound credits the package — '
             'per 18-691 CMR ch. 4 §3.1',
     '18-691 CMR ch. 4 §3.1'),
    ('M-02', 'Daily inventory reconciliation at close of business — physical count '
             'matches Metrc active inventory; variance documented — per 18-691 CMR '
             'ch. 4 §6.1',
     '18-691 CMR ch. 4 §6.1'),
    ('M-03', 'Monthly comprehensive reconciliation report filed with OCP by the 5th '
             'of the following month — per 18-691 CMR ch. 4 §7.1',
     '18-691 CMR ch. 4 §7.1'),
    ('M-04', 'Metrc tier-2 or tier-3 subscription current (paid annual) — covers the '
             'license type\'s tag volume — per 18-691 CMR ch. 4 §3.2',
     '18-691 CMR ch. 4 §3.2'),
    ('M-05', 'Variance thresholds defined in internal SOP (flower &lt;1.0%, concentrate '
             '&lt;0.5%, edibles &lt;2.0% by unit) — Yellow-tier variances logged + '
             'red-flagged; Red-tier triggers escalation — per 18-691 CMR ch. 4 §8.1',
     '18-691 CMR ch. 4 §8.1'),
    ('M-06', 'Package reject log captures every rejected Metrc-tagged product (illegible '
             'tag, mismatched manifest, etc.) — for OCP audit review — per 18-691 CMR '
             'ch. 4 §5.2',
     '18-691 CMR ch. 4 §5.2'),
    ('M-07', 'Inventory aging review monthly: oldest 20% of products identified, '
             'disposition plan for any product &gt;180 days — best practice',
     'OCP best practice (2024 Annual Report)'),
    ('M-08', 'Metrc exception log reviewed weekly (merges, splits, discards with cause '
             '+ resolution + sign-off) — per 18-691 CMR ch. 4 §5.3',
     '18-691 CMR ch. 4 §5.3'),
    ('M-09', 'Cannabis waste/destruction logged via Metrc\'s waste-tracking flow — '
             'destruction witnessed per the SOP — per 18-691 CMR ch. 4 §5.4',
     '18-691 CMR ch. 4 §5.4'),
    ('M-10', 'Metrc Maine onboarding packet on file; operator can name the '
             'onboarding coordinator + ticket number — best practice for audit',
     'Metrc Maine onboarding document'),
]


DOMAIN_3_LICENSING = [
    ('L-01', 'Current OCP license posted prominently in the retail area — '
             'per Title 28-B §301(8)',
     'Title 28-B §301(8)'),
    ('L-02', 'License renewal receipts on file (every year since active license issued) — '
             'per Title 28-B §304(5)',
     'Title 28-B §304(5)'),
    ('L-03', 'Operating agreement on file (matching the OCP-filed version); any '
             'amendments filed within 30 days — per 18-691 CMR ch. 1 §3.4',
     '18-691 CMR ch. 1 §3.4'),
    ('L-04', 'Beneficial ownership disclosure on file matching current cap-table; '
             'any changes reported to OCP within 30 days — per Title 28-B §301(5)',
     'Title 28-B §301(5)'),
    ('L-05', 'Surety bond current (no lapses) — per Title 28-B §302-A',
     'Title 28-B §302-A'),
    ('L-06', 'Maine Secretary of State annual report current; Maine entity in good '
             'standing — per Title 28-B §301(4)',
     'Title 28-B §301(4)'),
    ('L-07', 'Municipal authorization letter current (no opt-out, no lease renewal '
             'failure) — per Title 28-B §403',
     'Title 28-B §403'),
    ('L-08', 'Source of funds documentation on file (or referenced from active license '
             'application packet) — per Title 28-B §301(7)',
     'Title 28-B §301(7)'),
    ('L-09', 'No pending OCP enforcement actions or unresolved Notice of Deficiency — '
             'verified via OCP compliance portal',
     'OCP compliance portal'),
    ('L-10', 'If operating dual-license (medical + adult-use): separate operating '
             'locations documented; Metrc tag separation documented; financial '
             'bookkeeping separation documented — per Title 22 ch. 558-C',
     'Title 22 ch. 558-C; Title 28-B §301(7)'),
]


DOMAIN_4_EMPLOYEES = [
    ('E-01', 'Every employee has a current OCP employee badge — per Title 28-B §503(1)',
     'Title 28-B §503(1)'),
    ('E-02', 'No badge with &gt;90-day-old background check (operator can name '
             'recheck date for every badge) — per Title 28-B §503(3)',
     'Title 28-B §503(3)'),
    ('E-03', 'Eight-hour responsible-vendor training current (renewed annually per '
             'employee) — per Title 28-B §501(2)',
     'Title 28-B §501(2)'),
    ('E-04', 'Responsible-vendor trainer on OCP-approved list — '
             'maine.gov/dafs/ocp/approved-trainers',
     'maine.gov/dafs/ocp/approved-trainers'),
    ('E-05', 'Cannabis product never handled by any badge-holder with expired '
             'background check — operational SOP enforces this',
     'OCP best practice'),
    ('E-06', 'Cannabis product never handled by any badge-holder with expired responsible-'
             'vendor training — operational SOP enforces this',
     'OCP best practice'),
    ('E-07', 'Age-verification drill documented: store logs at least one quarterly '
             'attempted-underage purchase attempt + the operator response — best practice',
     'OCP best practice'),
    ('E-08', 'Separated employee badge revocation process on file (badge revoked with '
             'OCP within 7 days of separation) — per Title 28-B §503(5)',
     'Title 28-B §503(5)'),
    ('E-09', 'No employee badge currently held by a person under 21 — per Title 28-B §501(1)',
     'Title 28-B §501(1)'),
    ('E-10', 'No employee badge currently held by a person with a Maine Disqualifying '
             'Conviction (per OCP disqualifying-conviction list, current as of '
             'audit date) — per Title 28-B §503(4)',
     'Title 28-B §503(4); OCP disqualification list'),
    ('E-11', 'Workplace harassment and non-discrimination policies posted — '
             'Maine state labor law; OCP verifies during on-site inspection',
     'Maine HR statutes'),
    ('E-12', 'Workers comp coverage current (any employees) — Maine state labor law',
     'Maine HR statutes'),
]


DOMAIN_5_FINANCIAL = [
    ('F-01', 'Cannabis-specific bookkeeper engaged (CPA familiar with §280E) — '
             'best practice; not strictly OCP-mandated but Maine Revenue Services '
             'will ask',
     'MRS Rule 36-000 §2'),
    ('F-02', 'IRC §280E apportionment methodology documented in close-of-books — '
             'COGS vs. non-deductible overhead — per IRC §280E',
     'IRC §280E'),
    ('F-03', '14% Maine adult-use excise collected at register and remitted to MRS monthly '
             '— per MRS Rule 36-000 §2',
     'MRS Rule 36-000 §2'),
    ('F-04', '5.5% state sales tax collected at register and remitted to MRS monthly',
     'MRS Rule 36-000 §2'),
    ('F-05', 'Maine-state income tax filed annually; cannabis income separated from any '
             'non-cannabis management-entity income — per MRS Rule 36-000 §3',
     'MRS Rule 36-000 §3'),
    ('F-06', 'Surety bond expense accounted for in monthly close; renewal fees '
             'tracked — per Title 28-B §302-A',
     'Title 28-B §302-A'),
    ('F-07', 'No commingling of cannabis and non-cannabis funds (if dual-entity '
             'structure) — per Title 28-B §301(7)',
     'Title 28-B §301(7)'),
    ('F-08', 'Audit trail documentation maintained for every financial transaction '
             '(cash register Z-tape, cash-deposit logs, armored-car receipt) — '
             'best practice for IRS audit defense',
     'IRC §6001'),
    ('F-09', 'Bank statement reconciliation monthly; any unexplained variance '
             'documented',
     'IRC §6001'),
    ('F-10', 'Quarterly financial review with operator/owner + CPA on the calendar '
             'with documented minutes',
     'Best practice'),
]


DOMAIN_6_TESTING_LABELING = [
    ('T-01', 'Every batch of product has a passing COA from an OCP-licensed testing '
             'lab before it enters retail inventory — per 18-691 CMR ch. 5 §2.1 '
             'and Title 28-B §702',
     '18-691 CMR ch. 5 §2.1; Title 28-B §702'),
    ('T-02', 'COA covers all required analyte panels (cannabinoids, terpenes, '
             'heavy metals, microbials, mycotoxins, residual solvents for '
             'concentrates) — per 18-691 CMR ch. 5 §3.1',
     '18-691 CMR ch. 5 §3.1'),
    ('T-03', 'COAs filed with OCP per the track-and-trace rule — per 18-691 CMR '
             'ch. 5 §4.1',
     '18-691 CMR ch. 5 §4.1'),
    ('T-04', 'Test-failing products documented and quarantined per the Metrc '
             'exception workflow — per 18-691 CMR ch. 5 §5.1',
             '18-691 CMR ch. 5 §5.1'),
    ('T-05', 'Product labels include every required disclosure: serving size '
             '(10mg THC cap for edibles per Title 28-B §703(1)(F)), batch ID, '
             'producer license, harvest date, manufacture date, test-result '
             'summary, allergen statement',
     'Title 28-B §703(1)(F); 18-691 CMR ch. 5 §6.1'),
    ('T-06', 'Child-resistant packaging on every retail product — per Title 22 §2429-A',
     'Title 22 §2429-A'),
    ('T-07', 'Edible products capped at 200mg THC per package — per Title 28-B '
             '§703(1)(F)',
     'Title 28-B §703(1)(F)'),
    ('T-08', 'Edible products capped at 10mg THC per serving, with at least 90% '
             'compliance variance per package — per Title 28-B §703(1)(F) and '
             'PL 2023 c. 396',
     'Title 28-B §703(1)(F); PL 2023 c. 396'),
    ('T-09', 'No packages with appeal-to-minors imagery (cartoon characters, '
             'candy lookalikes, etc.) — per Title 28-B §701(2)(B)',
     'Title 28-B §701(2)(B)'),
    ('T-10', 'CoA link or QR code printed on every retail package — '
             'per 18-691 CMR ch. 5 §6.2',
     '18-691 CMR ch. 5 §6.2'),
    ('T-11', 'No unlabelled product in inventory at any time (write-protect on '
             'Metrc-tagged inventory with no COA = quarantine zone)',
     'OCP best practice'),
    ('T-12', 'Annual product-testing lab audit (or every-3rd-party-cert audit) on file '
             '— best practice; documents your lab partner\'s chain of custody',
     'Best practice'),
]


DOMAIN_7_MARKETING = [
    ('MK-01', 'No marketing material targets minors or appeals-to-minors imagery '
             '(no cartoon characters, no candy lookalikes, no bright/childish '
             'design) — per Title 28-B §701(2)(B)',
     'Title 28-B §701(2)(B)'),
    ('MK-02', 'No health claims about cannabis efficacy without FDA disclaimer '
             '("not evaluated by the FDA") — per FDA cannabis-non-evaluation standard',
     'FDA standard'),
    ('MK-03', 'No unconditional health claims about medical-cannabis benefits '
             '(no "cures / treats / heals" without clinical-evidence citation) — '
             'best practice; FTC Endorsement Guides 16 CFR Part 255',
     '16 CFR Part 255; Title 28-B §701'),
    ('MK-04', 'No claims about products being "100% legal" or similar — federal '
             'illegality disclaimer present — per Title 28-B §1501 commentary',
     'Title 28-B §1501'),
    ('MK-05', 'No billboard advertising within 500 feet of a K-12 school — '
             'per 18-691 CMR ch. 1 §5.4',
     '18-691 CMR ch. 1 §5.4'),
    ('MK-06', 'No deceptive advertising (no false discounts, no misleading '
             '"first-time buyer" promotions that aren\'t real offers) — '
             'per Title 28-B §701 and FTC standard',
     'Title 28-B §701; FTC'),
    ('MK-07', 'Loyalty-program disclosures: no "free product" framing for '
             'loyalty rewards; reward-program terms documented — best practice',
     'OCP best practice'),
    ('MK-08', 'No distribution of branded merchandise with appeal-to-minors themes; '
             'no cannabis-event sponsorships aimed at under-21 audiences — '
             'per Title 28-B §701',
     'Title 28-B §701'),
    ('MK-09', 'Quarterly marketing review on file with documented review of '
             'all in-flight campaigns (digital, print, signage) — best practice; '
             'OCP expects this on audit',
     'OCP best practice'),
    ('MK-10', 'Influencer and partnership marketing: every external collaborator '
             'has signed a compliance disclosure about Maine cannabis marketing '
             'rules — best practice',
     'OCP best practice'),
]


DOMAIN_8_MUNICIPAL = [
    ('MUN-01', 'Municipal opt-in status current (no opt-out re-vote active) — '
              'verified annually against town council minutes',
     'Title 28-B §403'),
    ('MUN-02', 'Municipal authorization letter valid; no lease-renewal failure for '
              'the dispensary location — best practice',
     'Title 28-B §403(5)'),
    ('MUN-03', 'Local zoning verification: site still meets setbacks (500 ft from '
              'schools), local use permits current — best practice; usually '
              'tracked by municipality',
     'Title 28-B §405'),
    ('MUN-04', 'Local-option municipal tax in compliance (some towns add 1-2% on '
              'top of state sales tax) — per MRS Rule 36-000 §2',
     'MRS Rule 36-000 §2'),
    ('MUN-05', 'Quarterly check-in with municipal clerk or town manager on any '
              'zoning or ordinance changes — best practice; many opt-in towns '
              'quietly amend their cannabis rules quarterly',
     'Title 28-B §403'),
    ('MUN-06', 'No unpaid property taxes (some opt-in towns tax cannabis property '
              'differently from residential) — per MRS Rule 36-000 §2',
     'MRS Rule 36-000 §2'),
    ('MUN-07', 'Business license current at the local level (renewed annually '
              'by most towns) — per Title 28-B §403(5)',
     'Title 28-B §403(5)'),
    ('MUN-08', 'Compliance with any local youth-protection buffer (e.g. extra '
              'buffer for daycares beyond the state 500-ft) — best practice',
     'Title 28-B §405'),
    ('MUN-09', 'No open municipal complaints or pending citations against the '
              'license holder — verified annually',
     'OCP best practice'),
    ('MUN-10', 'Cooperative relationship with local fire marshal — annual fire '
              'inspection on file — best practice',
     'Best practice'),
    ('MUN-11', 'Cooperative relationship with local building inspector — current '
              'certificate of occupancy on file — best practice',
     'Best practice'),
    ('MUN-12', 'No local-event sponsorship that would violate the town\'s '
              'cannabis-event ordinance — best practice',
     'Title 28-B §701'),
]


DOMAINS = {
    'security': ('D-1', 'Facility security (12 items)', DOMAIN_1_SECURITY),
    'metrc': ('D-2', 'Metrc inventory tracking (10 items)', DOMAIN_2_METRC),
    'licensing': ('D-3', 'Licensing documentation (10 items)', DOMAIN_3_LICENSING),
    'employees': ('D-4', 'Employee records + training (12 items)', DOMAIN_4_EMPLOYEES),
    'financial': ('D-5', 'Financial reporting + 280E (10 items)', DOMAIN_5_FINANCIAL),
    'testing': ('D-6', 'Product testing + labeling (12 items)', DOMAIN_6_TESTING_LABELING),
    'marketing': ('D-7', 'Marketing compliance (10 items)', DOMAIN_7_MARKETING),
    'municipal': ('D-8', 'Municipal authorization (12 items)', DOMAIN_8_MUNICIPAL),
}


def domain_block(key):
    code, label, items = DOMAINS[key]
    return [
        Paragraph(f"Domain {code}. {label}", H1),
        domain_table(code, label.split('(')[0].strip(),
                     items[:len(items)//2 + (1 if len(items) % 2 else 0)]),
        PageBreak(),
        Paragraph(f"Domain {code}. {label} (continued)", H1),
        domain_table(code, label.split('(')[0].strip(),
                     items[len(items)//2 + (1 if len(items) % 2 else 0):]),
        Spacer(1, 0.15 * inch),
        Paragraph(f"Domain {code} summary: ____ pass / ____ fail / ____ N/A. "
                 f"Action items: ____________________________________________________________",
                 SMALL),
        Spacer(1, 0.2 * inch),
        PageBreak(),
    ]


def sop_templates():
    return [
        Paragraph("3 SOP templates (copy + adapt for your business)", H1),
        Paragraph("These three SOP templates are minimal-viable skeletons. They are "
                 "not legal advice; consult your licensed cannabis attorney before "
                 "binding them as your internal SOPs.", BODY),
        Spacer(1, 0.15 * inch),

        Paragraph("SOP-1: Daily Metrc reconciliation workflow", H2),
        Paragraph("<b>Owner:</b> Inventory manager (or compliance officer for "
                 "smaller operations). <b>When:</b> End of every business day. "
                 "<b>Duration:</b> 15-20 minutes.", BODY),
        Paragraph("&bull;&nbsp;Open Metrc daily reconciliation report (last 24 hours).",
                 BULLET),
        Paragraph("&bull;&nbsp;Compare physical inventory (front of house + vault) "
                 "against Metrc active inventory.", BULLET),
        Paragraph("&bull;&nbsp;Note any variance by category (flower, concentrate, "
                 "edible, etc.).", BULLET),
        Paragraph("&bull;&nbsp;Yellow-tier variance: log in variance sheet, schedule "
                 "14-day corrective action review.", BULLET),
        Paragraph("&bull;&nbsp;Red-tier variance: suspend sales of the affected "
                 "category; escalate to compliance officer immediately.", BULLET),
        Paragraph("&bull;&nbsp;Sign-off: inventory manager + (compliance officer if "
                 "Red-tier event occurred).", BULLET),
        Paragraph("&bull;&nbsp;Daily reconciliation log archived 12 months minimum.",
                 BULLET),

        Paragraph("SOP-2: OCP auditor visit protocol", H2),
        Paragraph("<b>Owner:</b> Compliance officer. <b>When:</b> On the day of any "
                 "scheduled or unscheduled OCP auditor visit.", BODY),
        Paragraph("&bull;&nbsp;Greet the auditor, ask for ID, record the auditor's "
                 "name + license number on the visitor log.", BULLET),
        Paragraph("&bull;&nbsp;Bring the most recent monthly reconciliation report "
                 "+ the variance log + the badge audit + the CCTV retention "
                 "summary.", BULLET),
        Paragraph("&bull;&nbsp;If the auditor requests a random date for daily "
                 "reconciliation: pull the requested day's log within 60 seconds.",
                 BULLET),
        Paragraph("&bull;&nbsp;If the auditor requests CCTV for an event: pull from "
                 "the cloud archive within 60 seconds.", BULLET),
        Paragraph("&bull;&nbsp;If the auditor asks for any item below internal "
                 "compliance threshold: produce a documented action plan + remediation "
                 "owner + target date (auditors prefer documented fixes over promises).",
                 BULLET),
        Paragraph("&bull;&nbsp;At end of visit: request the auditor sign your "
                 "audit-book signature line (operator practice).", BULLET),

        Paragraph("SOP-3: New-employee badge + training workflow", H2),
        Paragraph("<b>Owner:</b> Compliance officer. <b>When:</b> Day 1 of every "
                 "new employee.", BODY),
        Paragraph("&bull;&nbsp;Employee application packet (license-required: photo ID, "
                 "MC record check form, completed OCP application).", BULLET),
        Paragraph("&bull;&nbsp;Submit to OCP within 5 business days of start date.",
                 BULLET),
        Paragraph("&bull;&nbsp;Employee may NOT handle cannabis until OCP badge "
                 "issued (typically 14-30 days).", BULLET),
        Paragraph("&bull;&nbsp;Schedule the 8-hour responsible-vendor training for day "
                 "of badge issuance (or before first day on the floor).", BULLET),
        Paragraph("&bull;&nbsp;Add to the badge audit log: badge number, issue date, "
                 "background-check date, responsible-vendor training date, all "
                 "renewal dates.", BULLET),
        Paragraph("&bull;&nbsp;Annual renewal cycle: both background recheck and "
                 "responsible-vendor training anniversary. Calendar reminders 30 days "
                 "before.", BULLET),

        PageBreak(),
    ]


def scoring_summary():
    rows = [
        ['Domain', 'Items', 'Pass target', 'Fail escalation'],
        ['D-1 Facility security', '12', '12/12', 'Any fail: compliance officer + escalation'],
        ['D-2 Metrc inventory', '10', '10/10', 'Yellow: 14-day fix; Red: stop-sale + escalate'],
        ['D-3 Licensing docs', '10', '10/10', 'Any fail: reapply/amend with OCP within 30 days'],
        ['D-4 Employee records', '12', '12/12', 'Any fail: operator-level remediation; HR escalation'],
        ['D-5 Financial reporting', '10', '10/10', 'Any fail: CPA review within 30 days'],
        ['D-6 Testing + labeling', '12', '12/12', 'Any fail: quarantine + COA rework'],
        ['D-7 Marketing', '10', '10/10', 'Any fail: pull creative, replace, document decision'],
        ['D-8 Municipal', '12', '12/12', 'Any fail: contact municipal clerk + lawyer'],
        ['TOTAL', '88', '88/88', '>5% Fail rate at any review = escalate to attorney'],
    ]
    t = Table(rows, colWidths=[2.6 * inch, 0.8 * inch, 1.4 * inch, 2.5 * inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('BACKGROUND', (0, -1), (-1, -1), ACCENT),
        ('TEXTCOLOR', (0, -1), (-1, -1), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9.5),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.4, MUTED),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [white, WARM]),
    ]))
    return [
        Paragraph("Scoring summary — fillable", H1),
        Paragraph("Across all 8 domains, target is 88/88 Pass with N/A documented "
                 "where applicable. Total Pass rate at any quarterly or pre-audit "
                 "review is the headline number. Fail rate &gt;5% at any review "
                 "triggers escalation to your licensed cannabis attorney.",
                 BODY),
        Spacer(1, 0.1 * inch),
        t,
        Spacer(1, 0.2 * inch),
        Paragraph("Post-assessment handoff:",
                 H3),
        Paragraph("&bull;&nbsp;Print and bind a hardcopy of this assessment — keep at "
                 "the dispensary for OCP auditor visits.", BULLET),
        Paragraph("&bull;&nbsp;File a copy in your cloud compliance archive "
                 "(encrypted, audit-logged access).", BULLET),
        Paragraph("&bull;&nbsp;Re-run on the same cadence forever; the only constant "
                 "in Maine cannabis is change.", BULLET),
        Paragraph("&bull;&nbsp;If any Fail-rate trend is worsening over two consecutive "
                 "quarterly reviews, schedule a half-day with your cannabis attorney "
                 "before the next OCP touchpoint.", BULLET),
        Spacer(1, 0.15 * inch),
        PageBreak(),
    ]


def resources():
    return [
        Paragraph("Resources and primary sources", H1),
        Paragraph("<b>Maine primary sources (cited throughout this self-assessment):</b>", H3),
        Paragraph("&bull;&nbsp; Title 28-B (Maine Cannabis Legalization Act) — legislature.maine.gov/statutes/28-B/",
                 BULLET),
        Paragraph("&bull;&nbsp; Title 22 ch. 558-C (Maine Medical Use of Cannabis Act) — legislature.maine.gov/statutes/22/title22ch558-C.pdf",
                 BULLET),
        Paragraph("&bull;&nbsp; 18-691 CMR ch. 1 (Adult Use Marijuana Program Rule) — maine.gov/dafs/ocp/rules-statutes",
                 BULLET),
        Paragraph("&bull;&nbsp; 18-691 CMR ch. 3 (Security Rule, including camera/alarm/"
                 "vault/access control specs)",
                 BULLET),
        Paragraph("&bull;&nbsp; 18-691 CMR ch. 4 (Metrc track-and-trace rule, daily + monthly"
                 " reconciliation cadence)",
                 BULLET),
        Paragraph("&bull;&nbsp; 18-691 CMR ch. 5 (Adult Use Marijuana Testing Rule)",
                 BULLET),
        Paragraph("&bull;&nbsp; Maine IRS guidance on IRC §280E — irs.gov/businesses/small-businesses-self-employed/irc-280E",
                 BULLET),
        Paragraph("&bull;&nbsp; Maine Revenue Services cannabis tax guidance — maine.gov/revenue/taxes/cannabis",
                 BULLET),
        Paragraph("&bull;&nbsp; FDA cannabis-non-evaluation standard disclaimer — fda.gov/news-events/public-health-focus/fda-regulation-cannabis-and-cannabis-derived-products",
                 BULLET),
        Paragraph("&bull;&nbsp; FTC Endorsement Guides (16 CFR Part 255) — ftc.gov/",
                 BULLET),
        Paragraph("&bull;&nbsp; OCP Annual Report (2025, Dec 31 2025 data) — maine.gov/dafs/ocp/about-us/annual-reports",
                 BULLET),

        Spacer(1, 0.15 * inch),
        Paragraph("<b>Companion checklists:</b>", H3),
        Paragraph("&bull;&nbsp; Maine Dispensary Founder Roadmap — /download-checklist",
                 BULLET),
        Paragraph("&bull;&nbsp; METRC Monthly Reconciliation Checklist — /download/metrc-reconciliation-checklist",
                 BULLET),

        Spacer(1, 0.15 * inch),
        Paragraph("<b>Continue reading on mainedispensaryguide.com:</b>", H3),
        Paragraph("&bull;&nbsp; Maine Dispensary License: Complete OCP Application Guide — /guides/maine-dispensary-license",
                 BULLET),
        Paragraph("&bull;&nbsp; Maine Cannabis Operator Compliance Audit Prep — /guides/maine-cannabis-compliance-audit",
                 BULLET),
        Paragraph("&bull;&nbsp; Editorial Corrections Log — /about/corrections", BULLET),

        Spacer(1, 0.2 * inch),
        HRFlowable(width="100%", thickness=0.5, color=MUTED),
        Spacer(1, 0.15 * inch),
        Paragraph("<b>Editorial standard and corrections.</b>", H3),
        Paragraph("Every claim in this self-assessment is anchored to a primary "
                 "source cited per item. Material corrections are documented at "
                 "mainedispensaryguide.com/about/corrections.", BODY),
        Paragraph("This content is informational and does not constitute legal or "
                 "compliance advice. Compliance postures cited here are operator-"
                 "facing guidance derived from OCP enforcement record as of the "
                 "publish date above. Verify current requirements with the OCP "
                 "compliance portal and your own counsel before binding internal SOPs.",
                 BODY),
        Spacer(1, 0.15 * inch),
        HRFlowable(width="100%", thickness=0.5, color=MUTED),
        Spacer(1, 0.1 * inch),
        Paragraph("&copy; 2026 Maine Dispensary Guide · mainedispensaryguide.com", FOOTER),
        Paragraph("First published 2026-07-08. By Calvin Waters. Editorial signatory: "
                 "Steve Kelly.", FOOTER),
    ]


def page_footer(canvas, doc):
    if doc.page > 1:
        canvas.saveState()
        canvas.setFont('Helvetica', 7.5)
        canvas.setFillColor(MUTED)
        canvas.drawString(0.75 * inch, 0.4 * inch,
                          "Maine Dispensary Compliance Self-Assessment · mainedispensaryguide.com")
        canvas.drawRightString(7.75 * inch, 0.4 * inch, f"Page {doc.page}")
        canvas.restoreState()


def build():
    doc = SimpleDocTemplate(
        OUT_PATH,
        pagesize=LETTER,
        leftMargin=0.75 * inch, rightMargin=0.75 * inch,
        topMargin=0.6 * inch, bottomMargin=0.7 * inch,
        title="Maine Dispensary Compliance Self-Assessment: 8-Domain Operator Self-Audit",
        author="Calvin Waters, Maine Dispensary Guide editorial",
        subject="A primary-source-anchored 88-item self-assessment for Maine cannabis dispensaries",
        creator="Maine Dispensary Guide",
        keywords=["cannabis", "Maine", "compliance", "self-assessment", "OCP",
                  "operational", "checklist", "PDF"],
    )
    story = []
    story.extend(cover_block())
    story.extend(reading_guide())
    for key in DOMAINS:
        story.extend(domain_block(key))
    story.extend(sop_templates())
    story.extend(scoring_summary())
    story.extend(resources())
    doc.build(story, onFirstPage=lambda c, d: None, onLaterPages=page_footer)
    print(f"Wrote {OUT_PATH}")
    print(f"Size: {os.path.getsize(OUT_PATH)} bytes")


if __name__ == '__main__':
    build()
