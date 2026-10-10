import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function Recommendations() {
  redirect({ href: "/discover", locale: await getLocale() });
}
