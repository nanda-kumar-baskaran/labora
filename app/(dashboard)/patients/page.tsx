import Link from "next/link";
import { requireSession } from "@/lib/session";
import { getRepository } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserPlus, Search } from "lucide-react";
import { format } from "date-fns";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const session = await requireSession();
  const repo = await getRepository();
  const search = sp.q ?? "";
  const page = parseInt(sp.page ?? "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const { data: patients, count } = await repo.listPatients(session.tenant_id, search, {
    limit, offset, orderBy: "created_at", orderDir: "desc"
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-sm text-gray-500 mt-1">{count ?? 0} total patients</p>
        </div>
        <Link href="/patients/new">
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            New Patient
          </Button>
        </Link>
      </div>

      {/* Search */}
      <form method="GET" className="mb-6 flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            name="q"
            defaultValue={search}
            placeholder="Search name, phone, patient ID..."
            className="flex h-10 w-full rounded-xl pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-colors"
          />
        </div>
        <Button type="submit" variant="outline">Search</Button>
        {search && <Link href="/patients"><Button variant="ghost">Clear</Button></Link>}
      </form>

      <div className="rounded-xl overflow-hidden border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!patients?.length && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-400 py-12">
                  {search ? "No patients found for your search." : "No patients yet. Register the first one!"}
                </TableCell>
              </TableRow>
            )}
            {patients?.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs text-gray-400">{p.patient_code}</TableCell>
                <TableCell className="font-medium">{p.full_name}</TableCell>
                <TableCell className="text-gray-500">{p.phone ?? "—"}</TableCell>
                <TableCell>
                  {p.gender ? (
                    <Badge variant={p.gender === "male" ? "default" : p.gender === "female" ? "secondary" : "outline"}>
                      {p.gender}
                    </Badge>
                  ) : "—"}
                </TableCell>
                <TableCell className="text-gray-500">
                  {p.age_years != null ? `${p.age_years}y` : p.dob ? `DOB: ${format(new Date(p.dob), "dd/MM/yyyy")}` : "—"}
                </TableCell>
                <TableCell className="text-gray-400 text-xs">{format(new Date(p.created_at), "dd MMM yyyy")}</TableCell>
                <TableCell>
                  <Link href={`/patients/${p.id}`} className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors">
                    View
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {(count ?? 0) > limit && (
        <div className="flex justify-between items-center mt-4 text-sm text-gray-400">
          <span>Page {page} of {Math.ceil((count ?? 0) / limit)}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`/patients?q=${search}&page=${page - 1}`}>
                <Button variant="outline" size="sm">Previous</Button>
              </Link>
            )}
            {offset + limit < (count ?? 0) && (
              <Link href={`/patients?q=${search}&page=${page + 1}`}>
                <Button variant="outline" size="sm">Next</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
