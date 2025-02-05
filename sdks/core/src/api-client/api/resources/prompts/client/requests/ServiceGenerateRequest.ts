/**
 * This file was auto-generated by Fern from our API Definition.
 */

import * as SugarAiApi from "../../../..";

export interface ServiceGenerateRequest {
  variables: Record<string, unknown>;
  messages?: SugarAiApi.ServiceGenerateRequestMessagesItem[];
  attachments?: Record<string, unknown>;
  skills?: SugarAiApi.ServiceGenerateRequestSkillsItem[];
  skillChoice?: SugarAiApi.ServiceGenerateRequestSkillChoice;
  scope?: SugarAiApi.ServiceGenerateRequestScope;
  isDevelopment?: boolean;
  chat?: SugarAiApi.ServiceGenerateRequestChat;
  copilotId?: string;
  environment?: SugarAiApi.ServiceGenerateRequestEnvironment;
  version?: string;
  userId?: string;
  promptPackageId?: string;
  promptTemplateId?: string;
  promptVersionId?: string;
}
