import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function Home() {
  const mode = process.env.STORAGE_MODE ?? "cloud";

  if (mode === "local") {
    // Check if authenticated first
    const cookieStore = await cookies();
    const session = cookieStore.get("labms_local_session");
    if (session?.value) {
      redirect("/dashboard");
    }
    // Not authenticated — go to login (login page will show setup link if needsSetup)
    redirect("/login");
  }

  redirect("/dashboard");
}
