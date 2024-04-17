/**
 * This file was auto-generated by Fern from our API Definition.
 */

import * as serializers from "../../../..";
import * as SugarAiApi from "../../../../../api";
import * as core from "../../../../../core";

export const ServiceGenerateRequest: core.serialization.Schema<
  serializers.ServiceGenerateRequest.Raw,
  SugarAiApi.ServiceGenerateRequest
> = core.serialization.object({
  variables: core.serialization.record(
    core.serialization.string(),
    core.serialization.unknown(),
  ),
  messages: core.serialization
    .list(
      core.serialization.lazyObject(
        async () =>
          (await import("../../../..")).ServiceGenerateRequestMessagesItem,
      ),
    )
    .optional(),
  attachments: core.serialization
    .record(core.serialization.string(), core.serialization.unknown())
    .optional(),
  skills: core.serialization
    .list(
      core.serialization.lazyObject(
        async () =>
          (await import("../../../..")).ServiceGenerateRequestSkillsItem,
      ),
    )
    .optional(),
  skillChoice: core.serialization
    .lazy(
      async () =>
        (await import("../../../..")).ServiceGenerateRequestSkillChoice,
    )
    .optional(),
  scope: core.serialization
    .lazyObject(
      async () => (await import("../../../..")).ServiceGenerateRequestScope,
    )
    .optional(),
  isDevelopment: core.serialization.boolean().optional(),
  chat: core.serialization
    .lazyObject(
      async () => (await import("../../../..")).ServiceGenerateRequestChat,
    )
    .optional(),
  copilotId: core.serialization.string().optional(),
  environment: core.serialization
    .lazy(
      async () =>
        (await import("../../../..")).ServiceGenerateRequestEnvironment,
    )
    .optional(),
  version: core.serialization.string().optional(),
  userId: core.serialization.string().optional(),
  promptPackageId: core.serialization.string().optional(),
  promptTemplateId: core.serialization.string().optional(),
  promptVersionId: core.serialization.string().optional(),
});

export declare namespace ServiceGenerateRequest {
  interface Raw {
    variables: Record<string, unknown>;
    messages?: serializers.ServiceGenerateRequestMessagesItem.Raw[] | null;
    attachments?: Record<string, unknown> | null;
    skills?: serializers.ServiceGenerateRequestSkillsItem.Raw[] | null;
    skillChoice?: serializers.ServiceGenerateRequestSkillChoice.Raw | null;
    scope?: serializers.ServiceGenerateRequestScope.Raw | null;
    isDevelopment?: boolean | null;
    chat?: serializers.ServiceGenerateRequestChat.Raw | null;
    copilotId?: string | null;
    environment?: serializers.ServiceGenerateRequestEnvironment.Raw | null;
    version?: string | null;
    userId?: string | null;
    promptPackageId?: string | null;
    promptTemplateId?: string | null;
    promptVersionId?: string | null;
  }
}
