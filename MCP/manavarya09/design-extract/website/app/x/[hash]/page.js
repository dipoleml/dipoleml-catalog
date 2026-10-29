import { notFound } from 'next/navigation';
import { getCachedByHash } from '../../../lib/cache';
import { buildFiles, buildSummary } from '../../../lib/build-files';
import PermalinkViewer from './PermalinkViewer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function generateMetadata({ params }) {
  const { hash } = await params;
  const cached = await getCachedByHash(hash);
  if (!cached) {
    return {
      title: 'Extraction not found — designlang',
      description: 'This designlang permalink has expired or never existed. Run a fresh extraction at designlang.app.',
    };
  }
  const { design } = cached;
  const url = design.meta?.url || '';
  const title = design.meta?.title || url;
  const palette = (design.colors?.all || []).slice(0, 5).map((c) => c.hex).join(' · ');
  return {
    title: `${title} — design system extracted by designlang`,
    description: `${url} · ${design.colors?.all?.length ?? 0} colors · ${design.typography?.families?.[0]?.name || 'system'} · ${design.materialLanguage?.label || 'flat'} material · palette ${palette}.`,
    alternates: { canonical: `https://designlang.app/x/${hash}` },
    openGraph: {
      title: `${title} — designlang`,
      description: `Design system extracted from ${url}.`,
      url: `https://designlang.app/x/${hash}`,
    },
  };
}

export default async function PermalinkPage({ params }) {
  const { hash } = await params;
  const cached = await getCachedByHash(hash);
  if (!cached) notFound();

  const { design } = cached;
  const url = design.meta?.url || '';
  const { files } = buildFiles(design, url);
  const summary = buildSummary(design);

  return <PermalinkViewer hash={hash} url={url} title={design.meta?.title || url} summary={summary} files={files} />;
}
