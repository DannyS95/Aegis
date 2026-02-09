import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const AUTH_COOKIE_NAME = "aegis_auth";

export default async function HomePage() {
  const cookieStore = await cookies();
  const hasAuthCookie = Boolean(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  redirect(hasAuthCookie ? "/conversations" : "/login");
}
