import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  DEFAULT_PRESENTATION_REMINDER_AUTO_SEND,
  DEFAULT_PRESENTATION_REMINDERS_SETTINGS,
  buildPresentationRemindersSettingsPayload,
  fetchAdminPresentationRemindersSettings,
  hasSendableTemplateConfig,
  mapPresentationRemindersNotifyResult,
  mapPresentationRemindersSettings,
  notifyAdminPresentationReminders,
  saveAdminPresentationRemindersSettings,
  toPresentationReminderTemplateIdPayload,
} from "@/lib/api/admin-presentation-reminders"

const apiGet = vi.fn()
const apiPost = vi.fn()
const apiPut = vi.fn()

vi.mock("@/lib/api", () => ({
  apiClient: {
    get: (...args: unknown[]) => apiGet(...args),
    post: (...args: unknown[]) => apiPost(...args),
    put: (...args: unknown[]) => apiPut(...args),
  },
}))

describe("mapPresentationRemindersNotifyResult", () => {
  it("maps camelCase payload", () => {
    expect(
      mapPresentationRemindersNotifyResult({
        recipients: 5,
        sent: 4,
        failed: 1,
        skipped: 0,
        skippedReason: null,
      }),
    ).toEqual({
      recipients: 5,
      sent: 4,
      failed: 1,
      skipped: 0,
      skippedReason: null,
    })
  })

  it("maps snake_case payload and string numbers", () => {
    expect(
      mapPresentationRemindersNotifyResult({
        recipients: "3",
        sent: "0",
        failed: "0",
        skipped: "3",
        skipped_reason: "Feature disabled",
      }),
    ).toEqual({
      recipients: 3,
      sent: 0,
      failed: 0,
      skipped: 3,
      skippedReason: "Feature disabled",
    })
  })
})

describe("mapPresentationRemindersSettings", () => {
  it("maps template-centric camelCase settings with id (ignores scope)", () => {
    expect(
      mapPresentationRemindersSettings({
        templates: [
          {
            id: "cfg-1",
            templateId: 3,
            vacancyTypeIds: ["type-1", "type-2"],
            scope: "dueSoon",
            autoSend: {
              enabled: true,
              timeOfDay: "14:30",
              timeZoneId: "Europe/Madrid",
            },
          },
        ],
      }),
    ).toEqual({
      templates: [
        {
          id: "cfg-1",
          templateId: "3",
          vacancyTypeIds: ["type-1", "type-2"],
          autoSend: {
            enabled: true,
            timeOfDay: "14:30",
            timeZoneId: "Europe/Madrid",
          },
        },
      ],
    })
  })

  it("maps template-centric snake_case and drops incomplete rows", () => {
    expect(
      mapPresentationRemindersSettings({
        templates: [
          {
            template_id: "tpl-1",
            vacancy_type_ids: ["type-1", "type-1", ""],
            auto_send: {
              is_enabled: true,
              time_of_day: "8:05",
              time_zone_id: "America/Bogota",
            },
          },
          { template_id: "", vacancy_type_ids: ["type-2"] },
          null,
        ],
      }),
    ).toEqual({
      templates: [
        {
          templateId: "tpl-1",
          vacancyTypeIds: ["type-1"],
          autoSend: {
            enabled: true,
            timeOfDay: "08:05",
            timeZoneId: "America/Bogota",
          },
        },
      ],
    })
  })

  it("normalizes legacy bindings shape into templates", () => {
    expect(
      mapPresentationRemindersSettings({
        enabled: true,
        schedule: {
          timeOfDay: "10:00",
          timeZoneId: "UTC",
        },
        bindings: [
          { vacancyTypeId: "type-a", templateId: "tpl-1" },
          { vacancyTypeId: "type-b", templateId: "tpl-1" },
          { vacancy_type_id: "type-a", template_id: "tpl-2" },
          { vacancyTypeId: "type-c", templateId: "" },
        ],
      }),
    ).toEqual({
      templates: [
        {
          templateId: "tpl-1",
          vacancyTypeIds: ["type-a", "type-b"],
          autoSend: {
            enabled: true,
            timeOfDay: "10:00",
            timeZoneId: "UTC",
          },
        },
        {
          templateId: "tpl-2",
          vacancyTypeIds: ["type-a"],
          autoSend: {
            enabled: true,
            timeOfDay: "10:00",
            timeZoneId: "UTC",
          },
        },
      ],
    })
  })

  it("returns defaults for empty payload", () => {
    expect(mapPresentationRemindersSettings(null)).toEqual(
      DEFAULT_PRESENTATION_REMINDERS_SETTINGS,
    )
  })
})

describe("buildPresentationRemindersSettingsPayload", () => {
  it("keeps id, numeric templateId, drops empty templateId, omits scope", () => {
    expect(
      buildPresentationRemindersSettingsPayload({
        templates: [
          {
            id: "cfg-1",
            templateId: "3",
            vacancyTypeIds: ["type-a", "", "type-a"],
            autoSend: {
              enabled: true,
              timeOfDay: "9:00",
              timeZoneId: "UTC",
            },
          },
          {
            templateId: "",
            vacancyTypeIds: ["type-b"],
            autoSend: { ...DEFAULT_PRESENTATION_REMINDER_AUTO_SEND },
          },
          {
            templateId: "tpl-guid",
            vacancyTypeIds: ["type-c"],
            autoSend: { ...DEFAULT_PRESENTATION_REMINDER_AUTO_SEND },
          },
        ],
      }),
    ).toEqual({
      templates: [
        {
          id: "cfg-1",
          templateId: 3,
          vacancyTypeIds: ["type-a"],
          autoSend: {
            enabled: true,
            timeOfDay: "09:00",
            timeZoneId: "UTC",
          },
        },
        {
          templateId: "tpl-guid",
          vacancyTypeIds: ["type-c"],
          autoSend: { ...DEFAULT_PRESENTATION_REMINDER_AUTO_SEND },
        },
      ],
    })
  })
})

describe("toPresentationReminderTemplateIdPayload", () => {
  it("returns number for digit-only ids and string otherwise", () => {
    expect(toPresentationReminderTemplateIdPayload("3")).toBe(3)
    expect(toPresentationReminderTemplateIdPayload("tpl-1")).toBe("tpl-1")
  })
})

describe("hasSendableTemplateConfig", () => {
  it("requires non-empty templateId and at least one vacancy type", () => {
    expect(
      hasSendableTemplateConfig([
        {
          templateId: "",
          vacancyTypeIds: ["type-a"],
          autoSend: { ...DEFAULT_PRESENTATION_REMINDER_AUTO_SEND },
        },
      ]),
    ).toBe(false)

    expect(
      hasSendableTemplateConfig([
        {
          templateId: "tpl-1",
          vacancyTypeIds: [],
          autoSend: { ...DEFAULT_PRESENTATION_REMINDER_AUTO_SEND },
        },
      ]),
    ).toBe(false)

    expect(
      hasSendableTemplateConfig([
        {
          templateId: "tpl-1",
          vacancyTypeIds: [],
          autoSend: { ...DEFAULT_PRESENTATION_REMINDER_AUTO_SEND },
        },
        {
          templateId: "tpl-2",
          vacancyTypeIds: ["type-a"],
          autoSend: { ...DEFAULT_PRESENTATION_REMINDER_AUTO_SEND },
        },
      ]),
    ).toBe(true)
  })
})

describe("fetchAdminPresentationRemindersSettings", () => {
  beforeEach(() => {
    apiGet.mockReset()
  })

  it("returns mapped settings on success", async () => {
    apiGet.mockResolvedValueOnce({
      templates: [
        {
          id: "cfg-9",
          templateId: "tpl-1",
          vacancyTypeIds: ["type-1"],
          autoSend: {
            enabled: true,
            timeOfDay: "10:00",
            timeZoneId: "UTC",
          },
        },
      ],
    })

    const settings = await fetchAdminPresentationRemindersSettings()

    expect(apiGet).toHaveBeenCalledWith(
      "/api/admin/presentation-reminders/settings",
    )
    expect(settings.templates).toHaveLength(1)
    expect(settings.templates[0]?.id).toBe("cfg-9")
    expect(settings.templates[0]?.templateId).toBe("tpl-1")
    expect(settings.templates[0]?.autoSend.timeOfDay).toBe("10:00")
  })

  it("returns defaults when GET returns 404", async () => {
    const error = new Error("Not found") as Error & { status: number }
    error.status = 404
    apiGet.mockRejectedValueOnce(error)

    await expect(fetchAdminPresentationRemindersSettings()).resolves.toEqual({
      templates: [],
    })
  })
})

describe("saveAdminPresentationRemindersSettings", () => {
  beforeEach(() => {
    apiPut.mockReset()
  })

  it("puts normalized payload and maps response", async () => {
    apiPut.mockResolvedValueOnce({
      templates: [
        {
          id: "cfg-1",
          templateId: 3,
          vacancyTypeIds: ["type-1"],
          autoSend: {
            enabled: true,
            timeOfDay: "11:00",
            timeZoneId: "UTC",
          },
        },
      ],
    })

    const saved = await saveAdminPresentationRemindersSettings({
      templates: [
        {
          id: "cfg-1",
          templateId: "3",
          vacancyTypeIds: ["type-1"],
          autoSend: {
            enabled: true,
            timeOfDay: "11:00",
            timeZoneId: "UTC",
          },
        },
        {
          templateId: "tpl-2",
          vacancyTypeIds: [],
          autoSend: { ...DEFAULT_PRESENTATION_REMINDER_AUTO_SEND },
        },
      ],
    })

    expect(apiPut).toHaveBeenCalledWith(
      "/api/admin/presentation-reminders/settings",
      {
        templates: [
          {
            id: "cfg-1",
            templateId: 3,
            vacancyTypeIds: ["type-1"],
            autoSend: {
              enabled: true,
              timeOfDay: "11:00",
              timeZoneId: "UTC",
            },
          },
          {
            templateId: "tpl-2",
            vacancyTypeIds: [],
            autoSend: { ...DEFAULT_PRESENTATION_REMINDER_AUTO_SEND },
          },
        ],
      },
    )
    expect(saved.templates).toHaveLength(1)
    expect(saved.templates[0]?.id).toBe("cfg-1")
    expect(saved.templates[0]?.templateId).toBe("3")
    expect(saved.templates[0]?.vacancyTypeIds).toEqual(["type-1"])
  })
})

describe("notifyAdminPresentationReminders", () => {
  beforeEach(() => {
    apiPost.mockReset()
  })

  it("posts configId and row fields without scope", async () => {
    apiPost.mockResolvedValueOnce({
      recipients: 2,
      sent: 2,
      failed: 0,
      skipped: 0,
      skippedReason: null,
    })

    const result = await notifyAdminPresentationReminders({
      useSavedSettings: true,
      configId: "cfg-1",
      templateId: 3,
      vacancyTypeIds: ["type-a"],
    })

    expect(apiPost).toHaveBeenCalledWith(
      "/api/admin/presentation-reminders/notify",
      {
        useSavedSettings: true,
        configId: "cfg-1",
        templateId: 3,
        vacancyTypeIds: ["type-a"],
      },
    )
    expect(result.sent).toBe(2)
    expect(result.recipients).toBe(2)
  })

  it("defaults to useSavedSettings true", async () => {
    apiPost.mockResolvedValueOnce({
      recipients: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      skippedReason: "No vacancies",
    })

    await notifyAdminPresentationReminders()

    expect(apiPost).toHaveBeenCalledWith(
      "/api/admin/presentation-reminders/notify",
      { useSavedSettings: true },
    )
  })
})
