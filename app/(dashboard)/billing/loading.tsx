export default function BillingLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-24 rounded-lg bg-gray-200" />
      <div className="flex gap-1 w-fit">
        {[1,2,3,4].map(i => <div key={i} className="h-8 w-20 rounded-md bg-gray-100" />)}
      </div>
      <div className="rounded-xl bg-white border border-gray-200">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="h-12 border-b border-gray-100" />
        ))}
      </div>
    </div>
  );
}
