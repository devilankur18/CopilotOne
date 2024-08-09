/**
 * This file was auto-generated by Fern from our API Definition.
 */

import * as serializers from "../../../..";
import * as SugarAiApi from "../../../../../api";
import * as core from "../../../../../core";

export const FormSubmissionSubmitAnswerRequest: core.serialization.Schema<
  serializers.FormSubmissionSubmitAnswerRequest.Raw,
  SugarAiApi.FormSubmissionSubmitAnswerRequest
> = core.serialization.object({
  answer: core.serialization.string(),
});

export declare namespace FormSubmissionSubmitAnswerRequest {
  interface Raw {
    answer: string;
  }
}
