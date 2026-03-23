"use client";

import { ExternalLink, Link2, Phone, Video } from "lucide-react";

const emptyToDash = (value) =>
  value != null && String(value).trim() !== "" ? String(value).trim() : "—";

/** API puede devolver un objeto o un string JSON (p. ej. JobPreferences). */
const parseJsonObjectIfString = (value) => {
  if (value == null) return null
  if (typeof value === "object" && !Array.isArray(value)) return value
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed
      }
    } catch {
      return null
    }
  }
  return null
}

/**
 * API puede devolver un array de objetos o un array de strings JSON (cada ítem es un objeto serializado).
 */
const normalizeObjectArray = (raw) => {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const item of raw) {
    if (item == null) continue
    if (typeof item === "object" && !Array.isArray(item)) {
      out.push(item)
      continue
    }
    if (typeof item === "string") {
      const trimmed = item.trim()
      if (!trimmed) continue
      try {
        const parsed = JSON.parse(trimmed)
        if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
          out.push(parsed)
        }
      } catch {
        /* skip invalid */
      }
    }
  }
  return out
}

export const SectionCard = ({ title, icon: Icon, children, sectionId }) => (
  <section
    className="rounded-xl border border-border bg-card p-5 md:p-6"
    aria-labelledby={sectionId}
  >
    <h2
      id={sectionId}
      className="mb-4 flex items-center gap-2 font-inter text-sm font-semibold text-foreground"
    >
      {Icon && <Icon className="h-4 w-4 shrink-0 text-vo-purple" aria-hidden />}
      {title}
    </h2>
    {children}
  </section>
);

export const InfoGrid = ({ items }) => (
  <dl className="grid gap-4 sm:grid-cols-2">
    {items.map(({ label, value }) => (
      <div key={label} className="flex flex-col gap-1">
        <dt className="font-inter text-xs font-medium text-muted-foreground">
          {label}
        </dt>
        <dd className="font-inter text-sm text-foreground">{emptyToDash(value)}</dd>
      </div>
    ))}
  </dl>
);

export const JobPreferencesBlock = ({ prefs }) => {
  const parsed = parseJsonObjectIfString(prefs)
  if (!parsed) {
    return <p className="font-inter text-sm text-muted-foreground">—</p>;
  }
  const sectors = Array.isArray(parsed.Sectors) ? parsed.Sectors : [];
  const sectorsText = sectors.length > 0 ? sectors.join(", ") : null;

  const minSalary = parsed.MinSalary ?? parsed.minSalary
  const disabilityRaw = parsed.Disability ?? parsed.disability
  const disabilityDisplay =
    disabilityRaw === true ? "Sí" : disabilityRaw === false ? "No" : null

  const items = [
    { label: "Rol deseado", value: parsed.DesiredRole ?? parsed.desiredRole },
    { label: "Salario mínimo", value: minSalary },
    {
      label: "Nivel educativo",
      value: parsed.EducationLevel ?? parsed.educationLevel,
    },
    { label: "Ciudad deseada", value: parsed.DesiredCity ?? parsed.desiredCity },
    { label: "Disponibilidad", value: parsed.Availability ?? parsed.availability },
    { label: "Discapacidad", value: disabilityDisplay },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-1 font-inter text-xs font-medium text-muted-foreground">
          Sectores
        </p>
        <p className="font-inter text-sm text-foreground">
          {sectorsText ?? "—"}
        </p>
      </div>
      <InfoGrid items={items} />
    </div>
  );
};

export const WorkExperienceList = ({ items }) => {
  const list = normalizeObjectArray(items ?? []);
  if (list.length === 0) {
    return (
      <p className="font-inter text-sm text-muted-foreground">
        Sin experiencia laboral registrada.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-5" role="list">
      {list.map((job, index) => {
        const company = job.Company ?? job.company ?? "";
        const role = job.Role ?? job.role ?? "";
        const start = job.StartDate ?? job.startDate ?? "";
        const end = job.EndDate ?? job.endDate ?? "";
        const desc = job.Description ?? job.description ?? "";
        const period = [start, end].filter(Boolean).join(" — ");
        return (
          <li
            key={`${company}-${role}-${index}`}
            className="border-l-2 border-vo-purple/40 pl-4"
          >
            <div className="flex flex-col gap-1">
              <p className="font-inter text-sm font-semibold text-foreground">
                {emptyToDash(role)}
              </p>
              <p className="font-inter text-sm text-vo-purple">{emptyToDash(company)}</p>
              <p className="font-inter text-xs text-muted-foreground">{emptyToDash(period)}</p>
            </div>
            {desc ? (
              <p className="mt-2 font-inter text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {desc}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
};

export const EducationList = ({ items }) => {
  const list = normalizeObjectArray(items ?? []);
  if (list.length === 0) {
    return (
      <p className="font-inter text-sm text-muted-foreground">
        Sin educación registrada.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-4" role="list">
      {list.map((edu, index) => {
        const institution = edu.Institution ?? edu.institution ?? "";
        const degree = edu.Degree ?? edu.degree ?? "";
        const start = edu.StartDate ?? edu.startDate ?? "";
        const end = edu.EndDate ?? edu.endDate ?? "";
        const period = [start, end].filter(Boolean).join(" — ");
        return (
          <li
            key={`${institution}-${degree}-${index}`}
            className="rounded-lg border border-border bg-muted/30 p-4"
          >
            <p className="font-inter text-sm font-semibold text-foreground">
              {emptyToDash(degree)}
            </p>
            <p className="mt-0.5 font-inter text-sm text-muted-foreground">
              {emptyToDash(institution)}
            </p>
            {period ? (
              <p className="mt-2 font-inter text-xs text-muted-foreground">{period}</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
};

export const LanguagesList = ({ items }) => {
  const list = normalizeObjectArray(items ?? []);
  if (list.length === 0) {
    return (
      <p className="font-inter text-sm text-muted-foreground">—</p>
    );
  }
  return (
    <ul className="flex flex-wrap gap-2" role="list">
      {list.map((lang, index) => {
        const name = lang.Language ?? lang.language ?? "";
        const level = lang.Level ?? lang.level ?? "";
        const label = [name, level].filter(Boolean).join(" — ");
        return (
          <li
            key={`${name}-${index}`}
            className="rounded-full bg-vo-purple/10 px-3 py-1.5 font-inter text-xs font-medium text-vo-purple"
          >
            {label || "—"}
          </li>
        );
      })}
    </ul>
  );
};

export const SkillsCloud = ({ skills }) => {
  if (!Array.isArray(skills) || skills.length === 0) {
    return <p className="font-inter text-sm text-muted-foreground">—</p>;
  }
  const flat = skills
    .map((s) => (typeof s === "string" ? s.trim() : String(s ?? "")))
    .filter(Boolean);
  return (
    <ul className="flex flex-wrap gap-2" role="list">
      {flat.map((skill, index) => (
        <li
          key={`${skill.slice(0, 40)}-${index}`}
          className="max-w-full rounded-lg bg-muted px-2.5 py-1.5 font-inter text-xs text-foreground whitespace-pre-wrap"
        >
          {skill}
        </li>
      ))}
    </ul>
  );
};

const normalizeUrl = (url) => {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

export const SocialLinksList = ({ links }) => {
  if (!Array.isArray(links) || links.length === 0) {
    return <p className="font-inter text-sm text-muted-foreground">—</p>;
  }
  return (
    <ul className="flex flex-col gap-2" role="list">
      {links.map((link, index) => {
        const platform = link.Platform ?? link.platform ?? "Enlace";
        const rawUrl = link.Url ?? link.url ?? "";
        const href = normalizeUrl(rawUrl);
        return (
          <li key={`${platform}-${index}`}>
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-inter text-sm text-vo-purple underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 rounded"
              >
                <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>{platform}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              </a>
            ) : (
              <span className="font-inter text-sm text-foreground">
                {platform}: {emptyToDash(rawUrl)}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export const ReferencesList = ({ items }) => {
  const list = normalizeObjectArray(items ?? []);
  if (list.length === 0) {
    return (
      <p className="font-inter text-sm text-muted-foreground">
        Sin referencias registradas.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-3" role="list">
      {list.map((ref, index) => {
        const name = ref.Name ?? ref.name ?? "";
        const position = ref.Position ?? ref.position ?? "";
        const company = ref.Company ?? ref.company ?? "";
        const contact = ref.Contact ?? ref.contact ?? "";
        return (
          <li
            key={`${name}-${index}`}
            className="flex flex-col gap-1 rounded-lg border border-border p-4"
          >
            <p className="font-inter text-sm font-semibold text-foreground">
              {emptyToDash(name)}
            </p>
            <p className="font-inter text-sm text-muted-foreground">
              {emptyToDash(position)}
              {company && company !== "—" ? ` · ${company}` : ""}
            </p>
            {contact ? (
              <p className="mt-1 flex items-center gap-1.5 font-inter text-sm text-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                {contact}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
};

export const RecognitionsList = ({ items }) => {
  if (!Array.isArray(items) || items.length === 0) {
    return (
      <p className="font-inter text-sm text-muted-foreground">
        Sin reconocimientos registrados.
      </p>
    );
  }
  return (
    <ul className="list-inside list-disc space-y-1 font-inter text-sm text-foreground" role="list">
      {items.map((r, i) => (
        <li key={i}>{typeof r === "string" ? r : JSON.stringify(r)}</li>
      ))}
    </ul>
  );
};

export const VideoLinkBlock = ({ videoLink }) => {
  if (!videoLink || String(videoLink).trim() === "") {
    return <p className="font-inter text-sm text-muted-foreground">—</p>;
  }
  const href = normalizeUrl(String(videoLink));
  if (!href) {
    return <p className="font-inter text-sm text-foreground">{String(videoLink)}</p>;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 font-inter text-sm text-vo-purple underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 rounded"
    >
      <Video className="h-4 w-4 shrink-0" aria-hidden />
      Ver video
      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
    </a>
  );
};

export { emptyToDash }
