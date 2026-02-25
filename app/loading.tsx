export default function Loading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div
        className="size-10 rounded-full border-2 border-primary border-t-transparent animate-spin"
        aria-hidden
      />
    </div>
  )
}
