export type ReferralKind = 'cash-referral' | 'customer-credit' | 'partner-application' | 'none';

export interface SoftwareSource {
  title: string;
  url: string;
  accessed: string;
}

export interface SoftwareFaq {
  question: string;
  answer: string;
}

export interface SoftwareSection {
  id: string;
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface SoftwareComparisonRow {
  name: string;
  bestFor: string;
  notes: string;
  profileSlug?: string;
  officialUrl?: string;
}

export interface ReferralStatus {
  kind: ReferralKind;
  summary: string;
  officialUrl?: string;
  mdgRelationship: 'inactive';
}

export interface SoftwareEvidence {
  pricingStatus: string;
  publicEvidence: string[];
  evaluationStatus: string;
}

export interface SoftwareEntry {
  slug: string;
  kind: 'category' | 'vendor';
  title: string;
  description: string;
  eyebrow: string;
  answer: string;
  sections: SoftwareSection[];
  comparison?: SoftwareComparisonRow[];
  faqs: SoftwareFaq[];
  sources: SoftwareSource[];
  reviewedDate: string;
  relatedSlugs: string[];
  officialUrl?: string;
  referral?: ReferralStatus;
  evidence?: SoftwareEvidence;
}

const reviewedDate = '2026-07-21';
const source = (title: string, url: string): SoftwareSource => ({ title, url, accessed: reviewedDate });

export function formatReviewMonth(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

export const softwareEntries: SoftwareEntry[] = [
  {
    slug: 'cannabis-crm-loyalty',
    kind: 'category',
    title: 'Cannabis CRM & Loyalty Software for Maine Dispensaries',
    description: 'Compare cannabis CRM, loyalty, SMS, email, and customer-data platforms for Maine dispensaries, including AIQ, springbig, and Happy Cabbage.',
    eyebrow: 'Operator software guide',
    answer: 'Cannabis CRM and loyalty software helps a dispensary turn transaction data into consent-based customer segments, rewards, email, SMS, and retention campaigns. Maine operators should start with POS compatibility, consent controls, deliverability, and total messaging cost—not the longest feature list.',
    sections: [
      {
        id: 'what-it-does',
        heading: 'What cannabis CRM software actually does',
        paragraphs: [
          'A cannabis CRM sits between a retailer’s transaction history and its customer communications. It can maintain loyalty balances, group shoppers by behavior, automate post-purchase messages, and measure whether campaigns lead to repeat visits.',
          'It is not a substitute for the dispensary POS. The POS remains the transaction and inventory system; the CRM receives customer and purchase data through an integration. Operators should confirm which system controls discounts, loyalty redemption, consent records, and customer-profile corrections before signing.',
        ],
        bullets: [
          'Consent capture and opt-out handling for SMS and email.',
          'POS integration depth and customer-record matching.',
          'Segmentation by visit, category, spend, and recency.',
          'Loyalty rules, rewards liability, and redemption workflow.',
          'Per-message costs, short-code requirements, and support coverage.',
        ],
      },
      {
        id: 'maine-buying-checklist',
        heading: 'Maine operator buying checklist',
        paragraphs: [
          'A single-store Maine retailer may not need an enterprise customer-data platform on day one. First establish whether the POS already includes acceptable loyalty, email, and customer reporting. A separate CRM makes more sense when the retailer has a meaningful opted-in audience, needs automated retention work, or operates multiple locations.',
          'Ask every vendor to demonstrate the exact workflow using the POS you intend to run. A logo in an integration directory does not prove that loyalty balances, discounts, consent fields, and campaign revenue all sync in both directions.',
        ],
        bullets: [
          'Show a live redemption from CRM offer to POS receipt.',
          'Explain how duplicate customer records are merged.',
          'Separate software fees from SMS, email, wallet, and onboarding charges.',
          'Document data export and termination procedures before launch.',
        ],
      },
      {
        id: 'shortlist',
        heading: 'Platforms to put on the demo list',
        paragraphs: [
          'AIQ and springbig are established cannabis-specific customer-engagement platforms. Happy Cabbage approaches retention through analytics and targeted marketing. The right shortlist depends on POS compatibility, operator size, campaign staffing, and whether ecommerce is expected in the same suite.',
          'MDG has not completed hands-on testing of these products. The comparison below summarizes public product positioning and the questions a Maine operator should verify directly.',
        ],
      },
    ],
    comparison: [
      { name: 'AIQ', bestFor: 'Retailers seeking loyalty, marketing, analytics, data operations, and ecommerce in a connected suite.', notes: 'Formerly Alpine IQ; Dispense is now AIQ Ecommerce. Confirm the exact modules and POS integrations in the quote.', profileSlug: 'aiq' },
      { name: 'springbig', bestFor: 'Retailers prioritizing loyalty, SMS, customer wallets, and repeat-visit campaigns.', notes: 'Cannabis-specific CRM and loyalty platform. Confirm message pricing and the POS fields available to campaigns.', officialUrl: 'https://springbig.com/' },
      { name: 'Happy Cabbage', bestFor: 'Operators who want customer analytics and targeted retention recommendations.', notes: 'Public positioning emphasizes retail analytics and marketing decisions. Confirm campaign execution and integration scope.', officialUrl: 'https://www.happycabbage.io/' },
    ],
    faqs: [
      { question: 'Does a Maine dispensary need both a POS and a CRM?', answer: 'Usually the POS is essential and the separate CRM is optional. Add a CRM when the POS loyalty tools no longer support the segmentation, messaging, attribution, or multi-location workflows you need.' },
      { question: 'Is a dispensary CRM the same as a website CMS?', answer: 'No. A CRM manages customer relationships and communications. A CMS manages website content. Cannabis ecommerce platforms may provide menu and website tools, but they perform a different job from a CRM.' },
      { question: 'What should an operator verify before choosing cannabis loyalty software?', answer: 'Verify POS compatibility, consent and opt-out handling, loyalty redemption, customer-record matching, export rights, onboarding cost, message fees, and who owns campaign execution.' },
    ],
    sources: [
      source('AIQ product suite', 'https://aiq.com/'),
      source('springbig features and platform', 'https://springbig.com/'),
      source('Happy Cabbage retail platform', 'https://www.happycabbage.io/'),
    ],
    reviewedDate,
    relatedSlugs: ['aiq', 'dispensary-ecommerce-menus'],
  },
  {
    slug: 'dispensary-ecommerce-menus',
    kind: 'category',
    title: 'Dispensary Ecommerce & Online Menu Platforms for Maine',
    description: 'Compare online menu, ordering, pickup, delivery, and dispensary ecommerce platforms for Maine cannabis retailers.',
    eyebrow: 'Operator software guide',
    answer: 'Dispensary ecommerce software publishes live inventory as a searchable menu and accepts pickup or delivery orders, usually through a POS integration. Maine operators should compare menu ownership, website SEO, checkout friction, inventory-sync speed, payment options, and whether customer data remains portable.',
    sections: [
      {
        id: 'platform-models',
        heading: 'Marketplace, embedded menu, or owned storefront',
        paragraphs: [
          'Cannabis ecommerce is sold in several shapes. A marketplace can supply discovery but keeps the shopper inside a third-party environment. An embedded menu lives on the dispensary site but may still be rendered and controlled by the vendor. A more native storefront gives the operator greater control over branding, content, analytics, and search visibility.',
          'The operator should ask who owns the domain experience, customer relationship, analytics history, product URLs, and structured data. Switching becomes harder when the menu, loyalty program, mobile app, and customer records are bundled under one vendor.',
        ],
        bullets: [
          'Inventory latency and out-of-stock prevention.',
          'Pickup, delivery, order throttling, and fulfillment workflow.',
          'First-party domain, product-page indexing, and analytics access.',
          'POS, CRM, loyalty, payments, and mobile-app integrations.',
          'Data export, cancellation, and storefront migration terms.',
        ],
      },
      {
        id: 'maine-operations',
        heading: 'Questions specific to a Maine retail operation',
        paragraphs: [
          'Operators should make the vendor demonstrate age-gating, pickup status changes, inventory reservations, tax display, discount handling, and any delivery workflow they intend to use. A national platform may support Maine generally while leaving individual workflows dependent on the selected POS and payment stack.',
          'MDG does not treat marketplace reach as a substitute for an owned website. A retailer may use both, but the owned site should remain the durable source for location, hours, policies, educational content, and organic search visibility.',
        ],
      },
      {
        id: 'shortlist',
        heading: 'Common platforms to evaluate',
        paragraphs: [
          'Dutchie and Jane are widely visible cannabis commerce platforms. AIQ Ecommerce, formerly Dispense, emphasizes an operator-owned ecommerce experience connected to AIQ’s broader retail suite. Weedmaps combines marketplace discovery and online ordering. POS vendors such as Flowhub and Cova also offer ecommerce options that may simplify the stack.',
          'A demo should use a real catalog and a realistic busy-hour workflow. Operators should compare the complete cost after ecommerce, POS, loyalty, messaging, payments, implementation, and multi-location charges are included.',
        ],
      },
    ],
    comparison: [
      { name: 'Dutchie Ecommerce', bestFor: 'Retailers evaluating a broad commerce ecosystem alongside POS and payments.', notes: 'Confirm whether the selected package is marketplace, embedded, or owned-domain commerce and what data exports are available.', profileSlug: 'dutchie' },
      { name: 'Jane', bestFor: 'Retailers that value marketplace discovery and online ordering.', notes: 'Confirm website ownership, menu rendering, integration scope, and the role of Jane’s marketplace in customer acquisition.', officialUrl: 'https://www.iheartjane.com/' },
      { name: 'AIQ Ecommerce', bestFor: 'Retailers seeking ecommerce connected to loyalty, marketing, analytics, and customer data.', notes: 'Formerly Dispense. Confirm the modules required and whether the POS integration supports the intended workflow.', profileSlug: 'aiq' },
      { name: 'Weedmaps', bestFor: 'Retailers seeking consumer marketplace visibility in addition to ordering.', notes: 'Evaluate listing economics separately from owned-site ecommerce and organic-search goals.', officialUrl: 'https://weedmaps.com/business' },
    ],
    faqs: [
      { question: 'Can a Maine dispensary sell cannabis through a normal ecommerce platform?', answer: 'Ordinary ecommerce software is usually not designed for regulated cannabis inventory, age restrictions, POS synchronization, or cannabis payment constraints. Operators generally use a cannabis-specific menu and ordering platform connected to their retail stack.' },
      { question: 'Should the online menu live on the dispensary website?', answer: 'An owned-domain experience generally gives the operator more control over branding, analytics, content, and search visibility. The technical implementation still needs reliable inventory and order synchronization with the POS.' },
      { question: 'What is the biggest ecommerce switching risk?', answer: 'The biggest risk is bundling menu, customer data, loyalty, analytics, and product URLs in a way that cannot be cleanly exported or migrated. Ask for termination and export procedures before signing.' },
    ],
    sources: [
      source('Dutchie ecommerce for dispensaries', 'https://business.dutchie.com/ecommerce'),
      source('Jane cannabis ecommerce platform', 'https://www.iheartjane.com/business'),
      source('AIQ Ecommerce', 'https://www.dispenseapp.com/'),
      source('Weedmaps for business', 'https://weedmaps.com/business'),
    ],
    reviewedDate,
    relatedSlugs: ['dutchie', 'aiq', 'flowhub', 'cova', 'cannabis-crm-loyalty'],
  },
  {
    slug: 'seed-to-sale-erp',
    kind: 'category',
    title: 'Seed-to-Sale & Cannabis ERP Software for Maine Operators',
    description: 'Compare cannabis cultivation, manufacturing, distribution, inventory, and ERP systems for Maine operators, including Canix, Flourish, and Distru.',
    eyebrow: 'Operator software guide',
    answer: 'Seed-to-sale and cannabis ERP platforms help cultivators, manufacturers, distributors, and vertically integrated operators manage production, inventory, costing, orders, and compliance data. They complement—not replace—the regulatory system, accounting controls, and operating procedures required in Maine.',
    sections: [
      {
        id: 'system-boundaries',
        heading: 'ERP, operational inventory, and regulatory tracking are different layers',
        paragraphs: [
          'Metrc is the regulatory inventory system used for Maine’s adult-use program. An ERP or cultivation platform can provide richer production planning, costing, purchasing, sales, and operational reporting while exchanging required data with the regulatory layer.',
          'The operator remains responsible for accurate records and compliant workflows. A software integration can reduce duplicate entry, but it cannot guarantee that packages, transfers, waste, harvests, or adjustments are correct.',
        ],
        bullets: [
          'Cultivation planning, plant and batch workflow.',
          'Manufacturing bills of material, yields, and costing.',
          'Inventory, purchasing, sales orders, and wholesale fulfillment.',
          'Metrc workflow and exception reconciliation.',
          'Accounting, ecommerce, lab, and hardware integrations.',
        ],
      },
      {
        id: 'fit',
        heading: 'Who needs a separate cannabis ERP',
        paragraphs: [
          'A small retailer may be adequately served by its POS, accounting package, and disciplined reconciliation process. A separate ERP becomes more compelling for cultivation, manufacturing, distribution, wholesale, vertical integration, multiple facilities, or complex cost accounting.',
          'Operators should map the current process before selecting software. If teams cannot agree which system owns product, batch, customer, vendor, and cost data, adding another platform can increase discrepancies instead of reducing them.',
        ],
      },
      {
        id: 'evaluation',
        heading: 'Evaluate the real workflow, not the demo dashboard',
        paragraphs: [
          'Ask vendors to demonstrate a complete Maine-relevant transaction: source material, production step, inventory conversion, test status, sale or transfer, adjustment, and reconciliation. Include the staff members who will perform the work every day.',
          'Confirm implementation staffing, data migration, barcode and scale support, offline behavior, role permissions, audit history, export format, and support escalation. Quote-only pricing should be compared on an all-in annual basis.',
        ],
      },
    ],
    comparison: [
      { name: 'Canix', bestFor: 'Cultivation, manufacturing, and vertically integrated operators seeking operational and compliance workflows.', notes: 'Public positioning includes cultivation, manufacturing, inventory, sales, and compliance integrations. Confirm Maine program support directly.', profileSlug: 'canix' },
      { name: 'Flourish', bestFor: 'Operators evaluating a broad supply-chain platform across cultivation, manufacturing, distribution, and retail.', notes: 'Confirm which modules, state integrations, and implementation services are included in the quote.', profileSlug: 'flourish' },
      { name: 'Distru', bestFor: 'Manufacturers and distributors emphasizing inventory, orders, production, and accounting workflows.', notes: 'Confirm current Maine/Metrc availability and exact integration scope before shortlisting.', officialUrl: 'https://www.distru.com/' },
    ],
    faqs: [
      { question: 'Is Metrc a cannabis ERP?', answer: 'No. Metrc is a regulatory track-and-trace system. An ERP can add production, costing, purchasing, sales, forecasting, and operational reporting around the regulatory record.' },
      { question: 'Does software guarantee OCP compliance?', answer: 'No. Software can support recordkeeping and integrations, but the licensed operator remains responsible for accurate inventory, required reporting, staff procedures, and regulatory compliance.' },
      { question: 'Does a dispensary-only operator need Canix or Flourish?', answer: 'Not necessarily. A retailer may be better served by a strong POS, accounting controls, and reconciliation procedures. ERP value rises with cultivation, manufacturing, wholesale, multiple facilities, and complex costing.' },
    ],
    sources: [
      source('Metrc Maine program', 'https://www.metrc.com/partner/maine/'),
      source('Canix cannabis ERP platform', 'https://www.canix.com/'),
      source('Flourish cannabis supply-chain software', 'https://www.flourishsoftware.com/'),
      source('Distru cannabis ERP', 'https://www.distru.com/'),
    ],
    reviewedDate,
    relatedSlugs: ['canix', 'flourish', 'cannabis-compliance', 'cannabis-wholesale-marketplaces'],
  },
  {
    slug: 'cannabis-compliance',
    kind: 'category',
    title: 'Cannabis Compliance Software for Maine Operators',
    description: 'Understand cannabis compliance software, Metrc support, SOP tools, regulatory libraries, and audit workflows for Maine cannabis businesses.',
    eyebrow: 'Operator software guide',
    answer: 'Cannabis compliance software can organize SOPs, inspections, tasks, training, regulatory libraries, and inventory-reconciliation workflows. It can reduce missed steps, but it does not replace Maine OCP rules, local requirements, legal counsel, or the operator’s responsibility for accurate records.',
    sections: [
      {
        id: 'layers',
        heading: 'The three compliance layers',
        paragraphs: [
          'Maine operators must distinguish government systems, operational software, and advisory content. Metrc records regulated inventory. A POS or ERP manages business workflows and may exchange data with Metrc. A compliance platform can organize policies, tasks, audits, and rule monitoring.',
          'No vendor should be treated as the final legal authority. Material decisions should be checked against current OCP rules, official guidance, municipal requirements, and qualified counsel where appropriate.',
        ],
      },
      {
        id: 'use-cases',
        heading: 'Useful compliance-software use cases',
        paragraphs: [
          'The strongest use cases are repeatable: opening and closing checklists, camera and visitor logs, inventory variance review, license deadlines, staff attestations, corrective actions, SOP version control, and evidence packages for internal audits.',
          'A small operation can begin with disciplined documents and calendars. Dedicated software becomes more valuable when multiple locations, departments, licenses, or managers need consistent evidence and accountability.',
        ],
        bullets: [
          'Rule and policy library with clear update provenance.',
          'Role-based checklists, sign-off, and audit history.',
          'Training assignments and document acknowledgment.',
          'Incident, variance, and corrective-action workflow.',
          'Exports suitable for management and professional review.',
        ],
      },
      {
        id: 'vendor-check',
        heading: 'What to verify during a compliance demo',
        paragraphs: [
          'Ask the vendor to identify exactly which Maine adult-use and medical-use materials it maintains, how quickly updates are reviewed, who performs the legal or regulatory analysis, and whether municipal rules are included. Broad state coverage does not imply town-level zoning or ordinance coverage.',
          'Also test whether staff can use the system under real operating conditions. A sophisticated library provides little value if teams do not complete tasks, attach evidence, investigate exceptions, and keep SOPs current.',
        ],
      },
    ],
    comparison: [
      { name: 'Metrc', bestFor: 'Required regulatory inventory tracking in Maine’s adult-use program.', notes: 'Government-designated track-and-trace layer, not a complete SOP, legal, or business-management system.', officialUrl: 'https://www.metrc.com/partner/maine/' },
      { name: 'Simplifya', bestFor: 'Operators seeking compliance libraries, operational checklists, and audit-oriented workflows.', notes: 'Verify current Maine program depth and municipal coverage directly.', officialUrl: 'https://www.simplifya.com/' },
      { name: 'ProCanna', bestFor: 'Operators evaluating SOP, task, training, and compliance-management tooling.', notes: 'Verify current Maine content, source provenance, and update cadence directly.', officialUrl: 'https://procanna-usa.com/' },
    ],
    faqs: [
      { question: 'What compliance system does Maine use for adult-use cannabis inventory?', answer: 'Maine uses Metrc for adult-use inventory tracking. Operators should follow current OCP onboarding and operating guidance rather than relying on a vendor summary alone.' },
      { question: 'Can compliance software replace a cannabis attorney?', answer: 'No. Software can organize information and workflows, but it cannot replace legal advice for licensing, enforcement, contracts, zoning, or a disputed interpretation.' },
      { question: 'Does a compliance platform cover municipal zoning and moratoria?', answer: 'Not necessarily. State-focused products may not include every Maine municipality’s ordinance, zoning, fee, or moratorium changes. Ask for the exact geographic scope and source-update process.' },
    ],
    sources: [
      source('Maine Office of Cannabis Policy', 'https://www.maine.gov/dafs/ocp/'),
      source('Metrc Maine program', 'https://www.metrc.com/partner/maine/'),
      source('Simplifya compliance platform', 'https://www.simplifya.com/'),
      source('ProCanna compliance platform', 'https://procanna-usa.com/'),
    ],
    reviewedDate,
    relatedSlugs: ['seed-to-sale-erp', 'canix', 'flourish'],
  },
  {
    slug: 'cannabis-market-intelligence',
    kind: 'category',
    title: 'Cannabis Market Intelligence & Competitive Data Platforms',
    description: 'Compare cannabis sales, pricing, menu, market-share, and competitor intelligence platforms, with guidance for Maine operators.',
    eyebrow: 'Operator software guide',
    answer: 'Cannabis market-intelligence platforms turn retail sales, menu, pricing, consumer, and competitive data into benchmarks and forecasts. For a Maine operator, the central question is not how large the vendor is—it is whether the product has enough current Maine coverage and local detail to support the decision at hand.',
    sections: [
      {
        id: 'data-models',
        heading: 'Know what the dataset actually measures',
        paragraphs: [
          'Point-of-sale panels, public menus, consumer surveys, government reports, and modeled estimates answer different questions. A platform may be excellent for national category trends while offering limited visibility into a small Maine town or a specific competitor.',
          'Before buying, ask for the source mix, Maine sample size, participating retailers, historical depth, refresh cadence, suppressed low-sample metrics, and methodology for estimates. Do not treat a modeled number as an audited statewide total.',
        ],
      },
      {
        id: 'decisions',
        heading: 'Match the tool to the decision',
        paragraphs: [
          'Retail sales panels can support assortment and category analysis. Menu monitoring can surface advertised price and product changes. Consumer research can inform positioning. Government data can anchor statewide sales and license trends. None of those automatically answers municipal authorization, zoning, local fees, or site viability.',
          'That local gap is where MDG’s planned Maine Cannabis Market Watch differs: source-linked municipal, licensing, market-density, and regulatory change intelligence rather than another general national sales dashboard.',
        ],
        bullets: [
          'Assortment and category planning.',
          'Competitive advertised-price and menu monitoring.',
          'Market share and brand-performance estimates.',
          'Statewide sales and transaction trends.',
          'Municipal licensing and site-selection context.',
        ],
      },
      {
        id: 'shortlist',
        heading: 'Major platforms to investigate',
        paragraphs: [
          'Headset and BDSA are established cannabis-data brands with broad market and retail intelligence products. CannMenus and Hoodie Analytics emphasize menu, product, pricing, and competitive datasets. Pistil has also focused on sales and market intelligence for brands and retailers.',
          'MDG has not verified that every platform offers the Maine coverage an operator may need. Require a Maine-specific sample or coverage demonstration before purchasing an annual contract.',
        ],
      },
    ],
    comparison: [
      { name: 'Headset', bestFor: 'Retail sales, category, brand, pricing, and market benchmarking where panel coverage is available.', notes: 'Request a Maine coverage demonstration and methodology details before relying on local conclusions.', officialUrl: 'https://www.headset.io/' },
      { name: 'BDSA', bestFor: 'Broad market intelligence, forecasting, consumer insights, and retail sales tracking.', notes: 'Confirm which Maine datasets and granularity are included in the proposed subscription.', officialUrl: 'https://bdsa.com/' },
      { name: 'CannMenus', bestFor: 'Menu, product, advertised-price, and competitive monitoring.', notes: 'Menu availability does not equal completed sales. Verify Maine retailer coverage and refresh cadence.', officialUrl: 'https://www.cannmenus.com/' },
      { name: 'Hoodie Analytics', bestFor: 'Brands and retailers seeking menu-based competitive and distribution intelligence.', notes: 'Request evidence of Maine coverage and clarify modeled versus observed fields.', officialUrl: 'https://www.hoodieanalytics.com/' },
    ],
    faqs: [
      { question: 'Does Headset or BDSA cover Maine cannabis sales?', answer: 'Coverage, products, and granularity can change. Ask the vendor to demonstrate the current Maine sample, markets, refresh cadence, and methodology before using the data for a local decision.' },
      { question: 'Is online menu data the same as actual dispensary sales?', answer: 'No. Menu data shows advertised availability and price at collection time. It does not necessarily show completed transactions, discounts, stock depth, returns, or wholesale economics.' },
      { question: 'How would Maine Cannabis Market Watch differ?', answer: 'The planned MDG product would emphasize Maine municipal authorization, licenses, zoning, moratoria, fees, market density, state metrics, and source-linked change interpretation rather than broad national sales coverage.' },
    ],
    sources: [
      source('Headset cannabis market intelligence', 'https://www.headset.io/'),
      source('BDSA cannabis market intelligence', 'https://bdsa.com/'),
      source('CannMenus cannabis product and menu data', 'https://www.cannmenus.com/'),
      source('Hoodie Analytics cannabis data', 'https://www.hoodieanalytics.com/'),
    ],
    reviewedDate,
    relatedSlugs: ['cannabis-compliance', 'cannabis-wholesale-marketplaces'],
  },
  {
    slug: 'cannabis-wholesale-marketplaces',
    kind: 'category',
    title: 'Cannabis Wholesale Marketplace & B2B Ordering Software',
    description: 'Compare cannabis wholesale marketplaces, digital catalogs, ordering, sales, and distribution software for Maine operators.',
    eyebrow: 'Operator software guide',
    answer: 'Cannabis wholesale software connects licensed brands, cultivators, manufacturers, distributors, and retailers through digital catalogs, ordering, sales, inventory, and payment workflows. Maine operators should verify state availability, license checks, transaction workflow, fees, data ownership, and integration with their accounting and inventory systems.',
    sections: [
      {
        id: 'marketplace-vs-erp',
        heading: 'Marketplace and internal sales software solve different problems',
        paragraphs: [
          'A marketplace helps buyers discover products and submit orders across participating sellers. Internal sales and distribution software manages the operator’s own catalog, customer accounts, inventory, production, invoices, and fulfillment. Some platforms combine pieces of both.',
          'The correct choice depends on whether the priority is new buyer discovery, lower order-entry work, better account management, inventory accuracy, receivables, or integration with production and accounting.',
        ],
      },
      {
        id: 'maine-checklist',
        heading: 'Maine wholesale evaluation checklist',
        paragraphs: [
          'Maine operators should confirm that the platform supports the applicable licensed market and workflow. Ask how buyer and seller licenses are verified, how product and package data stay current, and which steps still occur in the state tracking system.',
          'Fees can appear as subscriptions, transaction charges, payment costs, financing costs, implementation, or premium placement. Compare the annual economics against current sales labor and error rates rather than focusing on a headline fee.',
        ],
        bullets: [
          'Current Maine availability and participating buyer density.',
          'License verification and account permissions.',
          'Catalog, live inventory, order, invoice, and fulfillment ownership.',
          'Metrc, ERP, POS, accounting, and payment integrations.',
          'Export rights, buyer relationship ownership, and cancellation terms.',
        ],
      },
      {
        id: 'shortlist',
        heading: 'Platforms to research',
        paragraphs: [
          'LeafLink is a prominent cannabis wholesale marketplace and commerce platform. Distru emphasizes manufacturing and distribution operations. Canix and Flourish also cover sales, inventory, and supply-chain workflows for operators that need more than marketplace discovery.',
          'MDG has not verified current Maine buyer and seller participation for every platform. Request a Maine-specific network and workflow demonstration before treating a national footprint as local liquidity.',
        ],
      },
    ],
    comparison: [
      { name: 'LeafLink', bestFor: 'Licensed brands and retailers evaluating a multi-vendor wholesale marketplace and commerce network.', notes: 'Confirm current Maine availability, buyer density, fees, payments, and integrations directly.', officialUrl: 'https://www.leaflink.com/' },
      { name: 'Distru', bestFor: 'Manufacturers and distributors seeking internal orders, inventory, production, and accounting workflows.', notes: 'More operational than a simple buyer marketplace; verify current state support.', officialUrl: 'https://www.distru.com/' },
      { name: 'Canix', bestFor: 'Cultivation, manufacturing, and vertically integrated operators connecting inventory, sales, and compliance workflows.', notes: 'Confirm which sales and wholesale modules fit the Maine operation.', profileSlug: 'canix' },
      { name: 'Flourish', bestFor: 'Operators seeking broader supply-chain management across multiple license types.', notes: 'Confirm modules, implementation, and Maine integration scope in the quote.', profileSlug: 'flourish' },
    ],
    faqs: [
      { question: 'Can Maine cannabis businesses order through a national B2B marketplace?', answer: 'Only where the platform supports the applicable licensed Maine market and both parties meet legal requirements. Confirm current state availability and transaction workflow directly with the vendor.' },
      { question: 'Does a wholesale marketplace replace Metrc?', answer: 'No. Marketplace or ordering software may integrate with operational systems, but required regulatory inventory and transfer records still follow Maine’s official rules and systems.' },
      { question: 'What is the main risk of a wholesale marketplace?', answer: 'Operators should examine local network participation, fees, data ownership, buyer relationship control, inventory synchronization, payment terms, and the ability to export records if they leave.' },
    ],
    sources: [
      source('LeafLink wholesale cannabis platform', 'https://www.leaflink.com/'),
      source('Distru cannabis ERP and distribution software', 'https://www.distru.com/'),
      source('Canix sales and inventory platform', 'https://www.canix.com/'),
      source('Flourish supply-chain platform', 'https://www.flourishsoftware.com/'),
    ],
    reviewedDate,
    relatedSlugs: ['canix', 'flourish', 'seed-to-sale-erp'],
  },
  {
    slug: 'flowhub',
    kind: 'vendor',
    title: 'Flowhub for Maine Dispensaries: POS Platform Profile',
    description: 'An independent Maine operator profile of Flowhub POS, ecommerce, inventory, payments, Metrc workflows, and its public referral program.',
    eyebrow: 'Vendor profile · POS and retail operations',
    answer: 'Flowhub is a cannabis retail platform covering point of sale, inventory, compliance workflows, payments, ecommerce, analytics, and related store operations. Flowhub publicly lists Maine among its supported markets. Operators should still validate the exact Metrc, hardware, ecommerce, payment, migration, and support workflow in a Maine-specific demonstration.',
    officialUrl: 'https://www.flowhub.com/',
    evidence: {
      pricingStatus: 'Public pricing status: no standard package price appears on the cited pages; a written sales quote is required.',
      publicEvidence: [
        'Flowhub maintains a Maine-specific state page that identifies Maine as a supported retail market.',
        'Its public platform materials group POS, inventory, payments, ecommerce, analytics, and compliance workflows in the retail product.',
      ],
      evaluationStatus: 'MDG reviewed public product, Maine-market, and program materials; it has not purchased, configured, or hands-on tested Flowhub.',
    },
    sections: [
      {
        id: 'operator-fit',
        heading: 'Where Flowhub may fit',
        paragraphs: [
          'Flowhub markets its platform to regulated cannabis retailers, including independent stores and multi-location operators. A Maine retailer considering it should compare register speed, inventory control, Metrc exception handling, cash management, ecommerce, payments, reporting, and support under the same proposed package.',
          'The strongest evaluation is a scripted demo based on the operator’s own opening, receiving, sale, return, discount, inventory adjustment, and end-of-day procedures. Public feature lists do not reveal how much staff training or manual reconciliation a specific configuration will require.',
        ],
      },
      {
        id: 'questions',
        heading: 'Questions to ask Flowhub',
        paragraphs: ['Request written answers for the complete annual cost, implementation scope, supported hardware, data migration, customer and inventory exports, support response targets, contract term, and cancellation process.'],
        bullets: [
          'Which Maine Metrc workflows are direct, and which require work in Metrc?',
          'Is ecommerce included in this quote, and how are online orders reserved and fulfilled?',
          'Which payment options are available to this license and banking arrangement?',
          'How are offline events, inventory discrepancies, and duplicate records resolved?',
          'What changes in price or support as locations and registers are added?',
        ],
      },
      {
        id: 'referral',
        heading: 'Public referral program',
        paragraphs: [
          'Flowhub currently publishes a “Friends of Flowhub” referral program. Its official page states that an eligible converted referral pays $1,500 for the first location plus $100 per additional location, up to $2,000. The referred business must be a new lead, sign a minimum 12-month contract, and pay for two months.',
          'MDG is not currently enrolled in or compensated by this program. The public terms make Flowhub a potential future referral partner, but any commercial relationship would be disclosed before a tracked referral link is used.',
        ],
      },
    ],
    faqs: [
      { question: 'Does Flowhub support Maine dispensaries?', answer: 'Flowhub publicly lists Maine in its supported cannabis retail markets. A buyer should still confirm the exact current Maine Metrc, payment, ecommerce, and implementation scope in writing.' },
      { question: 'Does Flowhub publish standard pricing?', answer: 'Flowhub generally routes buyers through a sales process. Ask for an itemized quote covering software, registers, ecommerce, payments, implementation, hardware, support, locations, and contract term.' },
      { question: 'Does MDG earn money when readers visit Flowhub?', answer: 'No active MDG referral relationship is represented on this page. Flowhub has a public cash referral program, but MDG would disclose a relationship before using a compensated tracking link.' },
    ],
    sources: [
      source('Flowhub cannabis retail platform', 'https://www.flowhub.com/'),
      source('Flowhub Maine cannabis POS', 'https://www.flowhub.com/markets/maine'),
      source('Flowhub public referral program', 'https://www.flowhub.com/referral'),
    ],
    reviewedDate,
    relatedSlugs: ['dispensary-ecommerce-menus', 'cova', 'dutchie'],
    referral: {
      kind: 'cash-referral',
      summary: 'Official public program: $1,500 for an eligible first location plus $100 per additional location, up to $2,000, after contract and payment conditions are met.',
      officialUrl: 'https://www.flowhub.com/referral',
      mdgRelationship: 'inactive',
    },
  },
  {
    slug: 'dutchie',
    kind: 'vendor',
    title: 'Dutchie for Maine Dispensaries: Commerce Platform Profile',
    description: 'An independent operator profile of Dutchie POS, ecommerce, payments, retail operations, and its public dispensary referral program.',
    eyebrow: 'Vendor profile · POS and ecommerce',
    answer: 'Dutchie provides cannabis retail technology spanning point of sale, ecommerce, payments, and related commerce workflows. It is a broad platform rather than a single menu widget. Maine operators should compare the integrated-suite benefits against contract scope, migration complexity, data portability, website ownership, and the cost of each required module.',
    officialUrl: 'https://business.dutchie.com/',
    evidence: {
      pricingStatus: 'Public pricing status: Dutchie uses a sales and quote process rather than publishing one standard package price on the cited pages.',
      publicEvidence: [
        'Dutchie’s business materials present point of sale, ecommerce, and payments as separate parts of a broader commerce platform.',
        'The cited public pages do not establish Maine-specific implementation scope, so state support and Metrc workflows require written confirmation.',
      ],
      evaluationStatus: 'MDG reviewed public platform, POS, and referral materials; it has not purchased, configured, or hands-on tested Dutchie.',
    },
    sections: [
      {
        id: 'operator-fit',
        heading: 'Where Dutchie may fit',
        paragraphs: [
          'Dutchie is commonly evaluated by dispensaries that want POS and ecommerce under one vendor or need a commerce stack designed specifically for regulated cannabis. The combined approach may reduce integration boundaries, but it can also increase switching cost if the retailer depends on the same vendor for transactions, menu, payments, and customer experience.',
          'A buyer should separate the demo into POS, ecommerce, payments, reporting, support, and data ownership. Confirm which modules are included, what remains third-party, and whether every quoted workflow is currently available in Maine.',
        ],
      },
      {
        id: 'questions',
        heading: 'Questions to ask Dutchie',
        paragraphs: ['Use the operator’s actual catalog, discount rules, order volume, hardware plan, and reporting needs during evaluation.'],
        bullets: [
          'What is the complete annual price by module, location, register, and transaction?',
          'How does Maine Metrc exception handling and reconciliation work?',
          'Does ecommerce render on the operator’s domain, and what product URLs are indexable?',
          'What customer, menu, transaction, and analytics exports are available?',
          'What is the migration and termination process if the operator changes vendors?',
        ],
      },
      {
        id: 'referral',
        heading: 'Public referral program',
        paragraphs: [
          'Dutchie currently publishes a public referral page offering $500 for an eligible point-of-sale referral and $200 for ecommerce. The referred account must be new, sign within 90 days of submission, and meet the program’s payment conditions.',
          'MDG is not currently compensated by Dutchie. If MDG later activates a commercial referral relationship, the page and eligible link will carry a clear disclosure.',
        ],
      },
    ],
    faqs: [
      { question: 'Is Dutchie only an online menu?', answer: 'No. Dutchie’s business platform spans ecommerce, point of sale, payments, and related cannabis commerce products. Confirm which modules are included in the proposed contract.' },
      { question: 'Does Dutchie publish one standard monthly price?', answer: 'Dutchie generally uses a sales and quote process. Request a complete written cost for every module, location, register, implementation service, transaction fee, and contract term.' },
      { question: 'Does MDG have a paid Dutchie relationship?', answer: 'No active MDG commercial relationship is represented here. Dutchie publishes a public referral program; MDG would disclose compensation before using a tracked referral link.' },
    ],
    sources: [
      source('Dutchie business platform', 'https://business.dutchie.com/'),
      source('Dutchie point of sale', 'https://business.dutchie.com/pos'),
      source('Dutchie public referral program', 'https://business.dutchie.com/referral'),
    ],
    reviewedDate,
    relatedSlugs: ['dispensary-ecommerce-menus', 'flowhub', 'cova'],
    referral: {
      kind: 'cash-referral',
      summary: 'Official public program: $500 for an eligible POS referral and $200 for ecommerce, subject to new-account, 90-day close, and first-sale conditions.',
      officialUrl: 'https://business.dutchie.com/referral',
      mdgRelationship: 'inactive',
    },
  },
  {
    slug: 'cova',
    kind: 'vendor',
    title: 'Cova for Maine Dispensaries: Cannabis POS Profile',
    description: 'An independent Maine operator profile of Cova POS, inventory, ecommerce, payments, integrations, pricing visibility, and customer referral credit.',
    eyebrow: 'Vendor profile · POS and retail operations',
    answer: 'Cova is a cannabis retail platform covering point of sale, inventory, compliance workflows, ecommerce, payments, analytics, and integrations. Its public referral terms list Maine as a supported state. Operators should evaluate the complete package, including ecommerce, hardware, implementation, payments, reporting, and support.',
    officialUrl: 'https://www.covasoftware.com/',
    evidence: {
      pricingStatus: 'Public pricing status: Cova publishes starting-tier information, but an itemized current quote is still required for the complete configuration.',
      publicEvidence: [
        'Cova’s public customer-referral terms list Maine among supported states.',
        'Its public POS and pricing materials separate core retail software from configuration-dependent ecommerce, hardware, payments, implementation, and support costs.',
      ],
      evaluationStatus: 'MDG reviewed public product, pricing, and referral materials; it has not purchased, configured, or hands-on tested Cova.',
    },
    sections: [
      {
        id: 'operator-fit',
        heading: 'Where Cova may fit',
        paragraphs: [
          'Cova is frequently evaluated by independent and multi-location cannabis retailers that want a cannabis-specific register and inventory system with a broad integration directory. Its public site provides more visible product and referral detail than many quote-only vendors, but the operator should still request a complete current proposal.',
          'The buying decision should account for required add-ons, registers, hardware, ecommerce, payments, implementation, training, support, and future locations. Public starting prices can become stale or may not represent the final configuration.',
        ],
      },
      {
        id: 'questions',
        heading: 'Questions to ask Cova',
        paragraphs: ['Ask the sales team to map each operational requirement to the quoted product and show the Maine workflow end to end.'],
        bullets: [
          'Which Maine Metrc events sync directly, and how are failed events repaired?',
          'Which ecommerce, loyalty, accounting, marketplace, and hardware integrations are included?',
          'What recurring and one-time charges apply beyond the base tier?',
          'How are customer, inventory, transaction, and audit records exported?',
          'What service levels apply during launch and high-volume operating periods?',
        ],
      },
      {
        id: 'referral',
        heading: 'Customer referral credit—not an open MDG affiliate link',
        paragraphs: [
          'Cova’s current public program offers an eligible referring Cova customer a $400 monthly-bill credit after a referred business signs and launches. The new customer receives a $400 discount from its launch fee. The program page lists Maine among supported states.',
          'This is not currently an MDG cash affiliate arrangement. MDG is not representing itself as a Cova customer or claiming eligibility for the account credit.',
        ],
      },
    ],
    faqs: [
      { question: 'Does Cova support Maine cannabis retailers?', answer: 'Cova’s current referral terms list Maine among supported states. Confirm current product, Metrc, payment, ecommerce, and onboarding availability directly before signing.' },
      { question: 'Does Cova publish pricing?', answer: 'Cova has published tier and ecommerce pricing on its site, but operators should treat any figure as time-sensitive and request a complete written quote for their exact configuration.' },
      { question: 'Can MDG earn the Cova referral credit?', answer: 'MDG is not claiming eligibility. Cova’s public program describes a bill credit for eligible Cova customers, not an active MDG cash affiliate relationship.' },
    ],
    sources: [
      source('Cova cannabis retail platform', 'https://www.covasoftware.com/'),
      source('Cova cannabis POS', 'https://www.covasoftware.com/pos'),
      source('Cova US pricing', 'https://www.covasoftware.com/pricing-us'),
      source('Cova customer referral program', 'https://www.covasoftware.com/refer'),
    ],
    reviewedDate,
    relatedSlugs: ['flowhub', 'dutchie', 'dispensary-ecommerce-menus'],
    referral: {
      kind: 'customer-credit',
      summary: 'Official customer program: a $400 Cova bill credit for an eligible referring customer and a $400 launch-fee discount for the new customer.',
      officialUrl: 'https://www.covasoftware.com/refer',
      mdgRelationship: 'inactive',
    },
  },
  {
    slug: 'aiq',
    kind: 'vendor',
    title: 'AIQ for Maine Dispensaries: CRM, Loyalty & Ecommerce Profile',
    description: 'An independent operator profile of AIQ, formerly Alpine IQ, covering cannabis CRM, loyalty, marketing, analytics, data operations, mobile apps, and ecommerce.',
    eyebrow: 'Vendor profile · CRM, loyalty, and ecommerce',
    answer: 'AIQ, formerly known as Alpine IQ, sells a connected cannabis retail suite spanning marketing, loyalty, analytics, data operations, mobile apps, and ecommerce. Dispense is now AIQ Ecommerce. Maine operators should verify the exact POS integrations, modules, messaging costs, consent controls, implementation work, and data-export rights.',
    officialUrl: 'https://aiq.com/',
    evidence: {
      pricingStatus: 'Public pricing status: no standard suite or module price appears on the cited pages; buyers need a quote that itemizes modules, messaging, onboarding, and ecommerce.',
      publicEvidence: [
        'AIQ’s public materials connect loyalty, marketing, analytics, data operations, mobile apps, and ecommerce under the current AIQ brand.',
        'Dispense is presented as AIQ Ecommerce, while the referral page separately publishes retailer and brand-account payouts.',
      ],
      evaluationStatus: 'MDG reviewed public suite, ecommerce, and referral materials; it has not purchased, configured, or hands-on tested AIQ.',
    },
    sections: [
      {
        id: 'operator-fit',
        heading: 'Where AIQ may fit',
        paragraphs: [
          'AIQ may fit retailers that have outgrown basic POS loyalty and want a more connected customer-data, messaging, analytics, mobile, and ecommerce stack. The value depends on whether the team has enough opted-in customers and campaign capacity to use those modules consistently.',
          'A smaller operator should compare AIQ against the features already included in its POS. Buying a powerful suite without staff ownership, campaign planning, and measurement can add cost without improving retention.',
        ],
      },
      {
        id: 'questions',
        heading: 'Questions to ask AIQ',
        paragraphs: ['Require a demonstration tied to the operator’s selected POS and customer-consent workflow.'],
        bullets: [
          'Which POS data fields sync, how often, and in which direction?',
          'How are SMS and email consent, opt-outs, quiet hours, and suppression lists handled?',
          'Which modules are required for loyalty, analytics, mobile apps, and ecommerce?',
          'What messaging, onboarding, data-cleaning, and implementation fees apply?',
          'How are customer profiles, campaign results, and loyalty balances exported?',
        ],
      },
      {
        id: 'referral',
        heading: 'Public cash referral program',
        paragraphs: [
          'AIQ’s current public referral page states that a converted retail referral pays $100 per store, up to $1,000, and a converted brand account pays $500. The account must not already be active in the sales cycle and generally must close within 60 days; owners and key decision-makers cannot refer their own organizations.',
          'MDG has no active AIQ commercial relationship represented on this page.',
        ],
      },
    ],
    faqs: [
      { question: 'Is Alpine IQ now AIQ?', answer: 'Yes. AIQ is the current brand used for the platform formerly known as Alpine IQ. Operators may still encounter the older name in integrations and industry discussions.' },
      { question: 'What happened to Dispense?', answer: 'Dispense is now presented as AIQ Ecommerce within the broader AIQ retail suite.' },
      { question: 'Does MDG have an AIQ affiliate link?', answer: 'No active compensated MDG link is represented. AIQ publishes a cash referral program, but MDG would disclose compensation before activating a tracked referral route.' },
    ],
    sources: [
      source('AIQ cannabis retail suite', 'https://aiq.com/'),
      source('AIQ Ecommerce, formerly Dispense', 'https://www.dispenseapp.com/'),
      source('AIQ referral program', 'https://aiq.com/referral-program'),
    ],
    reviewedDate,
    relatedSlugs: ['cannabis-crm-loyalty', 'dispensary-ecommerce-menus'],
    referral: {
      kind: 'cash-referral',
      summary: 'Official public program: $100 per retail store, up to $1,000, and $500 per brand account when the referred account signs up, subject to the published eligibility and timing conditions.',
      officialUrl: 'https://aiq.com/referral-program',
      mdgRelationship: 'inactive',
    },
  },
  {
    slug: 'canix',
    kind: 'vendor',
    title: 'Canix for Maine Cannabis Operators: ERP Platform Profile',
    description: 'An independent profile of Canix cultivation, manufacturing, inventory, sales, compliance integration, and its public referral rewards.',
    eyebrow: 'Vendor profile · Cultivation and ERP',
    answer: 'Canix is a cannabis ERP and operational platform for cultivation, manufacturing, inventory, sales, and compliance workflows. It is more relevant to growers, manufacturers, distributors, and vertically integrated businesses than to a dispensary seeking only a retail register. Maine operators should confirm current program and integration coverage directly.',
    officialUrl: 'https://www.canix.com/',
    evidence: {
      pricingStatus: 'Public pricing status: no standard ERP package price appears on the cited pages; a quote must identify modules, facilities, users, implementation, and integrations.',
      publicEvidence: [
        'Canix’s public cultivation materials focus on plant, harvest, inventory, and operational workflows rather than a dispensary-only register.',
        'Its customer-referral page publishes gift-card and invoice-credit conditions separately from product pricing.',
      ],
      evaluationStatus: 'MDG reviewed public ERP, cultivation-workflow, and referral materials; it has not purchased, configured, or hands-on tested Canix.',
    },
    sections: [
      {
        id: 'operator-fit',
        heading: 'Where Canix may fit',
        paragraphs: [
          'Canix may fit operators managing plants, harvests, production, inventory, wholesale sales, multiple facilities, or vertically integrated workflows. Its value proposition is operational visibility and reduced duplicate work around regulated inventory rather than consumer-facing retail alone.',
          'A dispensary-only business should first determine whether its POS and accounting workflow already cover the need. A separate ERP introduces another system of record, implementation project, and reconciliation boundary.',
        ],
      },
      {
        id: 'questions',
        heading: 'Questions to ask Canix',
        paragraphs: ['Request a complete demonstration using the operator’s license types, facilities, production steps, inventory units, and accounting workflow.'],
        bullets: [
          'Which Maine programs and Metrc workflows are currently supported?',
          'How are failed synchronization events detected and reconciled?',
          'Which modules cover cultivation, manufacturing, sales, inventory, and accounting?',
          'What barcode, scale, mobile, and offline workflows are supported?',
          'How are production history, inventory, customers, and audit records exported?',
        ],
      },
      {
        id: 'referral',
        heading: 'Public customer referral rewards',
        paragraphs: [
          'Canix currently publishes a referral program offering a $100 gift card for a qualified introduction. If the referred business becomes a customer, the page describes a $1,000 gift card or $2,000 invoice credit, with payment after the referred customer completes its first three monthly payments.',
          'The page does not establish an active MDG relationship. The invoice-credit option is most useful to existing customers, while the gift-card terms should be confirmed with Canix before MDG treats the program as a publisher opportunity.',
        ],
      },
    ],
    faqs: [
      { question: 'Is Canix a dispensary POS?', answer: 'Canix is positioned primarily as a cannabis ERP and operational platform across cultivation, manufacturing, inventory, sales, and compliance. A retailer should evaluate a dedicated POS for register operations.' },
      { question: 'Does Canix replace Metrc?', answer: 'No. Canix may integrate operational workflows with regulatory tracking, but Metrc remains the required regulatory system where applicable and the operator remains responsible for accurate records.' },
      { question: 'Does MDG receive Canix referral rewards?', answer: 'No active MDG referral relationship is represented. Canix publishes gift-card and invoice-credit rewards, but eligibility and publisher terms must be confirmed before activation.' },
    ],
    sources: [
      source('Canix cannabis ERP platform', 'https://www.canix.com/'),
      source('Canix cultivation workflows', 'https://www.canix.com/products/cultivation-workflows'),
      source('Canix customer referral program', 'https://www.canix.com/customer-referral'),
    ],
    reviewedDate,
    relatedSlugs: ['seed-to-sale-erp', 'flourish', 'cannabis-wholesale-marketplaces'],
    referral: {
      kind: 'customer-credit',
      summary: 'Official program: $100 gift card for a qualified introduction; a converted referral can produce a $1,000 gift card or $2,000 invoice credit after stated payment conditions.',
      officialUrl: 'https://www.canix.com/customer-referral',
      mdgRelationship: 'inactive',
    },
  },
  {
    slug: 'flourish',
    kind: 'vendor',
    title: 'Flourish for Maine Cannabis Operators: Supply-Chain Software Profile',
    description: 'An independent profile of Flourish cannabis cultivation, manufacturing, distribution, inventory, retail, integrations, and referral partner program.',
    eyebrow: 'Vendor profile · Seed-to-sale and ERP',
    answer: 'Flourish provides cannabis supply-chain software across cultivation, manufacturing, distribution, inventory, and retail workflows. The breadth may suit multi-license or vertically integrated operators, but Maine businesses should confirm the exact modules, Metrc coverage, implementation services, and local workflow support in the proposed contract.',
    officialUrl: 'https://www.flourishsoftware.com/',
    evidence: {
      pricingStatus: 'Public pricing status: no standard package price appears on the cited pages; the product and partner terms both require contract-specific details.',
      publicEvidence: [
        'Flourish’s public platform materials span cultivation, manufacturing, distribution, inventory, and retail workflows.',
        'Its live partner-program agreement states that referral compensation is defined in an executed Exhibit A, not one universal public payout.',
      ],
      evaluationStatus: 'MDG reviewed public platform and partner-agreement materials; it has not purchased, configured, or hands-on tested Flourish.',
    },
    sections: [
      {
        id: 'operator-fit',
        heading: 'Where Flourish may fit',
        paragraphs: [
          'Flourish may fit operators seeking one operational platform across multiple cannabis license types or supply-chain stages. A broad suite can reduce fragmented data, but it also requires careful implementation, role design, migration, training, and agreement about which system owns each record.',
          'Single-purpose operators should compare the suite against narrower alternatives. More modules are not automatically better if the business only needs one workflow and must maintain several integrations around it.',
        ],
      },
      {
        id: 'questions',
        heading: 'Questions to ask Flourish',
        paragraphs: ['Use a representative production-to-sale workflow rather than a dashboard-only demonstration.'],
        bullets: [
          'Which Maine license types and Metrc workflows are supported today?',
          'Which cultivation, manufacturing, distribution, inventory, and retail modules are required?',
          'What implementation, migration, training, support, and integration services are included?',
          'How are accounting, lab, ecommerce, POS, hardware, and customer systems connected?',
          'What audit history and bulk export are available at termination?',
        ],
      },
      {
        id: 'referral',
        heading: 'Application-based partner program',
        paragraphs: [
          'Flourish publishes a formal partner-program agreement for approved referral partners. The current public agreement says eligible leads can generate a referral fee after a qualified sale, while the actual fee schedule is defined in the partner’s Exhibit A rather than as one universal public payout.',
          'Participation requires joining the program and signing its agreement. MDG has no active Flourish partner relationship represented on this page and would disclose compensation before using a tracked referral path.',
        ],
      },
    ],
    faqs: [
      { question: 'Is Flourish only for cultivation?', answer: 'No. Flourish presents software across cultivation, manufacturing, distribution, inventory, and retail operations. Buyers should confirm which modules fit their license types and workflow.' },
      { question: 'Does Flourish guarantee compliance?', answer: 'No. Operational software may support records and integrations, but the licensed operator remains responsible for accurate reporting, procedures, training, and compliance.' },
      { question: 'Is MDG a Flourish referral partner?', answer: 'No active MDG partnership is represented. Flourish publishes an application-based referral program, and MDG would disclose compensation before activating a tracked referral route.' },
    ],
    sources: [
      source('Flourish cannabis supply-chain software', 'https://www.flourishsoftware.com/'),
      source('Flourish platform modules', 'https://www.flourishsoftware.com/platform'),
      source('Flourish partner program terms', 'https://www.flourishsoftware.com/legal/partner-program-terms-and-conditions'),
    ],
    reviewedDate,
    relatedSlugs: ['seed-to-sale-erp', 'canix', 'cannabis-wholesale-marketplaces'],
    referral: {
      kind: 'partner-application',
      summary: 'Official application-based program: approved referral partners sign an agreement whose Exhibit A defines the referral fee and commercial terms.',
      officialUrl: 'https://www.flourishsoftware.com/legal/partner-program-terms-and-conditions',
      mdgRelationship: 'inactive',
    },
  },
];

export const softwareCategories = softwareEntries.filter((entry) => entry.kind === 'category');
export const softwareVendors = softwareEntries.filter((entry) => entry.kind === 'vendor');

export function getSoftwareEntry(slug: string): SoftwareEntry | undefined {
  return softwareEntries.find((entry) => entry.slug === slug);
}
