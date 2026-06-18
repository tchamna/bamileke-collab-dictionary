import { NextRequest, NextResponse } from 'next/server';
import { getContributorSession, normalizeContributorEmail } from '@/lib/contributorAuth';
import { listContributorContributionsForExport } from '@/lib/db';

function csvValue(value: unknown) {
  const text = value == null ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function csvRow(values: unknown[]) {
  return values.map(csvValue).join(',');
}

function exportFileName(email: string) {
  const safeEmail = email.replace(/[^a-z0-9._-]/gi, '_');
  return `bamileke-contributions-${safeEmail}.csv`;
}

export async function GET(request: NextRequest) {
  const session = await getContributorSession();
  const requestedEmail = request.nextUrl.searchParams.get('email') ?? '';
  const email = normalizeContributorEmail(session?.email || requestedEmail);

  if (!email) {
    return NextResponse.json({ error: 'Contributor email is required.' }, { status: 400 });
  }

  const rows = await listContributorContributionsForExport(email);
  const header = [
    'created_at',
    'status',
    'language',
    'french',
    'english',
    'nufi',
    'translation',
    'synonyms',
    'notes',
    'contributor_name',
    'contributor_email',
  ];

  const csv = [
    csvRow(header),
    ...rows.map((row) =>
      csvRow([
        row.created_at.toISOString(),
        row.status,
        row.language,
        row.french,
        row.english,
        row.nufi_json.join(' / '),
        row.translation,
        row.synonyms,
        row.notes,
        row.contributor_name,
        row.contributor_email,
      ])
    ),
  ].join('\r\n');

  return new NextResponse(`\uFEFF${csv}\r\n`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${exportFileName(email)}"`,
      'Cache-Control': 'no-store',
    },
  });
}
