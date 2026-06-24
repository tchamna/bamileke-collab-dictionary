import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import xlsx from 'xlsx';

const { Pool } = pg;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const skipGithubBackup = args.includes('--skip-github-backup') || process.env.SKIP_GITHUB_BACKUP === '1';
const workbookArg = args.find((arg) => !arg.startsWith('--'));
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultWorkbook = path.resolve(repoRoot, '..', 'nufi_dictionary_transformed - Current.xlsx');
const workbookPath = workbookArg ? path.resolve(workbookArg) : defaultWorkbook;
const databaseUrl = process.env.DATABASE_URL;
const importSheetName = 'Ready';
const backupDir = path.resolve(repoRoot, '..', 'db-backups');

if (!databaseUrl) {
  console.error('DATABASE_URL is required. Use your Neon pooled PostgreSQL connection string.');
  process.exit(1);
}

if (!fs.existsSync(workbookPath)) {
  console.error(`Workbook not found: ${workbookPath}`);
  process.exit(1);
}

const workbook = xlsx.readFile(workbookPath, { cellDates: false });
const sheet = workbook.Sheets[importSheetName];
if (!sheet) {
  console.error(`Sheet "${importSheetName}" not found. Available sheets: ${workbook.SheetNames.join(', ')}`);
  process.exit(1);
}

const workbookRows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
const records = buildImportRecords(workbookRows);
const pool = new Pool({
  connectionString: databaseUrl,
  max: 2,
  ssl: { rejectUnauthorized: false },
});

if (!dryRun) {
  const backupPath = await backupDatabase();
  console.log(`Database backup created: ${backupPath}`);
  if (skipGithubBackup) {
    console.log('GitHub backup workflow skipped by --skip-github-backup / SKIP_GITHUB_BACKUP=1.');
  } else {
    const runUrl = await createGithubBackup();
    console.log(`GitHub backup artifact created by workflow run: ${runUrl}`);
  }
}

await ensureSchema();

const client = await pool.connect();
const stats = {
  workbookRows: workbookRows.length,
  readyRecords: records.length,
  mergedWorkbookRows: workbookRows.length - records.length,
  mergedDatabaseRows: 0,
  inserted: 0,
  updated: 0,
  unchanged: 0,
  staleDatabaseRows: 0,
};

try {
  await client.query('BEGIN');
  stats.mergedDatabaseRows = await mergeExistingDuplicateFrenchRows(client);
  if (!dryRun) await ensureUniqueFrenchIndex(client);

  const existingRows = (
    await client.query(`
      SELECT id, french, english, nufi_json, search_text, source_row, import_key
      FROM predefined_words
      ORDER BY id ASC
    `)
  ).rows.map((row) => ({
    ...row,
    nufi_json: Array.isArray(row.nufi_json) ? row.nufi_json : [],
  }));

  const existingByImportKey = new Map();
  const existingByComputedKey = new Map();
  const existingByFrench = new Map();
  const existingBySourceRow = new Map();

  for (const row of assignImportKeys(existingRows)) {
    if (row.import_key) existingByImportKey.set(row.import_key, row);
    existingByComputedKey.set(row.importKey, row);
    const sourceRowBucket = existingBySourceRow.get(row.source_row) ?? [];
    sourceRowBucket.push(row);
    existingBySourceRow.set(row.source_row, sourceRowBucket);
    const frenchKey = normalizeForKey(row.french);
    const bucket = existingByFrench.get(frenchKey) ?? [];
    bucket.push(row);
    existingByFrench.set(frenchKey, bucket);
  }

  const touchedIds = new Set();
  const updatedSourceRows = new Set();

  for (const record of records) {
    const existing = findExistingRecord(record, existingByImportKey, existingByComputedKey, existingBySourceRow, existingByFrench, touchedIds);
    if (!existing) {
      if (!dryRun) {
        const result = await client.query(
          `
          INSERT INTO predefined_words (french, english, nufi_json, search_text, source_row, import_key)
          VALUES ($1, $2, $3::jsonb, $4, $5, $6)
          RETURNING id
        `,
          [record.french, record.english, JSON.stringify(record.nufiValues), record.searchText, record.sourceRow, record.importKey]
        );
        touchedIds.add(result.rows[0].id);
      }
      updatedSourceRows.add(record.sourceRow);
      stats.inserted += 1;
      continue;
    }

    touchedIds.add(existing.id);
    updatedSourceRows.add(record.sourceRow);

    const changed =
      existing.french !== record.french ||
      existing.english !== record.english ||
      JSON.stringify(existing.nufi_json) !== JSON.stringify(record.nufiValues) ||
      existing.search_text !== record.searchText ||
      existing.source_row !== record.sourceRow ||
      existing.import_key !== record.importKey;

    if (!changed) {
      stats.unchanged += 1;
      continue;
    }

    if (!dryRun) {
      await client.query(
        `
        UPDATE predefined_words
        SET french = $2,
            english = $3,
            nufi_json = $4::jsonb,
            search_text = $5,
            source_row = $6,
            import_key = $7,
            updated_at = now()
        WHERE id = $1
      `,
        [existing.id, record.french, record.english, JSON.stringify(record.nufiValues), record.searchText, record.sourceRow, record.importKey]
      );
    }
    stats.updated += 1;
  }

  stats.staleDatabaseRows = existingRows.filter((row) => !touchedIds.has(row.id)).length;

  if (dryRun) {
    await client.query('ROLLBACK');
  } else {
    await client.query('COMMIT');
  }
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}

console.log(`${dryRun ? 'Dry run' : 'Upsert'} completed for ${importSheetName} sheet.`);
console.table(stats);
if (stats.staleDatabaseRows > 0) {
  console.log('Stale database rows were left untouched. Contributions remain attached to their existing base words.');
}

async function backupDatabase() {
  fs.mkdirSync(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `neon-before-ready-import-${timestamp}.json`);
  const tables = {};

  const tableRows = (
    await pool.query(
      `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `
    )
  ).rows;

  for (const { table_name: tableName } of tableRows) {
    tables[tableName] = (await pool.query(`SELECT * FROM ${quoteIdentifier(tableName)} ORDER BY 1`)).rows;
  }

  fs.writeFileSync(
    backupPath,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        database: databaseUrl.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@'),
        tables,
      },
      null,
      2
    ),
    'utf8'
  );

  return backupPath;
}

async function createGithubBackup() {
  const workflowFile = 'postgres-backup.yml';
  const branch = execFileSync('git', ['branch', '--show-current'], { cwd: repoRoot, encoding: 'utf8' }).trim() || 'main';
  const startedAt = new Date();

  try {
    execFileSync('gh', ['workflow', 'run', workflowFile, '--ref', branch], { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    throw new Error(`Could not start GitHub backup workflow before import. Ensure gh is installed and authenticated. ${error.stderr ?? error.message}`);
  }

  const run = await findStartedGithubRun(workflowFile, startedAt);
  console.log(`Waiting for GitHub backup workflow run ${run.databaseId} to finish...`);

  try {
    execFileSync('gh', ['run', 'watch', String(run.databaseId), '--exit-status', '--interval', '10'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    throw new Error(`GitHub backup workflow failed before import. Database was not modified. ${error.stderr ?? error.message}`);
  }

  return run.url;
}

async function findStartedGithubRun(workflowFile, startedAt) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const output = execFileSync(
      'gh',
      ['run', 'list', '--workflow', workflowFile, '--event', 'workflow_dispatch', '--limit', '10', '--json', 'databaseId,createdAt,url'],
      { cwd: repoRoot, encoding: 'utf8' }
    );
    const runs = JSON.parse(output);
    const run = runs
      .filter((item) => Date.parse(item.createdAt) >= startedAt.getTime() - 5_000)
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0];
    if (run) return run;
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }

  throw new Error('Could not find the GitHub backup workflow run after starting it. Database was not modified.');
}

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS predefined_words (
      id              INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      french          TEXT NOT NULL,
      english         TEXT NOT NULL DEFAULT '',
      nufi_json       JSONB NOT NULL DEFAULT '[]'::jsonb,
      search_text     TEXT NOT NULL DEFAULT '',
      source_row      INTEGER NOT NULL,
      import_key      TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    ALTER TABLE predefined_words DROP CONSTRAINT IF EXISTS predefined_words_source_row_key;
    ALTER TABLE predefined_words ADD COLUMN IF NOT EXISTS import_key TEXT;

    CREATE TABLE IF NOT EXISTS contributions (
      id               INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      word_id          INTEGER NOT NULL REFERENCES predefined_words(id) ON DELETE CASCADE,
      language         TEXT NOT NULL,
      translation      TEXT NOT NULL,
      synonyms         TEXT NOT NULL DEFAULT '',
      contributor_name TEXT NOT NULL DEFAULT '',
      notes            TEXT NOT NULL DEFAULT '',
      status           TEXT NOT NULL DEFAULT 'pending',
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    ALTER TABLE contributions ALTER COLUMN status SET DEFAULT 'pending';

    CREATE TABLE IF NOT EXISTS admin_users (
      email               TEXT PRIMARY KEY,
      password_hash       TEXT NOT NULL,
      password_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_predefined_words_search
      ON predefined_words (search_text);

    CREATE INDEX IF NOT EXISTS idx_predefined_words_source_row
      ON predefined_words (source_row);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_predefined_words_import_key
      ON predefined_words (import_key)
      WHERE import_key IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_contributions_word_language
      ON contributions (word_id, language, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_contributions_status
      ON contributions (status);
  `);
}

async function ensureUniqueFrenchIndex(client) {
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_predefined_words_french_unique
      ON predefined_words (lower(french));
  `);
}

function buildImportRecords(rows) {
  const baseRecords = rows
    .map((row, index) => {
      const french = normalizeCell(row.French);
      if (!french) return null;

      const english = normalizeCell(row.English);
      const nufiValues = [];
      for (let i = 1; i <= 14; i += 1) {
        const value = normalizeCell(row[`Nufi_${i}`]);
        if (value) nufiValues.push(value);
      }

      return {
        french,
        english,
        nufiValues,
        searchText: [french, english, ...nufiValues].join(' ').toLocaleLowerCase(),
        sourceRow: index + 2,
      };
    })
    .filter(Boolean);

  return assignImportKeys(mergeDuplicateFrenchRecords(baseRecords));
}

function mergeDuplicateFrenchRecords(records) {
  const groupedRecords = new Map();
  for (const record of records) {
    const frenchKey = normalizeForKey(record.french);
    const current = groupedRecords.get(frenchKey);
    if (!current) {
      groupedRecords.set(frenchKey, { ...record, nufiValues: uniqueValues(record.nufiValues) });
      continue;
    }

    const mergedNufiValues = uniqueValues([...current.nufiValues, ...record.nufiValues]);
    groupedRecords.set(frenchKey, {
      ...current,
      english: current.english || record.english,
      nufiValues: mergedNufiValues,
      searchText: [current.french, current.english || record.english, ...mergedNufiValues].join(' ').toLocaleLowerCase(),
      sourceRow: Math.min(current.sourceRow, record.sourceRow),
    });
  }

  return [...groupedRecords.values()].sort((left, right) => left.sourceRow - right.sourceRow);
}

async function mergeExistingDuplicateFrenchRows(client) {
  const existingRows = (
    await client.query(`
      SELECT id, french, english, nufi_json, source_row
      FROM predefined_words
      ORDER BY source_row ASC, id ASC
    `)
  ).rows.map((row) => ({
    ...row,
    nufi_json: Array.isArray(row.nufi_json) ? row.nufi_json : [],
  }));

  const groupedRows = new Map();
  for (const row of existingRows) {
    const frenchKey = normalizeForKey(row.french);
    const bucket = groupedRows.get(frenchKey) ?? [];
    bucket.push(row);
    groupedRows.set(frenchKey, bucket);
  }

  let mergedRows = 0;
  for (const rows of groupedRows.values()) {
    if (rows.length < 2) continue;

    const [survivor, ...duplicates] = rows;
    const duplicateIds = duplicates.map((row) => row.id);
    const mergedNufiValues = uniqueValues(rows.flatMap((row) => row.nufi_json));
    const english = rows.find((row) => row.english)?.english ?? '';
    const sourceRow = Math.min(...rows.map((row) => row.source_row));
    const searchText = [survivor.french, english, ...mergedNufiValues].join(' ').toLocaleLowerCase();
    const importKey = `${buildNaturalKey({ french: survivor.french, nufiValues: mergedNufiValues })}#1`;

    if (!dryRun) {
      await client.query(`UPDATE contributions SET word_id = $1 WHERE word_id = ANY($2::int[])`, [survivor.id, duplicateIds]);
      await client.query(`DELETE FROM predefined_words WHERE id = ANY($1::int[])`, [duplicateIds]);
      await client.query(
        `
        UPDATE predefined_words
        SET english = $2,
            nufi_json = $3::jsonb,
            search_text = $4,
            source_row = $5,
            import_key = $6,
            updated_at = now()
        WHERE id = $1
      `,
        [survivor.id, english, JSON.stringify(mergedNufiValues), searchText, sourceRow, importKey]
      );
    }

    mergedRows += duplicateIds.length;
  }

  return mergedRows;
}

function uniqueValues(values) {
  const seen = new Set();
  const unique = [];
  for (const value of values) {
    const normalizedValue = normalizeForKey(value);
    if (!normalizedValue || seen.has(normalizedValue)) continue;
    seen.add(normalizedValue);
    unique.push(value);
  }
  return unique;
}

function assignImportKeys(rows) {
  const occurrences = new Map();
  return rows.map((row) => {
    const naturalKey = buildNaturalKey(row);
    const occurrence = (occurrences.get(naturalKey) ?? 0) + 1;
    occurrences.set(naturalKey, occurrence);
    return { ...row, importKey: `${naturalKey}#${occurrence}` };
  });
}

function findExistingRecord(record, existingByImportKey, existingByComputedKey, existingBySourceRow, existingByFrench, touchedIds) {
  const direct = existingByImportKey.get(record.importKey);
  if (direct && !touchedIds.has(direct.id)) return direct;

  const computed = existingByComputedKey.get(record.importKey);
  if (computed && !touchedIds.has(computed.id)) return computed;

  const frenchMatches = (existingByFrench.get(normalizeForKey(record.french)) ?? []).filter((row) => !touchedIds.has(row.id));
  if (frenchMatches.length === 1) return frenchMatches[0];

  const sameNufi = frenchMatches.filter((row) => JSON.stringify(row.nufi_json) === JSON.stringify(record.nufiValues));
  if (sameNufi.length === 1) return sameNufi[0];

  const sourceRowMatches = (existingBySourceRow.get(record.sourceRow) ?? []).filter((row) => !touchedIds.has(row.id));
  if (sourceRowMatches.length === 1 && normalizeForKey(sourceRowMatches[0].french) === normalizeForKey(record.french)) {
    return sourceRowMatches[0];
  }

  return null;
}

function buildNaturalKey(row) {
  const raw = normalizeForKey(row.french);
  return crypto.createHash('sha1').update(raw).digest('hex');
}

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function normalizeForKey(value) {
  return normalizeCell(value)
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function normalizeCell(value) {
  if (value === null || value === undefined) return '';
  return stripTerminalPunctuation(String(value).replace(/\s+/g, ' ').trim());
}

function stripTerminalPunctuation(value) {
  return value.replace(/[\s.;,:؛،]+$/u, '').trim();
}
