import { ExternalLink } from 'lucide-react';
import { LEARNING_RESOURCES } from '@/lib/learning-resources';

function GoogleDriveMark() {
  return (
    <svg viewBox="0 0 96 84" aria-hidden="true" className="h-20 w-24 drop-shadow-sm">
      <path d="M33.5 3h29L96 61H67L33.5 3Z" fill="#fbbc04" />
      <path d="M0 61 33.5 3 48 28 29 61H0Z" fill="#34a853" />
      <path d="M29 61h67L81.5 84H14.5L29 61Z" fill="#4285f4" />
      <path d="M48 28 67 61H29L48 28Z" fill="#188038" opacity="0.78" />
    </svg>
  );
}

export default function ResourcesPage() {
  return (
    <main className="min-h-screen bg-[#f2f4ee] text-[#17211c]">
      <section className="border-b border-[#d8d6c8] bg-[#fbfaf6]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#355f4f]">Resources</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-[#17211c] sm:text-5xl">Bamileke learning resources</h1>
          <p className="mt-3 max-w-3xl text-base font-medium leading-7 text-[#5c655b]">
            Books, courses, apps, and language services for learners who want to go deeper after practicing in the game.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {LEARNING_RESOURCES.map((resource) => (
            <article key={resource.title} className="overflow-hidden rounded-xl border border-[#d8d6c8] bg-white shadow-sm">
              {resource.image ? (
                <a href={resource.href} target="_blank" rel="noreferrer" className="block bg-[#ebe7dc]">
                  <img src={resource.image} alt={resource.imageAlt ?? resource.title} className="h-48 w-full object-cover" />
                </a>
              ) : (
                <a
                  href={resource.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-48 flex-col items-center justify-center gap-3 bg-[#f7fafc] px-6 text-center text-2xl font-semibold text-[#295f4e]"
                >
                  <GoogleDriveMark />
                  {resource.title}
                </a>
              )}
              <div className="grid gap-4 p-4">
                <div>
                  <span className="inline-flex rounded-full border border-[#d8d6c8] bg-[#fbfaf6] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#5e665f]">
                    {resource.category}
                  </span>
                  <h2 className="mt-3 text-xl font-semibold leading-snug text-[#17211c]">{resource.title}</h2>
                  <p className="mt-2 text-sm font-medium leading-6 text-[#62685d]">{resource.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={resource.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#2f6b58] px-3 text-sm font-semibold text-white shadow-sm hover:bg-[#255645]"
                  >
                    {resource.action}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  {resource.secondaryHref ? (
                    <a
                      href={resource.secondaryHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#c9cabc] bg-white px-3 text-sm font-semibold text-[#355f4f] shadow-sm hover:border-[#2f6b58]"
                    >
                      {resource.secondaryAction}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
