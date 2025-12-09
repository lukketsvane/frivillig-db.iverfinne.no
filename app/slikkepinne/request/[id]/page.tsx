import { RequestView } from "@/components/slikkepinne/request-view"

export default async function RequestPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#d4fc79] via-[#96e6a1] to-[#d4fc79]">
      <div className="mx-auto max-w-md px-4 py-8">
        <RequestView id={id} />
      </div>
    </main>
  )
}
