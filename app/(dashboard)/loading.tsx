export default function DashboardLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-gray-200" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-28 rounded-xl bg-gray-100 border border-gray-200" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 rounded-xl bg-gray-100 border border-gray-200" />
        <div className="h-64 rounded-xl bg-gray-100 border border-gray-200" />
      </div>
    </div>
  );
}
