// Quick test: list GA4 properties + GSC sites the service account can see.
// Run: GOOGLE_APPLICATION_CREDENTIALS=/home/steve/.hermes/secrets/gcp-mdg-reader.json node /tmp/mdg-gsc-ga4-list.cjs

const {google} = require('googleapis');

(async () => {
  const auth = new google.auth.GoogleAuth({
    scopes: [
      'https://www.googleapis.com/auth/analytics.readonly',
      'https://www.googleapis.com/auth/webmasters.readonly',
    ],
  });
  const client = await auth.getClient();
  console.log('client_email:', client.email, '\n');

  console.log('=== GA4 accounts ===');
  const admin = google.analyticsadmin({version: 'v1beta', auth: client});
  try {
    const accounts = await admin.accounts.list();
    const accs = accounts.data.accounts || [];
    console.log('count:', accs.length);
    for (const acc of accs) {
      console.log(' account:', acc.name, '-', acc.displayName);
      const props = await admin.properties.list({filter: 'parent:' + acc.name});
      for (const p of props.data.properties || []) {
        console.log('   property:', p.name, '-', p.displayName);
      }
    }
  } catch (e) {
    console.log('list error:', e.message.split('\n')[0]);
  }

  console.log('\n=== GSC sites ===');
  const sc = google.searchconsole({version: 'v1', auth: client});
  try {
    const sites = await sc.sites.list();
    const list = sites.data.siteEntry || [];
    console.log('count:', list.length);
    for (const s of list) {
      console.log(' site:', s.siteUrl, '(permission:', s.permissionLevel + ')');
    }
  } catch (e) {
    console.log('list error:', e.message.split('\n')[0]);
  }
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
