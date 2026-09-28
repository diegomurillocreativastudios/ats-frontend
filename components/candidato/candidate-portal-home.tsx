"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { CandidatePortalShell } from "@/components/candidato/candidate-portal-shell";
import StatCard from "@/components/candidato/StatCard";
import NextActivitiesCard from "@/components/candidato/NextActivitiesCard";
import MyPostulationsCard from "@/components/candidato/MyPostulationsCard";
import ProcessTrackingCard from "@/components/candidato/ProcessTrackingCard";
import PortalPageHeader from "@/components/ui/PortalPageHeader";
import { useCandidateDashboard } from "@/hooks/useCandidateDashboard";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getCandidateGreetingFirstName } from "@/lib/candidate-portal-greeting";
import type { CandidatePortalApplicationRow } from "@/lib/candidate-dashboard";

export default function CandidatePortalHome() {
  const t = useTranslations("CandidatePortal.home");
  const { data, loading, error } = useCandidateDashboard();
  const { user, loading: userLoading } = useCurrentUser();

  const greetingName = getCandidateGreetingFirstName(
    data?.greetingName ?? null,
    user?.name ?? null,
    user?.email ?? null
  );

  const stats = data?.stats ?? null;
  const activities = data?.activities ?? [];
  const applications = data?.applications ?? [];

  const [selectedApplication, setSelectedApplication] = useState<
    CandidatePortalApplicationRow | null
  >(null);

  useEffect(() => {
    if (applications.length > 0 && !selectedApplication) {
      setSelectedApplication(applications[0]);
    }
  }, [applications, selectedApplication]);

  const handleSelectApplication = (application: CandidatePortalApplicationRow) => {
    setSelectedApplication(application);
  };

  return (
    <CandidatePortalShell>
      <div className="min-w-0 flex flex-col gap-5 p-4 md:gap-6 md:p-6 lg:gap-8 lg:p-8">
        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 font-sans text-sm text-destructive md:px-4 md:py-3"
          >
            {error}
          </div>
        ) : null}
        <PortalPageHeader
          title={
            userLoading && !data && !error
              ? t("loading")
              : t("greeting", { name: greetingName })
          }
          description={t("description")}
          className="pb-0"
          descriptionClassName="text-sm leading-6 md:text-base"
        />
        <section aria-label={t("statsAria")}>
          <StatCard stats={stats} loading={loading && !data} />
        </section>

        <section aria-label={t("processAria")}>
          <ProcessTrackingCard application={selectedApplication} />
        </section>

        <section
          className="grid gap-6 lg:grid-cols-2"
          aria-label={t("activitiesApplicationsAria")}
        >
          <NextActivitiesCard
            activities={activities}
            loading={loading && !data}
          />
          <MyPostulationsCard
            applications={applications}
            loading={loading && !data}
            onSelectApplication={handleSelectApplication}
          />
        </section>
      </div>
    </CandidatePortalShell>
  );
}
