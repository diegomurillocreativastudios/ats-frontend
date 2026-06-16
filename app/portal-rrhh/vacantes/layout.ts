import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("Metadata.recruiterVacancies");

  return {
    title: { absolute: t("title") },
    description: t("description"),
  };
}

export default function VacantesLayout({ children }) {
  return children;
}
