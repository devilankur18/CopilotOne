import {
  useEffect,
  useRef,
  useState,
  type FC,
  RefObject,
  KeyboardEvent,
  FormEvent,
} from "react";
import "~/react/styles/form.css";
// import isMobilePhone from "validator/es/lib/isMobilePhone";
import TextareaAutosize from "react-textarea-autosize";
import { VoiceQuestionOptions } from "./VoiceQuestionOptions";
import {
  Question,
  Streamingi18nTextRef,
  FormConfig,
  useSpeechToText,
  useCopilot,
  LanguageCode,
  delay,
  useLanguage,
  Recording,
  QuestionAnswer,
  VoiceForm,
  geti18nMessage,
  extracti18nText,
  QuestionTypesWithOptions,
  i18n,
} from "@sugar-ai/core";
import Streamingi18nText from "../streaming/Streamingi18nText";
import VoiceButtonWithStates from "~/react/assistants/components/voice";
import {
  captureVoiceResponseAndEvaluate,
  validateAnswerWithUser,
  runOcrAndExtractDetails,
} from "~/react/helpers/form";
// import { ArrowLeft, ArrowRight, SkipForward } from "lucide-react";
import { IoMdSkipForward } from "react-icons/io";

import { FaA, FaArrowLeftLong, FaArrowRightLong } from "react-icons/fa6";

import Initializing from "./Initializing";
import { answeredBy, AnsweredBy } from "@sugar-ai/core";
import { z } from "zod";
import AttachmentQuestion from "./AttachmentQuestion";

export const submissionStates = z.enum([
  "notReady",
  "ready",
  "submitting",
  "submitted",
]);
export type SubmissionState = z.infer<typeof submissionStates>;

let renderCount = 0;

export const VoiceQuestion: FC<{
  voiceForm: VoiceForm;
  question: Question;
  onAnswered: (voiceAnswer: QuestionAnswer) => Promise<void>;
  onSkip: () => void;
  onBack: () => void;
}> = ({ voiceForm, question, onAnswered, onSkip, onBack }) => {
  renderCount++;
  DEV: console.log("[re-render] VoiceQuestion", renderCount);

  const themeColor = "#0057FF";

  // Depdencies
  const { language, voice } = useLanguage();
  const isWorkflowStartedRef = useRef(false);
  const [isQuestionSpoken, setIsQuestionSpoken] = useState<boolean>(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const [voiceAnswer, setVoiceAnswer] = useState<QuestionAnswer | null>(null);
  const [answerReady, setAnswerReady] = useState<SubmissionState>(
    submissionStates.Enum.notReady,
  );

  const [selectedAnswer, setSelectedAnswer] = useState<string[]>([]);
  // Create refs for the question and options
  const questionRef: RefObject<Streamingi18nTextRef> =
    useRef<Streamingi18nTextRef>(null);
  const optionRefs: RefObject<Streamingi18nTextRef>[] = [];

  // Text Question field
  const [input, setInput] = useState<string>("");
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [isWaiting, setIsWaiting] = useState<boolean>(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // const [formState, setFormState] = useState<VoiceFormStates>("none");

  const onListeningStop = (answer: string) => {
    unhighlightTextField();

    console.log(`Answer: ${answer}`);
    // console.log(`Finaltranscript : ${finalTranscript}`);
  };

  const {
    isListening,
    isMicEnabled,
    transcript,
    finalTranscript,
    stopListening,
    startListeningContinous,
    getUserResponseContinous,
    getUserResponseAutoBreak,

    isSpeaking,
    speaki18nMessageAsync,
    speakMessageAsync,
    stopSpeaking,
  } = useSpeechToText({
    // onListeningStop: onListeningStop,
    continuous: false,
  });

  useEffect(() => {
    console.log(`isMicEnabled: ${isMicEnabled}`);
  }, [isMicEnabled]);

  const { config, registerAction, unregisterAction, textToAction } =
    useCopilot();

  if (question?.question_params?.options) {
    question?.question_params?.options.map(() =>
      optionRefs.push(useRef<Streamingi18nTextRef>(null)),
    );
  }

  const listen = async () => {
    // isListening ? stopVoiceInput() : startListening();
  };

  const stopVoiceInput = () => {
    console.log(`listening stopped: {transcript}`);
    // setInput(transcript.length ? transcript : "");
    stopListening();
  };

  // const handleListenClick = () => {
  //   if (!isListening) {
  //     listen();
  //   } else {
  //     stopVoiceInput();
  //   }
  // };

  const highlightTextField = () => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.classList.add("highlight");
    }
  };

  const unhighlightTextField = () => {
    if (inputRef.current) {
      inputRef.current.classList.remove("highlight");
    }
  };

  useEffect(() => {
    // Ensure the only the latest values of language and voice are used.

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      console.log(`${language} ${voice?.name}`);
      start(question, language, voice as SpeechSynthesisVoice);
    }, 300); // Adjust the delay as needed

    // Clean up the timeout if the component unmounts or dependencies change
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [question, language, voice]);

  const start = async (
    question: Question,
    language: LanguageCode,
    voice: SpeechSynthesisVoice,
  ) => {
    if (!question || !language || !voice) {
      return;
    }

    await delay(300);

    if (isWorkflowStartedRef.current) {
      return;
    }

    isWorkflowStartedRef.current = true;
    // Speak the question
    await renderMCQ(questionRef, optionRefs);

    setIsQuestionSpoken(true);

    setIsQuestionSpoken((v) => {
      // Prepare for getting answer
      highlightTextField();

      return v;
    });

    if (question.question_type == "attachment") {
      return;
    }

    const questionEvaluation = await captureVoiceResponseAndEvaluate(
      question,
      language,
      voice,
      voiceForm?.formConfig,
      getUserResponseContinous,
      setIsEvaluating,
      registerAction,
      unregisterAction,
      textToAction,
    );

    const finalAnswer: QuestionAnswer = {
      recording: questionEvaluation.userResponse.recording,
      rawAnswer: questionEvaluation.userResponse.text,
      evaluatedAnswer: questionEvaluation.aiResponse.answer,
      qualificationScore: questionEvaluation.aiResponse.qualificationScore,
      qualificationSummary: questionEvaluation.aiResponse.qualificationSummary,
      by: answeredBy.Enum.voice,
    };

    setVoiceAnswer(finalAnswer);

    // // Recording
    // if (questionEvaluation?.userResponse?.recording) {
    //   setAnswerRecording(questionEvaluation?.userResponse?.recording);
    // }

    if (inputRef && inputRef.current) {
      inputRef.current.value = questionEvaluation.aiResponse.answer;
    }

    // validate Answer
    await validateAnswerWithUser(
      question,
      finalAnswer,
      questionEvaluation.aiResponse.followupResponse as string,
      language,
      voice,
      setVoiceAnswer,
      setSelectedAnswer,
    );

    setAnswerReady(submissionStates.Enum.ready);
  };

  useEffect(() => {
    if (voiceAnswer) {
      // DEV: console.log("[Answer] updated:", voiceAnswer);

      if (answerReady == submissionStates.Enum.ready) {
        submitAnswer(voiceAnswer);
      }
    }
  }, [voiceAnswer, answerReady]);

  const submitAnswer = async (va: QuestionAnswer) => {
    if (answerReady !== submissionStates.Enum.ready) {
      DEV: console.log(
        `[Answer] ignoring submission: current state: ${answerReady}`,
        voiceAnswer,
      );
      return;
    }
    DEV: console.log("[Answer] submitting:", voiceAnswer);

    setAnswerReady(submissionStates.Enum.submitting);

    if (va?.by === answeredBy.Enum.voice) {
      // Wait
      setIsWaiting(true);
      DEV: console.log("submitting Answer", va);
      await Promise.all([
        await onAnswered(va as QuestionAnswer),
        await delay(3000),
      ]);

      setIsWaiting(false);
    }

    if (va?.by === answeredBy.Enum.keyboard) {
      await onAnswered(va as QuestionAnswer);
    }

    if (va?.by === answeredBy.Enum.document) {
      await onAnswered(va as QuestionAnswer);
    }

    setAnswerReady(submissionStates.Enum.submitted);
  };

  const handleOptionClick = (values: string[], isAuto: boolean) => {
    const answer: QuestionAnswer = {
      rawAnswer: values.join(", "),
      evaluatedAnswer: values.join(", "),
      recording: null,
      by: isAuto ? answeredBy.Enum.voice : answeredBy.Enum.keyboard,
      qualificationScore: null,
      qualificationSummary: null,
    };

    setVoiceAnswer(answer);
    // setSelectedOption(option);
  };

  // const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
  //   if (e.key === "Enter" && !e.shiftKey) {
  //     // if (isLoading) return;

  //     e.preventDefault();
  //     // handleSubmit(e as unknown as FormEvent<HTMLFormElement>);
  //     // onAnswered(e.target?.value as string);
  //   }
  // };

  const renderMCQ = async (
    qRef: RefObject<Streamingi18nTextRef>,
    optionRefs: RefObject<Streamingi18nTextRef>[],
  ): Promise<void> => {
    // Speak the question
    if (qRef.current) {
      // qRef.current.focusElement();
      await qRef.current.startStreaming();
    }

    // Speak the options
    for (let i = 0; i < optionRefs.length; i++) {
      const optionRef = optionRefs[i];
      if (optionRef.current) {
        // optionRef.current.focusElement();
        await optionRef.current.startStreaming();
      }
    }
  };

  const startListening = () => {
    console.log("Start listening");
  };
  const temp = () => {
    console.log("Start listening");
  };

  const handleManualEdit = (e: any) => {
    console.log(`switing to manual mode`);

    setVoiceAnswer((lva: QuestionAnswer | null) => {
      if (!lva) {
        return null;
      } else {
        return {
          ...lva,
          by: answeredBy.Enum.keyboard,
        };
      }
    });
  };

  const handleFiles = async (files: File[]) => {
    console.log(files);

    const qe = await runOcrAndExtractDetails(
      question,
      language,
      files,
      voiceForm.formConfig,
      setIsEvaluating,
      registerAction,
      unregisterAction,
      textToAction,
    );
    console.log(qe);

    const finalAnswer: QuestionAnswer = {
      recording: qe.userResponse.recording,
      rawAnswer: qe.userResponse.text,
      evaluatedAnswer: qe.aiResponse.answer,
      qualificationScore: qe.aiResponse.qualificationScore,
      qualificationSummary: qe.aiResponse.qualificationSummary,
      by: answeredBy.Enum.document,
    };
    setVoiceAnswer(finalAnswer);
    // set voice answer
    await speaki18nMessageAsync(
      geti18nMessage("welcome"),
      language,
      voice as SpeechSynthesisVoice,
      finalAnswer.evaluatedAnswer as string,
    );

    setAnswerReady(submissionStates.Enum.ready);
  };

  return (
    <div className="sai-vq-container">
      <Streamingi18nText
        ref={questionRef}
        auto={false}
        message={question.question_text}
        formConfig={voiceForm.formConfig}
        klasses={"font-medium text-3xl mb-4 text-gray-900 dark:text-white"}
      />

      {["attachment"].includes(question.question_type) && (
        <div className="flex flex-col items-center mt-2">
          <AttachmentQuestion
            onFileSelect={handleFiles}
            onPhotoCapture={handleFiles}
            themeColor={themeColor}
            allowMultipleFiles={false}
          />
        </div>
      )}
      <div className="mt-2">
        {["text", "number"].includes(question.question_type) && (
          <div className="flex flex-col items-center">
            <TextareaAutosize
              autoComplete="off"
              ref={inputRef}
              name="message"
              minRows={5}
              disabled={!isQuestionSpoken}
              onClick={handleManualEdit}
              onChange={(e) => {
                setVoiceAnswer((va) => {
                  let lva: QuestionAnswer = {
                    rawAnswer: va?.rawAnswer || null, // Use existing 'raw' or the new value
                    evaluatedAnswer: e.target.value, // Use existing 'evaluatedAnswer' or the new value
                    recording: va?.recording || null, // Use existing 'recording' or default to null
                    by: answeredBy.Enum.keyboard, // Use existing 'by' or default to "manual"
                    qualificationScore: va?.qualificationScore || null,
                    qualificationSummary: va?.qualificationSummary || null,
                  };
                  return lva;
                });
              }}
              placeholder={
                !isListening ? "Enter your answer here" : "Listening"
              }
              className="sai-vq-text-input"
            />
          </div>
        )}

        {QuestionTypesWithOptions.includes(question.question_type) && (
          <div className="flex flex-col items-left">
            <VoiceQuestionOptions
              auto={false}
              question={question}
              language={language}
              formConfig={voiceForm?.formConfig}
              optionRefs={optionRefs}
              handleOptionClick={handleOptionClick}
              useRadio={
                question.question_type == "single_choice" ? true : false
              }
              selected={selectedAnswer ? selectedAnswer : []}
            />
          </div>
        )}

        {voiceAnswer?.by == answeredBy.Enum.keyboard && (
          <button
            className="justify-center w-full mt-4 p-4 text-white text-center"
            onClick={() => {
              setAnswerReady(submissionStates.Enum.ready);
            }}
            style={{
              backgroundColor: voiceForm?.formConfig.voiceButton?.bgColor,
            }}
          >
            {i18n("submit", language)}
          </button>
        )}
      </div>

      <div className="sai-vf-actions-container">
        <div className="flex flex-col items-center space-y-2">
          <div className="transcript-container w-full flex items-center px-2 relative">
            <p className="transcript text-gray-900 dark:text-white mb-2 border-b border-gray-300 dark:border-gray-700 mx-auto">
              {/* <p>T: {transcript}</p>
              <p>FT: {finalTranscript}</p> */}
              {isWaiting
                ? "Loading next questions"
                : isListening
                  ? transcript
                  : finalTranscript}
            </p>
            {voiceAnswer && voiceAnswer.recording && (
              <a
                href={voiceAnswer.recording?.audioUrl}
                download={voiceAnswer.recording?.audioFile?.name}
              >
                Recording
              </a>
            )}
            {isListening && (
              <span className="counter absolute right-0 text-lg text-gray-800 dark:text-gray-200">
                {(question.validation?.max_length || 120) - transcript.length}
              </span>
            )}
          </div>

          {
            <div className="sai-vf-actions">
              <button onClick={onBack} className="sai-vf-action action-back">
                {/* <ArrowLeft className="w-5 h-5" /> */}
                <FaArrowLeftLong className="w-5 h-5" />
              </button>
              <VoiceButtonWithStates
                currentStyle={{
                  voiceButton: voiceForm?.formConfig?.voiceButton,
                }}
                voiceButtonStyle={{}}
                startListening={startListening}
                buttonId={"voice-form"}
                ispermissiongranted={true}
                isprocessing={isEvaluating}
                iswaiting={isWaiting}
                islistening={isListening}
                isSpeaking={isSpeaking}
                stopSpeaking={stopSpeaking}
              />
              {!isWaiting ? (
                <button
                  disabled={
                    voiceAnswer == null || voiceAnswer?.evaluatedAnswer == ""
                  }
                  onClick={() =>
                    voiceAnswer?.evaluatedAnswer != ""
                      ? setAnswerReady(submissionStates.Enum.ready)
                      : onSkip()
                  }
                  className="sai-vf-action action-skip "
                >
                  {/* <SkipForward className="w-5 h-5" /> */}
                  <IoMdSkipForward className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={() => setAnswerReady(submissionStates.Enum.ready)}
                  className="sai-vf-action action-next"
                >
                  {/* <ArrowRight className="w-5 h-5" /> */}
                  <FaArrowRightLong className="w-5 h-5" />
                </button>
              )}
            </div>
          }
        </div>
      </div>
    </div>
  );
};

export default VoiceQuestion;
