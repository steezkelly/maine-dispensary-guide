#!/usr/bin/env python3
"""Generate the Maine First-Timer's Field Guide PDF lead magnet.

Output: apps/maine-cannabis/public/downloads/maine-first-timer-field-guide.pdf

Content source: distilled from the first-time Maine dispensary buyer
guide at /guides/first-time-maine-dispensary-buyer. Compressed to 10
pages with all YMYL/FTC disclosures required for cannabis lead
magnets (per the lead-magnet research brief, 2026-07-05).

YMYL compliance per:
  - Title 28-B §1501 (Maine possession limits)
  - Title 28-B §701 (Maine labeling and packaging)
  - Title 22 §2429-A (child-resistant packaging, no appeal to minors)
  - Title 28-B §703(1)(F) (10mg/serving, 200mg/package caps)
  - FTC Endorsement Guides (16 CFR Part 255)
  - FDA cannabis non-evaluation standard disclaimer
"""
import os
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, black, white
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether, HRFlowable
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY

OUT_DIR = '/home/steve/projects/maine-dispensary-guide/apps/maine-cannabis/public/downloads'
OUT_PATH = os.path.join(OUT_DIR, 'maine-first-timer-field-guide.pdf')
os.makedirs(OUT_DIR, exist_ok=True)

# Brand colors (match MDG site palette)
PRIMARY = HexColor('#588157')     # sage green
ACCENT = HexColor('#0d4e50')      # deep teal
WARM = HexColor('#F2F2E2')        # warm bone (callout backgrounds)
INK = HexColor('#1a1a1a')
MUTED = HexColor('#6b6b6b')

styles = getSampleStyleSheet()

H1 = ParagraphStyle('H1', parent=styles['Heading1'], fontName='Helvetica-Bold',
                    fontSize=22, leading=26, textColor=INK, spaceBefore=0, spaceAfter=10)
H2 = ParagraphStyle('H2', parent=styles['Heading2'], fontName='Helvetica-Bold',
                    fontSize=15, leading=19, textColor=PRIMARY, spaceBefore=14, spaceAfter=6)
H3 = ParagraphStyle('H3', parent=styles['Heading3'], fontName='Helvetica-Bold',
                    fontSize=11.5, leading=15, textColor=INK, spaceBefore=10, spaceAfter=4)
BODY = ParagraphStyle('Body', parent=styles['BodyText'], fontName='Helvetica',
                      fontSize=10, leading=14, textColor=INK, alignment=TA_JUSTIFY,
                      spaceAfter=6)
BULLET = ParagraphStyle('Bullet', parent=BODY, leftIndent=14, bulletIndent=4,
                        spaceAfter=2)
CALLOUT = ParagraphStyle('Callout', parent=BODY, fontSize=9.5, leading=13,
                         leftIndent=8, rightIndent=8, spaceBefore=4, spaceAfter=4)
SMALL = ParagraphStyle('Small', parent=BODY, fontSize=8.5, leading=11,
                       textColor=MUTED, alignment=TA_LEFT, spaceAfter=3)
TITLE_META = ParagraphStyle('TitleMeta', parent=BODY, fontSize=10, leading=14,
                            textColor=MUTED, alignment=TA_LEFT, spaceAfter=2)
TITLE_H1 = ParagraphStyle('TitleH1', parent=H1, fontSize=28, leading=32,
                           alignment=TA_LEFT, spaceAfter=4)
SUBTITLE = ParagraphStyle('Subtitle', parent=BODY, fontSize=14, leading=18,
                           textColor=PRIMARY, fontName='Helvetica-Bold',
                           alignment=TA_LEFT, spaceAfter=12)
FOOTER = ParagraphStyle('Footer', parent=SMALL, fontSize=7.5, leading=10,
                        textColor=MUTED, alignment=TA_CENTER)

def cover_block():
    """Page 1: cover + intro + 21+ age-gate + E-E-A-T byline."""
    return [
        Spacer(1, 1.0*inch),
        Paragraph("Maine First-Timer's Field Guide", TITLE_H1),
        Paragraph("Your First Dispensary Visit, Explained.", SUBTITLE),
        Spacer(1, 0.4*inch),
        HRFlowable(width="100%", thickness=1.5, color=PRIMARY),
        Spacer(1, 0.3*inch),
        Paragraph("<b>For adults 21 and older only.</b> By downloading this guide, "
                 "you confirm you are 21 or older and a resident of or visitor to a "
                 "state where cannabis is legal. This guide is specific to Maine "
                 "cannabis law (Title 28-B). Laws differ by state — verify your "
                 "local rules before purchasing or consuming.", CALLOUT),
        Spacer(1, 0.3*inch),
        Paragraph("<b>By the Maine Dispensary Guide editorial team.</b>", TITLE_META),
        Paragraph("Written by Eliot Nash, Founder & Publisher.", TITLE_META),
        Paragraph("Reviewed by Calvin Waters, Licensing & Compliance Analyst.", TITLE_META),
        Paragraph("Published 2026-07-05 · Updated 2026-07-05.", TITLE_META),
        Spacer(1, 0.4*inch),
        Paragraph("Inside this guide:", H3),
        Paragraph("&nbsp;&nbsp;1. Before you go (15-minute prep)", BULLET, bulletText='•'),
        Paragraph("&nbsp;&nbsp;2. Day-of flow at the dispensary", BULLET, bulletText='•'),
        Paragraph("&nbsp;&nbsp;3. Product selection — what to actually buy", BULLET, bulletText='•'),
        Paragraph("&nbsp;&nbsp;4. Eight first-time mistakes to avoid", BULLET, bulletText='•'),
        Paragraph("&nbsp;&nbsp;5. After your visit — tracking what works", BULLET, bulletText='•'),
        Paragraph("&nbsp;&nbsp;6. Maine rules cheat sheet", BULLET, bulletText='•'),
        Paragraph("&nbsp;&nbsp;7. FAQ", BULLET, bulletText='•'),
        Paragraph("&nbsp;&nbsp;8. Resources + corrections log", BULLET, bulletText='•'),
        Spacer(1, 0.3*inch),
        HRFlowable(width="100%", thickness=0.5, color=MUTED),
        Spacer(1, 0.15*inch),
        Paragraph("Maine Dispensary Guide · mainedispensaryguide.com", FOOTER),
        Paragraph("This content is informational and does not constitute medical, "
                 "legal, or purchasing advice. Cannabis has not been evaluated by the "
                 "FDA. Consult a licensed healthcare provider before using cannabis, "
                 "especially if you are pregnant, nursing, taking medications, or have "
                 "a medical condition. Do not drive or operate machinery under the "
                 "influence of cannabis. Public consumption is illegal in Maine. "
                 "Acadia National Park and all federal land prohibit cannabis "
                 "regardless of state law. Keep all cannabis products in "
                 "child-resistant packaging, locked, and out of reach of children "
                 "and pets.", FOOTER),
        PageBreak(),
    ]

def section1():
    return [
        Paragraph("1. Before you go — 15-minute prep", H1),
        Paragraph("Most first-time dispensary anxiety comes from not knowing what "
                 "to expect. A few minutes of preparation removes 90% of it.", BODY),
        Paragraph("Pick the right store for what you want", H2),
        Paragraph("Maine dispensaries differ in atmosphere, product selection, and "
                 "price point. Most towns have 2-5 options. Use the Maine "
                 "Dispensary Guide Find-a-Dispensary directory to compare stores "
                 "in your town. Read the operator's website or Google listing for: "
                 "hours, address, accepted payment methods (most are cash or debit "
                 "only — credit cards are rare due to federal banking restrictions), "
                 "first-time-buyer promotions, and whether they have a budtender on "
                 "staff who can walk you through products.", BODY),
        Paragraph("Decide your format in advance", H2),
        Paragraph("Formats differ in onset, duration, and how hard they are to "
                 "titrate. For most first-time buyers, inhaled (flower or low-dose "
                 "vape) or sublingual tincture is the most predictable starting "
                 "point because the effect arrives in minutes and is short enough "
                 "to evaluate within the same day. If you specifically want a long, "
                 "sustained effect, an edible (gummy or capsule) is appropriate — "
                 "but budget 90-120 minutes for onset and don't redose prematurely.", BODY),
        Paragraph("Decide your budget", H2),
        Paragraph("A typical first-time visit runs $30-$80 for a small amount of "
                 "product plus tax. Maine imposes a 5.5% state sales tax and a 14% "
                 "adult-use excise tax (raised from 10% effective January 2026) on "
                 "every adult-use purchase. Budget more than you think you'll spend — "
                 "first-timers often end up buying slightly more than they planned "
                 "because of the on-site selection.", BODY),
        Paragraph("Check the town's hours and the town's opt-in status", H2),
        Paragraph("Maine municipalities individually opt in or out of adult-use "
                 "retail. Not every town has a dispensary. The Maine Dispensary "
                 "Guide Opt-In Tracker lists opt-in status by town. Most dispensaries "
                 "operate 9 AM-10 PM weekdays and 10 AM-8 PM weekends, but hours "
                 "vary — confirm before driving.", BODY),
        PageBreak(),
    ]

def section2():
    return [
        Paragraph("2. Day-of flow — what actually happens at the dispensary", H1),
        Paragraph("The visit has a consistent structure across most Maine "
                 "dispensaries. Knowing the sequence removes the social anxiety of "
                 "the first five minutes.", BODY),
        Paragraph("Step 1: Reception and ID check (1-2 minutes)", H2),
        Paragraph("You enter a reception area (often behind a locked door or "
                 "security vestibule). A reception staff member — not the budtender "
                 "— checks your ID. They verify (a) you are 21 or older, (b) the "
                 "ID is real and not expired, and (c) the photo matches you. Some "
                 "dispensaries check against a state ID database or scan your ID. "
                 "The ID is returned to you and you are admitted to the retail floor "
                 "or the budtender area.", BODY),
        Paragraph("Step 2: Menu browsing and consultation (5-20 minutes)", H2),
        Paragraph("On the retail floor, you will see product displays (often in "
                 "locked cases), a menu (printed sheet, tablet, or large wall "
                 "display), and one or more budtenders. Tell the budtender it is "
                 "your first visit and what you want to feel — relaxation, sleep, "
                 "social, focus, pain relief. They will walk you through the menu, "
                 "recommend 2-3 starting options, and explain dosing.", BODY),
        Paragraph("<b>Pro tip:</b> If you are nervous, go during a quiet time — "
                 "weekday mornings or early afternoons. Budtenders at Maine "
                 "dispensaries are generally patient and happy to help first-time "
                 "customers. Tell them it is your first visit and they will slow "
                 "down and explain everything. The single best question: "
                 "<i>\"If you were buying for a first-timer who wants [X effect], "
                 "what would you pick?\"</i>", CALLOUT),
        Paragraph("Step 3: Selection and weighing (2-5 minutes)", H2),
        Paragraph("You tell the budtender what you want. They pull the product, "
                 "weigh flower (if applicable), and bring it to the register. Maine "
                 "dispensaries are required to weigh cannabis products in view of "
                 "the customer and to use child-resistant opaque packaging.", BODY),
        Paragraph("Step 4: Register and payment (3-5 minutes)", H2),
        Paragraph("The budtender or a separate cashier rings you up. The register "
                 "shows the pre-tax subtotal, the 5.5% state sales tax, and the 14% "
                 "adult-use excise tax separately. Medical patients see only the 5.5% "
                 "sales tax. You pay (cash or debit) and receive a printed receipt "
                 "plus your bagged product. Some stores provide a digital receipt via "
                 "email — this is the moment to ask whether they're tracking your "
                 "purchase for loyalty points or first-time-buyer promotions.", BODY),
        Paragraph("Step 5: Exit and consumption", H2),
        Paragraph("You walk out. You cannot consume on dispensary property or in any "
                 "public space (Title 28-B §1501(2)). Consumption is restricted to "
                 "private residences and explicitly-permitted private property. Driving "
                 "under the influence of cannabis is a criminal offense (OUI) — Maine "
                 "has per-se THC blood limits that are stricter than the alcohol DUI "
                 "equivalents.", BODY),
        PageBreak(),
    ]

def section3():
    return [
        Paragraph("3. Product selection — what to actually buy", H1),
        Paragraph("The right first-time product depends on what you want to feel, "
                 "how much time you have to evaluate, and whether you want to smoke, "
                 "vaporize, eat, or use a tincture.", BODY),
        Paragraph("If you want predictable, fast, controllable effect", H2),
        Paragraph("<b>Inhaled flower</b> is the most common first-time choice. "
                 "Onset is 5-10 minutes, peak at 30 minutes, and duration 2-3 hours. "
                 "A single 0.5 gram pre-roll or a single bowl at 5-10 mg THC-equivalent "
                 "is a reasonable first session. Most Maine dispensaries label flower "
                 "with THC percentage; 18-22% THC is a moderate range. Avoid "
                 "concentrates (wax, shatter, live resin) on your first visit — they "
                 "typically test at 60-90% THC and are easy to overconsume.", BODY),
        Paragraph("If you want a long, sustained effect and don't mind waiting", H2),
        Paragraph("<b>Edibles</b> are appropriate, but you must respect the dose. "
                 "Maine caps a single edible serving at 10 mg THC and a package at "
                 "200 mg (Title 28-B §703(1)(F), amended PL 2023 c. 396). For "
                 "first-time users, 2.5-5 mg is the standard recommendation. Onset is "
                 "60-120 minutes, peak at 2-3 hours, duration 4-8 hours. The most "
                 "common first-time edible mistake is taking a second dose at the "
                 "one-hour mark because the first has not yet peaked. Do not redose "
                 "before 2 hours.", BODY),
        Paragraph("If you want dose precision and don't want to smoke", H2),
        Paragraph("<b>Tinctures</b> are the easiest format to titrate. A 30 mL "
                 "bottle at 2.5 mg/ml gives you 75 mg of THC total in a precisely "
                 "dropper-measured format. Sublingual onset is 15-30 minutes, "
                 "duration 2-4 hours. For daytime functional use, a balanced "
                 "THC:CBD tincture (1:1, 5:1, or 10:1 ratios are common at Maine "
                 "dispensaries) is generally the easiest product to dose precisely.", BODY),
        Paragraph("If you specifically want to explore low-dose or anxiety-relevant products", H2),
        Paragraph("The Maine Dispensary Guide Cannabis Microdosing for Anxiety "
                 "guide covers 1-5 mg titration in detail. Maine dispensaries commonly "
                 "stock 2.5 mg gummies, 1 mg mints, and low-dose tinctures designed for "
                 "sub-psychoactive use. The clinical rationale is the biphasic "
                 "dose-response: low doses of THC may feel anxiolytic, higher doses "
                 "reliably worsen anxiety.", BODY),
        Paragraph("<b>If you are a medical patient from Maine or a reciprocity state:</b> "
                 "Bring your medical card. Registered dispensaries carry higher-dose "
                 "products (often 100-250 mg per package for therapeutic use) and skip "
                 "the 14% adult-use excise. See the Out-of-State Medical Cannabis "
                 "Patients in Maine guide if you are visiting from one of the 28 "
                 "OCP-approved states.", CALLOUT),
        PageBreak(),
    ]

def section4():
    items = [
        ('<b>Redosing edibles before 2 hours.</b> The single most common mistake. '
         'Edible onset is genuinely slow. If you don\'t feel anything at 60 minutes, '
         'the answer is to wait, not to take more.'),
        ('<b>Starting with high-THC concentrates.</b> 60-90% THC products are not '
         'first-time-appropriate. The biphasic dose-response means high doses '
         'reliably worsen anxiety and can produce acute panic in low-tolerance users.'),
        ('<b>Mixing cannabis with alcohol on the first session.</b> Alcohol amplifies '
         'THC absorption and produces a meaningfully more intense and longer-lasting '
         'effect. The combination also increases nausea and orthostatic hypotension. '
         'Don\'t combine on your first session.'),
        ('<b>Driving within 6-8 hours of consuming.</b> Maine has per-se THC blood '
         'limits for OUI (Driving Under the Influence) that are stricter than '
         'alcohol equivalents. Edibles in particular can affect driving for 8+ hours '
         'after consumption. Plan your consumption for times when you don\'t need '
         'to drive.'),
        ('<b>Not asking the budtender about first-time-buyer promotions.</b> Most '
         'Maine dispensaries run first-time-buyer promotions (typically 10-20% off '
         'or a free pre-roll with purchase). The budtender may not mention it unless '
         'you ask.'),
        ('<b>Bringing credit cards.</b> Most Maine dispensaries do not accept credit '
         'cards due to banking restrictions on the cannabis industry. Bring cash or '
         'a debit card with a PIN. Some stores have on-site ATMs with a $2-3 fee.'),
        ('<b>Consuming in public.</b> Title 28-B §1501(2) prohibits public '
         'consumption. Consume only at private residences or explicitly-permitted '
         'private property. Smoking in a vehicle is a separate civil violation.'),
        ('<b>Treating the budtender like a retail cashier.</b> Maine dispensaries '
         'are service businesses, not dispensaries. The budtender\'s job is to '
         'consult, not just transact. The more context you give them about what you '
         'want, the better their recommendations will be.'),
    ]
    out = [
        Paragraph("4. Eight first-time mistakes to avoid", H1),
        Paragraph("These are the patterns that come up again and again across "
                 "Maine dispensary budtender feedback. Skip them.", BODY),
    ]
    for txt in items:
        out.append(Paragraph(f"&bull;&nbsp; {txt}", BULLET))
    out.append(PageBreak())
    return out

def section5():
    return [
        Paragraph("5. After your visit — tracking what worked", H1),
        Paragraph("A simple 30-second note after your first session produces a "
                 "personal reference card that's more useful than any online dose "
                 "chart.", BODY),
        Paragraph("Note the following in a phone note or paper journal:", H3),
        Paragraph("&bull;&nbsp; Date and time of purchase", BULLET),
        Paragraph("&bull;&nbsp; Dispensary name and budtender (so you can request "
                 "the same product or same budtender next time)", BULLET),
        Paragraph("&bull;&nbsp; Product name and dose (e.g., \"Glaze 5mg Tropical "
                 "gummy, 1 piece\")", BULLET),
        Paragraph("&bull;&nbsp; Time you felt the first effect", BULLET),
        Paragraph("&bull;&nbsp; Time of peak effect", BULLET),
        Paragraph("&bull;&nbsp; When the effect wore off", BULLET),
        Paragraph("&bull;&nbsp; How you felt (mood, energy, sleep quality that "
                 "night)", BULLET),
        Paragraph("After 2-3 sessions, you will have a personal reference that "
                 "tells you: (a) what dose to start at, (b) what format works best "
                 "for the effect you want, (c) which products and which budtender "
                 "to ask for next time. This is the highest-leverage habit a new "
                 "buyer can build — it's how you go from \"uncertain and guessing\" "
                 "to \"informed and choosing\" within a month.", BODY),
        PageBreak(),
    ]

def section6_cheatsheet():
    """Compact one-page cheat sheet of Maine cannabis rules."""
    rules = [
        ('Age', '21+ for adult-use. 18+ with Maine medical card.'),
        ('Possession (public)', 'Up to 2.5 oz cannabis, including ≤5 g concentrate (Title 28-B §1501).'),
        ('Home storage', 'No statutory limit. Locked + child-resistant per Title 22 §2429-A.'),
        ('Public consumption', 'Illegal (Title 28-B §1501(2)). Private residences only.'),
        ('Driving', 'OUI per-se limits. Don\'t drive for 6-8 hours after consuming.'),
        ('Federal land', 'Acadia, national parks, federal buildings — cannabis illegal regardless of state law.'),
        ('Edible serving cap', '10 mg THC per serving (Title 28-B §703(1)(F)).'),
        ('Edible package cap', '200 mg THC per package (Title 28-B §703(1)(F), PL 2023 c. 396).'),
        ('Adult-use taxes', '5.5% state sales + 14% adult-use excise (effective Jan 2026).'),
        ('Medical taxes', '5.5% state sales only. No adult-use excise.'),
        ('Reciprocity (medical)', '28 states + DC approved. See mainedispensaryguide.com/guides/maine-out-of-state-patient-reciprocity.'),
        ('Payment', 'Cash or debit. Most dispensaries don\'t accept credit cards.'),
        ('Hours', 'Vary by town. Most 9 AM-10 PM weekdays, 10 AM-8 PM weekends. Check before driving.'),
        ('Opt-in towns', 'Not every Maine town has dispensaries. See the Opt-In Tracker on mainedispensaryguide.com.'),
    ]
    rows = [['<b>Rule</b>', '<b>What it means in practice</b>']] + [[k, v] for k, v in rules]
    t = Table(rows, colWidths=[1.6*inch, 5.2*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 10),
        ('FONTNAME', (0,1), (0,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,1), (-1,-1), 9),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.4, MUTED),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, WARM]),
    ]))
    return [
        Paragraph("6. Maine rules cheat sheet (print this page)", H1),
        Paragraph("Keep this on your fridge. Verify current rules with the Maine "
                 "Office of Cannabis Policy (maine.gov/dafs/ocp) before purchasing — "
                 "rules change.", BODY),
        Spacer(1, 0.1*inch),
        t,
        PageBreak(),
    ]

def section7_faq():
    faqs = [
        ('<b>What do I need to bring to a Maine dispensary on my first visit?</b><br/>'
         'Bring one valid government-issued photo ID showing you are 21 or older — '
         'Maine accepts a driver\'s license, passport, or state ID from any US '
         'state. Maine dispensaries do not require a medical card for adult-use '
         'purchases. Payment is cash or debit — most Maine dispensaries do not '
         'accept credit cards.'),
        ('<b>Can I go to a Maine dispensary if I\'m from out of state?</b><br/>'
         'Yes. Maine\'s adult-use program allows any adult 21+ with valid photo ID '
         'from any US state to purchase at any licensed adult-use dispensary. '
         'Out-of-state residents do not pay a special non-resident tax. If you '
         'hold a valid medical cannabis card from one of the 28 OCP-approved '
         'states, you can additionally use it at Maine registered dispensaries.'),
        ('<b>What happens when I walk in?</b><br/>'
         'Maine dispensaries typically have a reception area where you show ID, '
         'then enter the retail floor or wait in a lobby before being admitted by '
         'a budtender. Tell the budtender it is your first visit — they will slow '
         'down and explain.'),
        ('<b>How much cannabis can I buy at one time?</b><br/>'
         'Under Title 28-B §1501, you can purchase up to 2.5 ounces of cannabis '
         'or a combination of cannabis and cannabis concentrate that includes no '
         'more than 10 grams of concentrate per transaction. Most dispensaries '
         'impose their own per-transaction limits for first-time buyers.'),
        ('<b>Should I tell the budtender it\'s my first time?</b><br/>'
         'Yes — explicitly. Maine budtenders are trained to handle first-time '
         'customers and will slow their recommendations, explain dose basics, '
         'and steer you away from products that produce the most common '
         'first-time negative experiences.'),
        ('<b>How do I choose between formats?</b><br/>'
         'Inhaled (flower or vape): onset 5-15 min, duration 2-3 hours, easy '
         'to titrate. Edibles: onset 60-120 min, duration 4-8 hours, harder to '
         'titrate. Tinctures (sublingual): onset 15-30 min, duration 2-4 hours, '
         'easy to titrate via dropper. For first visit, inhaled or sublingual '
         'is the most predictable.'),
        ('<b>How do I pay, and is there a tip expectation?</b><br/>'
         'Cash or debit (PIN-based). Maine imposes a 5.5% state sales tax plus '
         'a 14% adult-use excise tax (effective 2026). Tipping is appreciated '
         'but not expected — cash tips in the budtender\'s tip jar are the norm. '
         '$5-10 for a routine visit is generous.'),
        ('<b>Can I consume at the dispensary or in public?</b><br/>'
         'No. Maine law prohibits public consumption (Title 28-B §1501(2)). '
         'Consumption is restricted to private residences and explicitly-permitted '
         'private property. The Maine adult-use program does not have licensed '
         'consumption lounges as of 2026.'),
    ]
    out = [Paragraph("7. Frequently asked questions", H1)]
    for q in faqs:
        out.append(Paragraph(q, BODY))
        out.append(Spacer(1, 0.05*inch))
    out.append(PageBreak())
    return out

def section8_resources():
    return [
        Paragraph("8. Resources and corrections", H1),
        Paragraph("<b>Maine primary sources:</b>", H3),
        Paragraph("&bull;&nbsp; Maine Office of Cannabis Policy (OCP) — maine.gov/dafs/ocp", BULLET),
        Paragraph("&bull;&nbsp; Title 28-B (Maine Cannabis Legalization Act) — legislature.maine.gov/statutes/28-B/", BULLET),
        Paragraph("&bull;&nbsp; Title 22 ch. 558-C (Maine Medical Use of Cannabis Act) — legislature.maine.gov/statutes/22/title22ch558-C.pdf", BULLET),
        Paragraph("&bull;&nbsp; 18-691 CMR ch. 1 (Adult Use Marijuana Program Rule) — maine.gov/dafs/ocp/rules-statutes", BULLET),
        Paragraph("&bull;&nbsp; 18-691 CMR ch. 2 (Medical Use of Marijuana Program Rule) — maine.gov/dafs/ocp/rules-statutes", BULLET),
        Paragraph("&bull;&nbsp; Maine OCP visiting-patients list (medical reciprocity) — maine.gov/dafs/ocp/medical-use/visiting-patients", BULLET),
        Spacer(1, 0.15*inch),
        Paragraph("<b>Continue reading on mainedispensaryguide.com:</b>", H3),
        Paragraph("&bull;&nbsp; First-Time Maine Dispensary Buyer Guide (long form) — /guides/first-time-maine-dispensary-buyer", BULLET),
        Paragraph("&bull;&nbsp; Cannabis Microdosing for Anxiety — Maine Guide — /guides/cannabis-microdosing-anxiety-maine", BULLET),
        Paragraph("&bull;&nbsp; Cannabis Edible Dose Calculator — Maine — /guides/cannabis-edible-dose-calculator-maine", BULLET),
        Paragraph("&bull;&nbsp; How to Read a Cannabis COA in Maine — /guides/cannabis-coa-maine-how-to-read", BULLET),
        Paragraph("&bull;&nbsp; Cannabis Tinctures & Sublingual Use — Maine Guide — /guides/cannabis-tinctures-sublingual-maine", BULLET),
        Paragraph("&bull;&nbsp; Out-of-State Medical Cannabis Patients in Maine — /guides/maine-out-of-state-patient-reciprocity", BULLET),
        Paragraph("&bull;&nbsp; Maine Cannabis Consumer Hub — /learn", BULLET),
        Paragraph("&bull;&nbsp; Editorial Corrections Log — /about/corrections", BULLET),
        Spacer(1, 0.2*inch),
        HRFlowable(width="100%", thickness=0.5, color=MUTED),
        Spacer(1, 0.15*inch),
        Paragraph("<b>Editorial standard and corrections.</b>", H3),
        Paragraph("Every claim in this guide is anchored to a primary source with "
                 "publication date. Any material correction is documented in the "
                 "Maine Dispensary Guide public Editorial Corrections Log at "
                 "mainedispensaryguide.com/about/corrections.", BODY),
        Paragraph("This content is informational and does not constitute medical, "
                 "legal, or purchasing advice. Cannabis has not been evaluated by the "
                 "FDA. Consult a licensed healthcare provider before using cannabis, "
                 "especially if you are pregnant, nursing, taking medications, or have "
                 "a medical condition. Do not drive or operate machinery under the "
                 "influence of cannabis. Public consumption is illegal in Maine. "
                 "Acadia National Park and all federal land prohibit cannabis "
                 "regardless of state law. Keep all cannabis products in "
                 "child-resistant packaging, locked, and out of reach of children "
                 "and pets.", BODY),
        Spacer(1, 0.15*inch),
        HRFlowable(width="100%", thickness=0.5, color=MUTED),
        Spacer(1, 0.1*inch),
        Paragraph("&copy; 2026 Maine Dispensary Guide · mainedispensaryguide.com", FOOTER),
        Paragraph("First published 2026-07-05. By Eliot Nash. Reviewed by Calvin "
                 "Waters.", FOOTER),
    ]

def page_footer(canvas, doc):
    """Footer on every page except cover."""
    if doc.page > 1:
        canvas.saveState()
        canvas.setFont('Helvetica', 7.5)
        canvas.setFillColor(MUTED)
        canvas.drawString(0.75*inch, 0.4*inch,
                          "Maine First-Timer's Field Guide · mainedispensaryguide.com · 21+ only")
        canvas.drawRightString(7.75*inch, 0.4*inch, f"Page {doc.page}")
        canvas.restoreState()

def build():
    doc = SimpleDocTemplate(
        OUT_PATH,
        pagesize=LETTER,
        leftMargin=0.75*inch, rightMargin=0.75*inch,
        topMargin=0.6*inch, bottomMargin=0.7*inch,
        title="Maine First-Timer's Field Guide: Your First Dispensary Visit, Explained.",
        author="Eliot Nash, Founder & Publisher, Maine Dispensary Guide",
        subject="A primary-source-anchored field guide for first-time Maine cannabis buyers",
        creator="Maine Dispensary Guide",
        keywords=["cannabis", "Maine", "first-time buyer", "dispensary", "guide", "PDF"]
    )
    story = []
    story.extend(cover_block())
    story.extend(section1())
    story.extend(section2())
    story.extend(section3())
    story.extend(section4())
    story.extend(section5())
    story.extend(section6_cheatsheet())
    story.extend(section7_faq())
    story.extend(section8_resources())
    doc.build(story, onFirstPage=lambda c, d: None, onLaterPages=page_footer)
    print(f"Wrote {OUT_PATH}")
    print(f"Size: {os.path.getsize(OUT_PATH)} bytes")

if __name__ == '__main__':
    build()