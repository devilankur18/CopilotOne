/**
 * This file was auto-generated by Fern from our API Definition.
 */

import * as SugarAiApi from "../../..";

export interface FormSubmissionSubmitAnswerRequestAnswer {
  recording?: SugarAiApi.FormSubmissionSubmitAnswerRequestAnswerRecording;
  rawAnswer?: string;
  evaluatedAnswer?: string;
  by: SugarAiApi.FormSubmissionSubmitAnswerRequestAnswerBy;
  qualificationScore?: number;
  qualificationSummary?: string;
}
