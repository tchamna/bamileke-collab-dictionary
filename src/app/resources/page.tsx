import { ExternalLink } from 'lucide-react';
import { LEARNING_RESOURCES } from '@/lib/learning-resources';

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
              <a href={resource.href} target="_blank" rel="noreferrer" className="block bg-[#ebe7dc]">
                <img src={resource.image} alt={resource.imageAlt} className="h-48 w-full object-cover" />
              </a>
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
