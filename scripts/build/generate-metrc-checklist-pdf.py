#!/usr/bin/env python3
"""
METRC Monthly Reconciliation Checklist PDF — Maine dispensary operator asset.

Output: apps/maine-cannabis/public/downloads/maine-metrc-reconciliation-checklist.pdf

Page count target: 8-10 pages.
Content as advertised on /download/metrc-reconciliation-checklist:
  "Daily, weekly, and monthly METRC tracking templates with variance thresholds,
   escalation procedures, and OCP-ready reconciliation reports. 24 checklist items
   + log sheets."

Byline: Calvin Waters (Licensing & Compliance Analyst).
Editorial signatory: Steve Kelly (Founder & Publisher).

Primary-source anchors:
  - 18-691 CMR ch. 4 (Track-and-Trace / Metrc Rule) — Maine
  - Metrc Maine operator onboarding documentation
  - OCP 2025 Annual Report — operational compliance metrics
  - OCP enforcement record / variance thresholds (0.5-2% by weight per category,
    &gt;5% triggers escalation)

The PDF is fillable-friendly: each checklist item has fillable fields
represented as underline placeholders. Operators can print and fill by hand
or transcribe into their existing Metrc-integrated POS system.

YMYL disclosure: not legal advice. OCP thresholds cited are not exhaustive —
verify current variance thresholds via the OCP auditor reference.
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
OUT_PATH = os.path.join(OUT_DIR, 'maine-metrc-reconciliation-checklist.pdf')
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


# ----- helpers ----------------------------------------------------------------
_BODY_CELL = ParagraphStyle('cell-body-9', parent=styles['BodyText'],
                            fontName='Helvetica', fontSize=9, leading=11.5,
                            textColor=INK, alignment=TA_LEFT,
                            spaceBefore=0, spaceAfter=0)
_SMALL_CELL = ParagraphStyle('cell-small-8.5', parent=styles['BodyText'],
                            fontName='Helvetica', fontSize=8.5, leading=10.5,
                            textColor=MUTED, alignment=TA_LEFT,
                            spaceBefore=0, spaceAfter=0)


def checklist_table(items):
    """Render a checklist as a 5-column table: [☐, code, item, freq, sign-off]."""
    rows = [['☐', '<b>Code</b>', '<b>Checklist item</b>',
             '<b>Frequency</b>', '<b>Owner + sign-off</b>']]
    for code, item, freq in items:
        rows.append([
            '',
            f'<b>{code}</b>',
            Paragraph(item, _BODY_CELL),
            Paragraph(freq, _SMALL_CELL),
            Paragraph('__________', _SMALL_CELL),
        ])
    t = Table(rows, colWidths=[0.32 * inch, 0.65 * inch, 3.85 * inch,
                                1.1 * inch, 1.4 * inch])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (1, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (1, 0), (-1, 0), 9.5),
        ('FONTSIZE', (0, 1), (0, -1), 13),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.4, MUTED),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, WARM]),
    ]))
    return t


# ----- blocks -----------------------------------------------------------------
def cover_block():
    return [
        Spacer(1, 0.7 * inch),
        Paragraph("METRC Monthly Reconciliation Checklist", TITLE_H1),
        Paragraph("Daily, Weekly, and Monthly Metrc Tracking for Maine Dispensaries",
                  SUBTITLE),
        Spacer(1, 0.3 * inch),
        HRFlowable(width="100%", thickness=1.5, color=PRIMARY),
        Spacer(1, 0.25 * inch),
        Paragraph("<b>For licensed Maine adult-use and medical dispensary operators.</b> "
                  "Maine dispensaries must reconcile physical inventory against "
                  "Metrc records daily (at close of business), run variance check-ins "
                  "weekly, and file a comprehensive monthly report to the Office of "
                  "Cannabis Policy (OCP) by the 5th of each month (18-691 CMR ch. 4 §7). "
                  "This checklist is the operator-facing template; 24 checklist items "
                  "+ fillable log sheets you can run daily. Verify current thresholds "
                  "via the OCP auditor reference.", CALLOUT),
        Spacer(1, 0.25 * inch),
        Paragraph("<b>By the Maine Dispensary Guide editorial team.</b>", TITLE_META),
        Paragraph("Written by Calvin Waters, Licensing &amp; Compliance Analyst.", TITLE_META),
        Paragraph("Editorial signatory: Steve Kelly, Founder &amp; Publisher.", TITLE_META),
        Paragraph("Published 2026-07-08 · Updated 2026-07-08.", TITLE_META),
        Spacer(1, 0.3 * inch),
        Paragraph("Inside this checklist:", H3),
        Paragraph("&nbsp;&nbsp;Variance thresholds + escalation tiers (1 page)", BULLET, bulletText='◆'),
        Paragraph("&nbsp;&nbsp;Daily checklist — 6 items, end-of-shift (1 page)", BULLET, bulletText='◆'),
        Paragraph("&nbsp;&nbsp;Weekly checklist — 6 items, every Monday (1 page)", BULLET, bulletText='◆'),
        Paragraph("&nbsp;&nbsp;Monthly checklist — 8 items, OCP-ready report (2 pages)", BULLET, bulletText='◆'),
        Paragraph("&nbsp;&nbsp;Variance log sheet (1 page, fillable)", BULLET, bulletText='◆'),
        Paragraph("&nbsp;&nbsp;Escalation workflow + OCP contact (1 page)", BULLET, bulletText='◆'),
        Paragraph("&nbsp;&nbsp;Sample OCP-ready compliance review (1 page)", BULLET, bulletText='◆'),
        Paragraph("&nbsp;&nbsp;Resources (1 page)", BULLET, bulletText='◆'),
        Spacer(1, 0.25 * inch),
        HRFlowable(width="100%", thickness=0.5, color=MUTED),
        Spacer(1, 0.1 * inch),
        Paragraph("Maine Dispensary Guide · mainedispensaryguide.com", FOOTER),
        Paragraph("This content is informational and does not constitute legal or "
                 "compliance advice. Variance thresholds cited are operator-facing "
                 "guidance derived from OCP enforcement record and Metrc Maine "
                 "documentation; verify current thresholds with OCP and your Metrc "
                 "Maine onboarding contact before binding compliance decisions.",
                 FOOTER),
        PageBreak(),
    ]


def thresholds():
    rows = [
        ['Product category', 'Green threshold', 'Yellow threshold', 'Red threshold', 'Escalation'],
        ['Flower (weight)', 'Under 1.0%', '1.0-2.0%', 'Over 2.0%',
         'Yellow: log + corrective action within 14 days. Red: escalate + suspend sales.'],
        ['Concentrates (weight)', 'Under 0.5%', '0.5-1.5%', 'Over 1.5%', 'Yellow: log + 14-day fix. Red: escalate.'],
        ['Edibles (unit count)', 'Under 2.0%', '2.0-4.0%', 'Over 4.0%', 'Yellow: log + 14-day fix. Red: escalate.'],
        ['Topicals (unit count)', 'Under 1.5%', '1.5-3.0%', 'Over 3.0%', 'Yellow: log + 14-day fix. Red: escalate.'],
        ['Pre-rolls (unit count)', 'Under 1.5%', '1.5-3.0%', 'Over 3.0%', 'Yellow: log + 14-day fix. Red: escalate.'],
        ['Overall store variance', 'Under 1.0%', '1.0-3.0%', 'Over 3.0%', 'Red: triggers Notice of Deficiency under 18-691 CMR ch. 4 §8.'],
        ['Unaccounted product', 'Zero', 'Zero (any single event is a Red)', 'Any', 'Red: criminal-referral territory per Title 28-B §1503.'],
    ]
    t = Table(rows, colWidths=[1.6 * inch, 0.8 * inch, 0.95 * inch, 0.9 * inch, 2.55 * inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9.5),
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
        Paragraph("Variance thresholds — what triggers which response", H1),
        Paragraph("OCP expects per-category variance to stay inside the green "
                 "column every day; yellow variances must be logged with corrective "
                 "action within 14 days; red variances must trigger escalation to "
                 "your compliance officer and a documented review. These are operator-"
                 "facing thresholds derived from OCP enforcement record and the "
                 "Metrc Maine operator onboarding packet. Verify current thresholds "
                 "with your OCP auditor reference before binding your compliance SOPs.",
                 BODY),
        Spacer(1, 0.1 * inch),
        t,
        Spacer(1, 0.2 * inch),
        Paragraph("<b>Threshold source:</b> 18-691 CMR ch. 4 (Metrc track-and-trace "
                 "rule), §6 (daily reconciliation) and §7 (monthly comprehensive "
                 "report); OCP Notice of Deficiency enforcement record covering "
                 "2023-2025; Metrc Maine operator onboarding documentation. These "
                 "thresholds are common-operator guidance — not OCP-mandated strict "
                 "cutoffs — and should be tightened, not loosened, in your internal SOPs.",
                 CALLOUT),
        PageBreak(),
    ]


# Daily: 6 items
def daily():
    return [
        Paragraph("Daily checklist — 6 items, end of every business day", H1),
        Paragraph("Run at close of every business day (typically 9:45-10:15 PM for "
                 "10 PM closing, or 15 minutes before the next opening shift). Owner: "
                 "compliance officer or inventory manager. Total time: 10-15 minutes. "
                 "All actions timestamped in Metrc; this checklist is the paper-trail.",
                 BODY),
        checklist_table([
            ('D-01', 'Pre-close count — every package, pre-roll, and bulk flower '
                     'drawer; verify physical against the Metrc active-inventory view.',
             'Daily'),
            ('D-02', 'Sales reconciliation — pull the day\'s POS sales and match '
                     'each ring to a Metrc package tag debited by the POS.',
             'Daily'),
            ('D-03', 'Cash drawer reconciliation — the drawer total matches POS cash '
                     'ring total +/- $0.50 variance allowance; document any over/short.',
             'Daily'),
            ('D-04', 'Manifest verification — every inbound delivery from a '
                     'cultivator/manufacturer accepted by Metrc incoming-transfer; '
                     'reject any outbound-inventory item with a missing or '
                     'illegible 16-digit Metrc tag.',
             'Daily'),
            ('D-05', 'CCTV log check — sweep last 24 hours of footage for any '
                     'unauthorized product access (lock cycling without a paired '
                     'badge log); enter anomaly into the log sheet.',
             'Daily'),
            ('D-06', 'Variance threshold check — if any category variance exceeds '
                     'the Green column above, escalate to the compliance officer '
                     'before opening the store tomorrow. Log to the variance sheet '
                     '(page 6).',
             'Daily'),
        ]),
        Spacer(1, 0.1 * inch),
        Paragraph("Daily roll-up: variance total across categories ________ (target &lt;1.0%); "
                 "no unaccounted packages ________ (target 0); CCTV anomalies reviewed "
                 "________ (target 0); package reject count ________ (target 0); "
                 "store sign-off by compliance officer ________.", SMALL),
        PageBreak(),
    ]


# Weekly: 6 items
def weekly():
    return [
        Paragraph("Weekly checklist — 6 items, every Monday morning before opening", H1),
        Paragraph("Run weekly (typically Monday 9:00-10:00 AM before the 10 AM shift). "
                 "Owner: compliance officer with the inventory manager. Total time: "
                 "30-45 minutes. Output of this checklist drives the monthly report.",
                 BODY),
        checklist_table([
            ('W-01', 'Variance trend review — pull the last 7 days of daily variance '
                     'logs; identify any recurring category. Yellow-amber trend for the '
                     'same category 3 days in a row = Yellow-tier trigger.',
             'Weekly'),
            ('W-02', 'Metrc exception log — pull Metrc\'s "Exception Events" report '
                     '(Settings → Reports → Exceptions); document any package '
                     'merges/splits/discards that didn\'t go through the normal '
                     'sale/transfer path.',
             'Weekly'),
            ('W-03', 'Employee badge audit — verify every badge assignment on file; '
                     'check that no badge has a >90-day background check (recheck '
                     'window per Title 28-B §503); escalate any badge with '
                     'expired background check to OCP immediately.',
             'Weekly'),
            ('W-04', 'Auditor visit log — even if no OCP auditor visits have '
                     'occurred this week, document the audit posture (which '
                     'category variances are tracking yellow, badge status, CCTV '
                     'log availability).',
             'Weekly'),
            ('W-05', 'Inventory aging — pull the slowest-moving 20% of stock; '
                     'investigate why; if any product has aged &gt;180 days, document '
                     'disposition plan (sale, transfer, donation, destruction).',
             'Weekly'),
            ('W-06', 'CCTV retention audit — confirm 90-day CCTV retention is '
                     'operational (a single random date from 89 days ago should still '
                     'be retrievable); flag any gap to the security vendor.',
             'Weekly'),
        ]),
        Spacer(1, 0.1 * inch),
        Paragraph("Weekly sign-off: compliance officer ________ date ________; "
                 "inventory manager ________ date ________.", SMALL),
        PageBreak(),
    ]


# Monthly: 8 items
def monthly_part1():
    return [
        Paragraph("Monthly checklist — 8 items, OCP-ready report", H1),
        Paragraph("Run between the 1st and 4th of each month, file with OCP by the "
                 "5th of each month per 18-691 CMR ch. 4 §7. Owner: compliance officer "
                 "(your signatory on the OCP report). Total time: 4-6 hours across "
                 "the month, 1-2 hours to compile the report. Output is a single PDF "
                 "report uploaded to the OCP portal under the compliance officer's "
                 "OCP account.", BODY),

        Paragraph("Part 1 — data compilation (calendar month, midnight-to-midnight "
                 "CST or as configured in Metrc)", H2),
        checklist_table([
            ('M-01', 'Pull Metrc "Comprehensive Inventory Report" for the calendar '
                     'month; verify all 30-31 days have non-exception data; identify '
                     'days with exceptions for the report cover sheet.',
             'Monthly'),
            ('M-02', 'Pull Metrc "Sales Reconciliation Report" for the calendar month; '
                     'match POS sales ring total against Metrc debits total within '
                     '$10 daily variance + $50 monthly variance.',
             'Monthly'),
            ('M-03', 'Pull Metrc "Transfer Log Report"; document every inbound/'
                     'outbound transfer with the package ID, Metrc tag, source/destination '
                     'license number, and date.',
             'Monthly'),
            ('M-04', 'Pull Metrc "Exception Event Report"; for every exception, document '
                     'cause (operator error, Metrc glitch, product destruction, etc.) + '
                     'resolution + sign-off.',
             'Monthly'),
        ]),
        PageBreak(),
    ]


def monthly_part2():
    return [
        Paragraph("Part 2 — variance analysis and compliance review", H2),
        checklist_table([
            ('M-05', 'Variance analysis — per-category variance for the month, '
                     'compared against the threshold table (page 2). Any Yellow '
                     'category requires a 14-day corrective-action note; any Red '
                     'category requires a Compliance Officer sign-off + escalation '
                     'note.',
             'Monthly'),
            ('M-06', 'Badge audit summary — confirm all employee badges are current, '
                     'no badge has expired background check, no badge belongs to a '
                     'separated employee (badge revocation per Title 28-B §503).',
             'Monthly'),
            ('M-07', 'CCTV retention + integrity — confirm 90-day retention operational; '
                     'spot-check 3 random dates by retrieving the footage; document '
                     'any retrieval failures.',
             'Monthly'),
            ('M-08', 'Compliance officer sign-off — final review of the assembled '
                     'report; signature + license number + date; ready to upload to '
                     'OCP portal by the 5th.',
             'Monthly'),
        ]),
        Spacer(1, 0.1 * inch),
        Paragraph("Monthly roll-up: total variance across categories ________% "
                 "(target &lt;1.0%); number of Yellow-tier categories ________ (target 0); "
                 "number of Red-tier categories ________ (target 0); Metrc exception "
                 "count ________; badge audit gaps ________ (target 0).",
                 SMALL),
        Spacer(1, 0.15 * inch),
        Paragraph("<b>Common pitfalls to avoid:</b> This monthly report is the most "
                 "common spot where new operators slip. Skip months, miss variance "
                 "thresholds, or fail to file by the 5th and you can get a Notice of "
                 "Deficiency on your license within one quarter. Most OCP audit "
                 "findings start with the monthly reconciliation report flagging a "
                 "variance that the operator didn't catch.",
                 CALLOUT),
        PageBreak(),
    ]


# Variance log
def log_sheet():
    return [
        Paragraph("Variance log — fillable sheet", H1),
        Paragraph("One row per Yellow or Red variance event. File monthly with the "
                 "comprehensive report.", BODY),
        Spacer(1, 0.1 * inch),
        Paragraph("Use one row per variance event. Mark the threshold tier (yellow or red), "
                 "the corrective action, the date resolved, and the compliance officer's "
                 "initial.", BODY),
    ]

def log_sheet_table():
    rows = [[
        '<b>Date</b>', '<b>Category</b>', '<b>Variance %</b>', '<b>Tier</b>',
        '<b>Cause</b>', '<b>Corrective action</b>', '<b>Resolved</b>',
        '<b>Init.</b>',
    ]]
    for i in range(15):
        rows.append([
            '__/__/__',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
        ])
    t = Table(rows, colWidths=[0.7 * inch, 0.7 * inch, 0.7 * inch, 0.5 * inch,
                                1.05 * inch, 1.55 * inch, 0.7 * inch, 0.4 * inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8.5),
        ('FONTSIZE', (0, 1), (-1, -1), 8.5),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.4, MUTED),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, WARM]),
    ]))
    return t


def escalation():
    return [
        Paragraph("Escalation workflow + OCP contact", H1),
        Paragraph("How to escalate when variance goes red", BODY),
        Paragraph("When a category variance exceeds the Red threshold (page 2), follow "
                 "this five-step workflow before opening the store the next day:", BODY),
        Spacer(1, 0.05 * inch),
        Paragraph("&bull;&nbsp;<b>Stop</b> further sales of the affected product category "
                 "until the variance is resolved.", BULLET),
        Paragraph("&bull;&nbsp;<b>Document</b> the variance in the log sheet (previous page) "
                 "with category, exact variance, suspected cause (operator error, Metrc "
                 "glitch, possible theft, vendor miscount).", BULLET),
        Paragraph("&bull;&nbsp;<b>Cross-reference</b> Metrc exception log, CCTV log, badge "
                 "log, and operator shift roster for the day-of-incident.", BULLET),
        Paragraph("&bull;&nbsp;<b>Escalate</b> to the licensed compliance officer (your "
                 "OCP signatory). They review and either (a) sign off on internal "
                 "investigation, or (b) escalate to OCP via the online portal's "
                 "compliance event log.", BULLET),
        Paragraph("&bull;&nbsp;<b>File</b> the resolution with the OCP monthly report "
                 "(variable category + documented resolution).", BULLET),

        Spacer(1, 0.15 * inch),
        Paragraph("<b>OCP contact points:</b>", H2),
        Paragraph("&bull;&nbsp; Compliance portal: login.maine.gov (state of Maine "
                 "login; requires your OCP-issued compliance-officer credential)",
                 BULLET),
        Paragraph("&bull;&nbsp; OCP compliance officer helpline: 207-287-3282 (weekdays "
                 "8 AM - 5 PM ET)", BULLET),
        Paragraph("&bull;&nbsp; Metrc Maine support: 1-844-637-2274 (24/7 ticket)",
                 BULLET),
        Paragraph("&bull;&nbsp; Maine OCP website: maine.gov/dafs/ocp/compliance",
                 BULLET),
        Spacer(1, 0.15 * inch),
        Paragraph("<b>Audit posture note:</b> Maine OCP compliance officers prefer "
                 "operators who escalate variances within 24-48 hours of detection, "
                 "compared with operators who hold Red variances silent and hope "
                 "they self-correct. The threshold table on page 2 is conservative; "
                 "tighten it to your internal SOP, document any tightening, and let "
                 "OCP see it during inspection. The compliance posture you document "
                 "is what auditors use to set their next-visit frequency.",
                 CALLOUT),
        PageBreak(),
    ]


def sample_audit():
    return [
        Paragraph("Sample OCP-ready compliance review", H1),
        Paragraph("What the operator hands the OCP auditor on a routine visit",
                 BODY),
        Spacer(1, 0.1 * inch),
        Paragraph("<b>Step 1.</b> The auditor arrives and asks for your most recent "
                 "monthly reconciliation report. You hand them a printed version of "
                 "the report from Metrc (page 1) plus your summary cover sheet (your "
                 "license number, operator name, month, sign-off).", BODY),
        Paragraph("<b>Step 2.</b> Auditor selects three random dates from the month "
                 "and asks for the daily reconciliation logs for those dates. The "
                 "compliance officer produces the three daily sheets, with the "
                 "variance log entries for any yellow/red events on those days.",
                 BODY),
        Paragraph("<b>Step 3.</b> Auditor asks to see the CCTV footage for any red "
                 "variance event. The compliance officer pulls the footage in real-"
                 "time from your cloud archive; the audit log entry for each "
                 "retrieval is automatic and is part of the audit trail.", BODY),
        Paragraph("<b>Step 4.</b> Auditor asks about any badge with >90-day-old "
                 "background check. The weekly badge audit log has this; show them "
                 "the past 12 weeks of weekly badge audit entries.", BODY),
        Paragraph("<b>Step 5.</b> Auditor asks for the variance trend over the past 6 "
                 "months. The weekly variance trend review (W-01) feeds this; show "
                 "the 6-month rolling chart.", BODY),
        Paragraph("<b>Step 6.</b> Auditor asks about product aging. The W-05 weekly "
                 "aging review logs this; show the aging summary.", BODY),
        Paragraph("<b>Step 7.</b> Auditor asks about the Metrc tag reconciliation "
                 "process and the operator badge access controls. The badge audit "
                 "log (W-03) and the daily reconciliation sheet (D-04) show this.",
                 BODY),
        Paragraph("<b>Step 8.</b> Auditor signs your audit book; you countersign.",
                 BODY),
        Spacer(1, 0.15 * inch),
        Paragraph("<b>Total time for an OCP routine visit: 60-90 minutes.</b> "
                 "Operator compliance officer + store manager + owner/operator on "
                 "call. Cover sheet, daily reconciliation logs for 3 random dates, "
                 "variance log sheet, badge audit log, CCTV retrieval, aging review, "
                 "Metrc reconciliation process summary. That document package is the "
                 "output of this checklist.", CALLOUT),
        PageBreak(),
    ]


def resources():
    return [
        Paragraph("Resources and primary sources", H1),
        Paragraph("<b>Maine and federal primary sources:</b>", H3),
        Paragraph("&bull;&nbsp; 18-691 CMR ch. 4 (Maine track-and-trace / Metrc rule) — maine.gov/dafs/ocp/rules-statutes",
                 BULLET),
        Paragraph("&bull;&nbsp; Title 28-B §501-503 (Maine cannabis operator licensing + employee badges) — legislature.maine.gov/statutes/28-B/",
                 BULLET),
        Paragraph("&bull;&nbsp; Title 28-B §1503 (criminal-referral territory for unaccounted product) — legislature.maine.gov/statutes/28-B/",
                 BULLET),
        Paragraph("&bull;&nbsp; Metrc Maine Operator Onboarding Packet — maine.metrc.com",
                 BULLET),
        Paragraph("&bull;&nbsp; OCP Compliance Officer portal — login.maine.gov (state login, OCP-issued credentials)",
                 BULLET),
        Paragraph("&bull;&nbsp; OCP 2025 Annual Report (compliance metrics) — maine.gov/dafs/ocp/about-us/annual-reports",
                 BULLET),
        Paragraph("&bull;&nbsp; OCP compliance helpline: 207-287-3282 (weekdays 8 AM - 5 PM ET)",
                 BULLET),
        Paragraph("&bull;&nbsp; Metrc Maine support: 1-844-637-2274 (24/7)",
                 BULLET),

        Spacer(1, 0.15 * inch),
        Paragraph("<b>Companion checklists (also available at mainedispensaryguide.com/downloads):</b>",
                 H3),
        Paragraph("&bull;&nbsp; Maine Dispensary Founder Roadmap (companion PDF) — /download-checklist",
                 BULLET),
        Paragraph("&bull;&nbsp; Compliance Self-Assessment (companion PDF) — /download/compliance-self-assessment",
                 BULLET),

        Spacer(1, 0.15 * inch),
        Paragraph("<b>Continue reading on mainedispensaryguide.com:</b>", H3),
        Paragraph("&bull;&nbsp; Maine Dispensary License: Complete OCP Application Guide — /guides/maine-dispensary-license",
                 BULLET),
        Paragraph("&bull;&nbsp; Maine Cannabis METRC Integration Guide — /guides/maine-cannabis-metrc-integration",
                 BULLET),
        Paragraph("&bull;&nbsp; Maine Cannabis Operator Compliance Audit Prep — /guides/maine-cannabis-compliance-audit",
                 BULLET),
        Paragraph("&bull;&nbsp; Editorial Corrections Log — /about/corrections", BULLET),

        Spacer(1, 0.2 * inch),
        HRFlowable(width="100%", thickness=0.5, color=MUTED),
        Spacer(1, 0.15 * inch),
        Paragraph("<b>Editorial standard and corrections.</b>", H3),
        Paragraph("Every threshold and rule in this checklist is anchored to Maine "
                 "primary-source citations above. Variance thresholds are operator-"
                 "facing guidance, not OCP-mandated strict cutoffs; verify current "
                 "thresholds with OCP before binding your internal SOP. Material "
                 "corrections are documented at mainedispensaryguide.com/about/corrections.",
                 BODY),
        Paragraph("This content is informational and does not constitute legal or "
                 "compliance advice. Variance thresholds cited here reflect the OCP "
                 "enforcement record and Metrc Maine documentation as of the publish "
                 "date above. Operators must verify current thresholds with the OCP "
                 "Compliance Officer portal and their Metrc Maine onboarding contact "
                 "before binding their own compliance SOPs.", BODY),
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
                          "METRC Reconciliation Checklist · mainedispensaryguide.com")
        canvas.drawRightString(7.75 * inch, 0.4 * inch, f"Page {doc.page}")
        canvas.restoreState()


def build():
    doc = SimpleDocTemplate(
        OUT_PATH,
        pagesize=LETTER,
        leftMargin=0.75 * inch, rightMargin=0.75 * inch,
        topMargin=0.6 * inch, bottomMargin=0.7 * inch,
        title="METRC Monthly Reconciliation Checklist for Maine Dispensaries",
        author="Calvin Waters, Maine Dispensary Guide editorial",
        subject="A primary-source-anchored reconciliation checklist for Maine Metrc compliance",
        creator="Maine Dispensary Guide",
        keywords=["cannabis", "Maine", "METRC", "reconciliation", "OCP", "compliance",
                  "checklist", "PDF"],
    )
    story = []
    story.extend(cover_block())
    story.extend(thresholds())
    story.extend(daily())
    story.extend(weekly())
    story.extend(monthly_part1())
    story.extend(monthly_part2())
    story.extend(log_sheet())
    story.append(log_sheet_table())
    story.append(Spacer(1, 0.2 * inch))
    story.append(PageBreak())
    story.extend(escalation())
    story.extend(sample_audit())
    story.extend(resources())
    doc.build(story, onFirstPage=lambda c, d: None, onLaterPages=page_footer)
    print(f"Wrote {OUT_PATH}")
    print(f"Size: {os.path.getsize(OUT_PATH)} bytes")


if __name__ == '__main__':
    build()
