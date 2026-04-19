#!/usr/bin/env node
/**
 * download-heroes.cjs — Download all generated hero images to public/images/heroes/
 * Usage: node scripts/download-heroes.cjs
 */

const fs = require('fs');
const path = require('path');

const images = [
  // City Guides (14)
  { url: 'https://v3b.fal.media/files/b/0a96d9ae/cagH2T-j45YfwnkOE8SMz_yeo09Nhb.jpg', name: 'portland-dispensary-guide.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9af/ThrWjwvVDLmxEI7UMuhZm_J016I78z.jpg', name: 'bangor-dispensary-guide.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9af/m35aNVrduupkMAxdSwX5M_0tHfGpSf.jpg', name: 'lewiston-dispensary-guide.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9af/v80fP8bo_882aq1WV3Ck__UlPSvy88.jpg', name: 'biddeford-dispensary-guide.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9af/aZPM2htdbk2n4g_pBBv7k_UFlHA0xK.jpg', name: 'brunswick-dispensary-guide.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9af/mJtY3_vBJL0xSSzHi722a_MAAhBpVl.jpg', name: 'augusta-dispensary-guide.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9b1/k2rpauQbszZtcq3aXIY0e_3m4ATzJg.jpg', name: 'south-portland-dispensary-guide.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9b1/CccC2kJU5Mw-BnYDbzhhR_PBbw557b.jpg', name: 'scarborough-dispensary-guide.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9b2/WgMbfV71drgjZ0_Cra6X8_LgiwcdfF.jpg', name: 'westbrook-dispensary-guide.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9b5/Vojw_JlSeEsMG4NttoR9x_3dhx0u8d.jpg', name: 'saco-dispensary-guide.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9b2/Z9dPzf6R0bkrjnSkkx4dh_bWfPJ59C.jpg', name: 'old-orchard-beach-dispensary-guide.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9b2/MpcpW4Uhs79FehagCwzDq_ugHv5map.jpg', name: 'kittery-dispensary-guide.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9b7/ifJbrIEp140PxW0kJsN9H_67b5aRye.jpg', name: 'waterville-dispensary-guide.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9b7/D7po8c-DdO8T62o-xotEb_VqI2lAIW.jpg', name: 'auburn-dispensary-guide.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9b7/zTvfH6_DA8p4_LF2My1r6_bYDJe71S.jpg', name: 'sanford-dispensary-guide.jpg' },

  // Technical Guides (33)
  { url: 'https://v3b.fal.media/files/b/0a96d9b7/0Sf8b7vJLl16Vbo3gM7nh_R9JDlJD2.jpg', name: 'maine-dispensary-license.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9b7/-V51PjxQ8PYVYTKGrKJzH_gZc7gETI.jpg', name: 'maine-cannabis-cultivation-guide.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9b8/c5yGXrrBHkBou4BWjw8HL_hbHspYwW.jpg', name: 'maine-dispensary-business-plan.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9b9/OW24n1eP0St12l1-31dGr_QijaVclq.jpg', name: 'maine-cannabis-market.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9b9/9jmBqVlbTjMpLbzG5Y1g2_PxpKweuu.jpg', name: 'maine-dispensary-costs.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9b9/GHwuxIRhjZWICiboKS-he_DyP0mWGc.jpg', name: 'maine-dispensary-hiring.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9ba/oLlXg8epLs4-xy-Z5vFIa_GfEW032z.jpg', name: 'maine-cannabis-funding-guide.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9bd/91CqkyNL6KtN_ie9JgpXB_5hrgXEHv.jpg', name: 'maine-cannabis-real-estate.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9ba/Fe9g4M84nbEtRVfrX2xCe_jVwhzJxk.jpg', name: 'maine-dispensary-security.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9be/k13mPW3aELENLF-EdYIPT_eV5oYMEd.jpg', name: 'maine-dispensary-pos.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9be/Xv6KwmnW2zmKS2KIHIsal_pLZ9dnIw.jpg', name: 'maine-cannabis-product-testing-guide.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9bf/EhE_7FBuYXbc_6YVIzYx3_Ts65YuF8.jpg', name: 'maine-dispensary-packaging.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9bf/82OHMovbAcmvsxFcbGQmX_ExwQhAfj.jpg', name: 'maine-cannabis-waste-management.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9bf/WpT3eGvkWk0Ui8EAiUJMq_Au9RmD1v.jpg', name: 'maine-cannabis-edibles-compliance.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9bf/QZ4McFLV0s5WAt2v0g9DV_Tmp8K88t.jpg', name: 'maine-cannabis-delivery-rules.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9c1/soBIZ5au9Nsy4De8zMmlJ_A8Sg7noB.jpg', name: 'maine-cannabis-banking-solutions.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9c1/24-jb8431IuFqmLBO57h4_HpHCu3K1.jpg', name: 'maine-cannabis-staffing-licensing.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9c1/9AcOkyTt6nLOSGsP79Uxb_AVsEsIZy.jpg', name: 'maine-cannabis-extraction-licensing.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9c1/voOlCoxBicIFseu2bhV45_AHFx87pG.jpg', name: 'maine-cannabis-inventory-management.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9c2/YGLafLcseJD_ZOo06gyAL_JAlI4wSA.jpg', name: 'maine-metrc-compliance-guide.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9c2/Z05GFUe4reIleGKs1F__P_CiL98xd1.jpg', name: 'maine-cannabis-caregiver-guide.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9c3/nCtlJbjGOdkMRpLMitS8J_bIExLSNh.jpg', name: 'maine-cannabis-regulations.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9c3/sJwvsxWBXAH7MGeiIBcwU_ABS5JstV.jpg', name: 'maine-cannabis-vertical-integration.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9c4/27XJS4s8Xtn44OXHX7zi8_Eda4VspC.jpg', name: 'maine-cannabis-taxation-280e.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9c4/l5rVdDolm0FTq6XU1xOPP_axs4wUzW.jpg', name: 'maine-cannabis-taxes-2026.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9c4/QBlnfY1KuGph9_3_XyXrC_HRxUxyXa.jpg', name: 'maine-cannabis-marketing-compliance.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9c4/8-i46tqLyNIYk3-IAyYi6_HoePIQzO.jpg', name: 'maine-cannabis-business-insurance.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9c6/fcryhYs5gUk4j05B43ZUF_aXxnRUmp.jpg', name: 'maine-cannabis-workers-comp-insurance.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9c6/bL2qHrjfYKlVqbla-xHY1_rizJbKfB.jpg', name: 'maine-cannabis-events-2026.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9c6/5Yo_RZR8uXCkrSZIFnasJ_6433TqSI.jpg', name: 'maine-cannabis-vendor-directory.jpg' },

  // Blog Posts (7)
  { url: 'https://v3b.fal.media/files/b/0a96d9c6/RvV166iIDD4eKregnwHcE_iUnqcMuh.jpg', name: 'maine-home-grow-cannabis-guide-2026.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9c6/EukzljJ3wrk137HLzbfp5_Ml0JiUNS.jpg', name: 'maine-cannabis-delivery-business-guide-2026.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9ca/h7AXdXRL5pnlHJ5MzBfqw_LxsZ7jXl.jpg', name: 'maine-cannabis-microbusiness-license-2026.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9cd/4ieohDBub4VVj45G4VkGF_eHyv4GdT.jpg', name: 'maine-dispensary-how-to-open.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9cd/dDOr4m3m1vNefb7v7P6Cr_C9EcFErY.jpg', name: 'portland-maine-cannabis-rules-2026.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9cf/dmHkH8sE8T-sR68oauGqk_q5aqL61t.jpg', name: 'trump-psychedelic-executive-order-maine-psilocybin-2026.jpg' },

  // Founders (3)
  { url: 'https://v3b.fal.media/files/b/0a96d9cc/rqLcNKtaRuRgMxDvm48CW_8zAXIJcf.jpg', name: 'maine-cannabis-founder-portland-flagship.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9cc/gJ7K5kYQ-fDQt9qmsywd9_N48mKP9L.jpg', name: 'maine-cannabis-founder-rural-cultivator.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9cf/aJaIn2geUz_wLYsdzz45D_aDR9sc4f.jpg', name: 'maine-cannabis-founder-coastal-shop.jpg' },

  // Key Pages (10)
  { url: 'https://v3b.fal.media/files/b/0a96d9cd/jVb6hbnVofjrdVGDGkiTb_sK6MbksF.jpg', name: 'homepage.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9cf/9cWzDodDgrCd_Qz7oWTL0_soLWUAqq.jpg', name: 'directory.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9d0/FPOiIkzWsYWEacOjRGRZC_9Assv0DP.jpg', name: 'market-stats.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9d0/P_i4kdj50ezbcv-OhTa8l_Q10Klrp1.jpg', name: 'roi-calculator.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9d0/eHwM6dQmA6jgOHzuzVH2C_nHNCugRs.jpg', name: 'launch-checklist.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9cd/jVb6hbnVofjrdVGDGkiTb_sK6MbksF.jpg', name: 'start-here.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9cd/jVb6hbnVofjrdVGDGkiTb_sK6MbksF.jpg', name: 'about.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9cd/jVb6hbnVofjrdVGDGkiTb_sK6MbksF.jpg', name: 'contact.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9cd/jVb6hbnVofjrdVGDGkiTb_sK6MbksF.jpg', name: 'resources.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9cd/jVb6hbnVofjrdVGDGkiTb_sK6MbksF.jpg', name: 'glossary.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9cd/jVb6hbnVofjrdVGDGkiTb_sK6MbksF.jpg', name: 'all-guides.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9cd/jVb6hbnVofjrdVGDGkiTb_sK6MbksF.jpg', name: 'download-checklist.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9cd/jVb6hbnVofjrdVGDGkiTb_sK6MbksF.jpg', name: 'find-a-dispensary.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9cd/jVb6hbnVofjrdVGDGkiTb_sK6MbksF.jpg', name: 'site-health.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9cd/jVb6hbnVofjrdVGDGkiTb_sK6MbksF.jpg', name: 'privacy.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9cd/jVb6hbnVofjrdVGDGkiTb_sK6MbksF.jpg', name: 'founders-index.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9b7/0Sf8b7vJLl16Vbo3gM7nh_R9JDlJD2.jpg', name: 'portland-maine-cannabis.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9b7/0Sf8b7vJLl16Vbo3gM7nh_R9JDlJD2.jpg', name: 'maine-dispensary-locations.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9c6/5Yo_RZR8uXCkrSZIFnasJ_6433TqSI.jpg', name: 'resources-maine-cannabis-official-resources.jpg' },
  { url: 'https://v3b.fal.media/files/b/0a96d9c6/5Yo_RZR8uXCkrSZIFnasJ_6433TqSI.jpg', name: 'resources-maine-cannabis-education.jpg' },
];

const outDir = path.join(__dirname, '..', 'public', 'images', 'heroes');

async function downloadImage(url, name) {
  const filePath = path.join(outDir, name);
  if (fs.existsSync(filePath)) {
    console.log(`  ⏭  ${name} (already exists)`);
    return;
  }
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(buffer));
    console.log(`  ✅ ${name} (${(buffer.byteLength / 1024).toFixed(0)}KB)`);
  } catch (err) {
    console.error(`  ❌ ${name}: ${err.message}`);
  }
}

async function main() {
  console.log(`\nDownloading ${images.length} hero images to ${outDir}\n`);
  // Download in batches of 5 to avoid overwhelming the network
  for (let i = 0; i < images.length; i += 5) {
    const batch = images.slice(i, i + 5);
    await Promise.all(batch.map(img => downloadImage(img.url, img.name)));
  }
  console.log('\n✅ All downloads complete\n');
}

main().catch(console.error);
