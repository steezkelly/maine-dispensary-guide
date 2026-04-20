const fs = require('fs');
const path = require('path');

const files = [
  {
    file: 'src/pages/guides/biddeford-dispensary-guide.astro',
    old: "<tr><td><a href=\"/guides/portland-dispensary-guide/\">Portland</a></td><td>15 miles</td><td>Open</td></tr> </tbody> </table> <section> <h2>Nearby Markets</h2>",
    new: "<tr><td><a href=\"/guides/portland-dispensary-guide/\">Portland</a></td><td>15 miles</td><td>Open</td></tr> <tr><td><a href=\"/guides/sanford-dispensary-guide/\">Sanford</a></td><td>13 miles</td><td>York County opportunity</td></tr> </tbody> </table> <section> <h2>Nearby Markets</h2>"
  }
];

for (const f of files) {
  const content = fs.readFileSync(f.file, 'utf8');
  if (content.includes(f.old)) {
    const newContent = content.replace(f.old, f.new);
    fs.writeFileSync(f.file, newContent);
    console.log('Updated', f.file);
  } else {
    console.log('Pattern not found in', f.file);
  }
}