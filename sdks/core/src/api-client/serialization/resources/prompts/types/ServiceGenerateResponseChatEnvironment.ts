/**
 * This file was auto-generated by Fern from our API Definition.
 */

import * as serializers from "../../..";
import * as SugarAiApi from "../../../../api";
import * as core from "../../../../core";

export const ServiceGenerateResponseChatEnvironment: core.serialization.Schema<
  serializers.ServiceGenerateResponseChatEnvironment.Raw,
  SugarAiApi.ServiceGenerateResponseChatEnvironment
> = core.serialization.enum_(["DEV", "PREVIEW", "RELEASE"]);

export declare namespace ServiceGenerateResponseChatEnvironment {
  type Raw = "DEV" | "PREVIEW" | "RELEASE";
}
