$file = "C:\Users\Steve\OpenCode Projects\project-1\src\pages\guides\old-orchard-beach-dispensary-guide.astro"
$content = Get-Content $file -Raw

# Fix 1: Break up long opening paragraph
$content = $content -replace 'Old Orchard Beach is a premier tourist destination with 8,000\+ year-round residents and 100,000\+ summer visitors annually\. The summer tourist population creates significant seasonal revenue opportunity\. Unlike Portland'"'"'s saturated market or Saco'"'"'s modest traffic, OOB sits in a sweet spot: enough permanent residents to sustain baseline operations, with a tourist surge that can multiply revenue by 3-5x from May through September\.', 'Old Orchard Beach is a premier tourist destination with 8,000+ year-round residents. It also sees 100,000+ summer visitors annually. This creates significant seasonal revenue opportunity. Unlike Portland'"'"'s saturated market, OOB sits in a sweet spot. It has enough permanent residents to sustain baseline operations. The tourist surge can multiply revenue by 3-5x from May through September.'

# Fix 2: Simplify town identity paragraph
$content = $content -replace 'The town'"'"'s identity as a beach resort means visitors arrive with disposable income and vacation mindset\. They are not price-shopping\. They want quality, consistency, and a comfortable purchasing experience\. For dispensary operators, this translates to higher average transaction values and less negotiation pressure than you'"'"'d encounter in a typical adult-use market\.', 'The town'"'"'s identity as a beach resort means visitors arrive with disposable income. They have a vacation mindset. They are not price-shopping. They want quality, consistency, and a comfortable purchasing experience. For dispensary operators, this means higher average transaction values. They face less negotiation pressure than in a typical adult-use market.'

# Fix 3: Simplify competitive landscape paragraph
$content = $content -replace 'The competitive landscape is equally compelling\. With only one to two existing dispensaries serving the entire seasonal population, the market is significantly under-served\. A well-positioned dispensary on Portland Avenue or Route 1 can capture tourist traffic that currently has limited options\.', 'The competitive landscape is equally compelling. Only one to two existing dispensaries serve the entire seasonal population. The market is significantly under-served. A well-positioned dispensary on Portland Avenue or Route 1 can capture tourist traffic. This traffic currently has limited options.'

# Fix 4: Simplify regulatory framework paragraph
$content = $content -replace 'Old Orchard Beach dispensaries operate under Maine'"'"'s adult-use cannabis regulations, governed by the Office of Cannabis Policy (OCP) under .*?\. All retail dispensaries must obtain an Adult-Use Retail License from the OCP before commencing operations\.', 'Old Orchard Beach dispensaries operate under Maine'"'"'s adult-use cannabis regulations. The OCP governs these regulations. All retail dispensaries must obtain an Adult-Use Retail License from the OCP before commencing operations.'

# Fix 5: Simplify startup economics paragraph
$content = $content -replace 'Opening a dispensary in Old Orchard Beach requires capital investment of \$300,000-400,000 for a standard 800-1,200 square foot retail location\. This breaks down across several categories that operators should budget carefully\.', 'Opening a dispensary in Old Orchard Beach requires significant capital investment. Expect to invest $300,000-400,000 for a standard 800-1,200 square foot retail location. This breaks down across several categories. Operators should budget carefully for each one.'

Set-Content $file $content -NoNewline
Write-Host "Done"
