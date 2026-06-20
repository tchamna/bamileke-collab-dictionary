const baseUrl = (process.env.PRODUCTION_URL || process.argv[2] || 'https://bamileke-collab-dictionary.azurewebsites.net').replace(/\/$/, '');

const checks = [
  { name: 'home page', path: '/', expectAnyText: ['Translate the French list', 'Traduire la liste'] },
  { name: 'words API', path: '/api/words?language=ghomala', expectJsonRows: true },
  { name: 'leaderboard API', path: '/api/leaderboard', expectJsonRows: true },
  { name: 'leaderboard page', path: '/leaderboard', expectText: 'Classement des contributeurs' },
  { name: 'compare page', path: '/compare', expectAnyText: ['community translations', 'traductions communautaires'] },
];

async function checkEndpoint(check) {
  const url = `${baseUrl}${check.path}`;
  const response = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`${check.name} returned HTTP ${response.status}`);
  }

  if (check.expectText && !body.includes(check.expectText)) {
    throw new Error(`${check.name} did not contain expected text: ${check.expectText}`);
  }

  if (check.expectAnyText && !check.expectAnyText.some((text) => body.includes(text))) {
    throw new Error(`${check.name} did not contain any expected text: ${check.expectAnyText.join(' | ')}`);
  }

  if (check.expectJsonRows) {
    const json = JSON.parse(body);
    if (!Array.isArray(json.rows)) {
      throw new Error(`${check.name} did not return a rows array`);
    }
  }

  return { name: check.name, status: response.status };
}

const failures = [];
for (const check of checks) {
  try {
    const result = await checkEndpoint(check);
    console.log(`OK ${result.status} ${result.name}`);
  } catch (error) {
    failures.push(`${check.name}: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`FAIL ${check.name}`);
  }
}

if (failures.length > 0) {
  console.error('\nProduction verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`\nProduction verification passed for ${baseUrl}`);
