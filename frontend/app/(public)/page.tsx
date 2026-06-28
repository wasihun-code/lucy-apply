import Link from 'next/link'
import { Search, FileText, TrendingUp } from 'lucide-react'
import { fetchAPI, type University, type PaginatedResponse } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { UniversityCard } from '@/components/shared/UniversityCard'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  let universities: University[] = []
  try {
    const data = await fetchAPI<PaginatedResponse<University>>('universities/')
    universities = data.results.slice(0, 6)
  } catch {}

  return (
    <div>
      <section className="bg-background py-20">
        <div className="max-w-3xl mx-auto text-center px-4">
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-text-900 leading-tight">
            Apply to Ethiopian Universities &mdash; All in One Place
          </h1>
          <p className="text-lg text-text-600 mt-4 max-w-2xl mx-auto">
            Browse programs, submit your application, and track your admission
            status from anywhere in the world.
          </p>
          <div className="flex items-center justify-center gap-4 mt-8">
            <Link href="/universities">
              <Button variant="primary" size="lg">
                Browse Programs
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="secondary" size="lg">
                How It Works
              </Button>
            </a>
          </div>
        </div>
      </section>

      {universities.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-display font-bold text-text-900 mb-8">
              Partner Universities
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {universities.map((u) => (
                <UniversityCard key={u.id} university={u} />
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link
                href="/universities"
                className="text-primary text-sm font-medium hover:underline"
              >
                View all universities &rarr;
              </Link>
            </div>
          </div>
        </section>
      )}

      <section id="how-it-works" className="bg-background py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-display font-bold text-text-900 text-center mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Search className="w-8 h-8" />,
                step: 1,
                title: 'Browse Programs',
                description:
                  'Explore programs across Ethiopian universities. Filter by degree level and find the right fit.',
              },
              {
                icon: <FileText className="w-8 h-8" />,
                step: 2,
                title: 'Apply Online',
                description:
                  'Submit your application, upload documents, and pay fees — all from one dashboard.',
              },
              {
                icon: <TrendingUp className="w-8 h-8" />,
                step: 3,
                title: 'Track Your Status',
                description:
                  'Monitor your application progress, receive decisions, and respond to offers in real time.',
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary-soft text-primary flex items-center justify-center mx-auto mb-4">
                  {item.icon}
                </div>
                <div className="w-8 h-8 rounded-full bg-primary text-white text-sm font-display font-bold flex items-center justify-center mx-auto mb-3">
                  {item.step}
                </div>
                <h3 className="text-lg font-display font-semibold text-text-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-text-600 max-w-xs mx-auto">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary-soft py-16">
        <div className="max-w-3xl mx-auto text-center px-4">
          <h2 className="text-2xl font-display font-bold text-text-900 mb-4">
            Ready to start your application?
          </h2>
          <Link href="/register">
            <Button variant="primary" size="lg">
              Create Free Account
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
