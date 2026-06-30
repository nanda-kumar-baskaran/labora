export default function DoctorsLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-24 rounded-lg bg-gray-200" />
        <div className="h-10 w-32 rounded-lg bg-gray-100" />
      </div>
      <div className="rounded-xl bg-white border border-gray-200">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="h-12 border-b border-gray-100" />
        ))}
      </div>
    </div>
  );
}
