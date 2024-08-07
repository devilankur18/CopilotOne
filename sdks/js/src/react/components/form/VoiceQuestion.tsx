import React, { useEffect, useRef, useState } from "react";
import "~/react/styles/form.css"; // Adjust the path according to your project structure
// import isMobilePhone from "validator/es/lib/isMobilePhone";
import validator from "validator";

import { FaMicrophoneSlash } from "react-icons/fa";
import { AudioLines, Hourglass, Loader, Mic } from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";
import { VoiceQuestionOptions } from "./VoiceQuestionOptions";
import {
  EvaluationResponse,
  Question,
  Streamingi18nTextRef,
  FormConfig,
  useSpeechToText,
  useCopilot,
  ActionRegistrationType,
  EmbeddingScopeWithUserType,
  LanguageCode,
  delay,
  useLanguage,
  extracti18nText,
} from "@sugar-ai/core";
import Streamingi18nText from "../streaming/Streamingi18nText";
import VoiceButtonWithStates from "~/react/assistants/components/voice";
import { geti18nMessage } from "@sugar-ai/core";

export const VoiceQuestion: React.FC<{
  question: Question;
  onAnswered: (answer: string) => void;
  onSkip: () => void;
  onBack: () => void;
  formConfig: FormConfig;
}> = ({ question, onAnswered, onSkip, onBack, formConfig }) => {
  // Depdencies
  const { language, voice } = useLanguage();
  const isWorkflowStartedRef = useRef(false);
  const [isQuestionSpoken, setIsQuestionSpoken] = useState<boolean>(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const [answer, setAnswer] = useState<string | null>(null);

  // Create refs for the question and options
  const questionRef: React.RefObject<Streamingi18nTextRef> =
    useRef<Streamingi18nTextRef>(null);
  const optionRefs: React.RefObject<Streamingi18nTextRef>[] = [];

  // Selected option
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Text Question field
  const [input, setInput] = useState<string>("");
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [isWaiting, setIsWaiting] = useState<boolean>(false);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

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

    // Start listening
    let userResponse: string = "";
    let fq: string | null = "";
    let attempts = 0;
    let questionAnswer = "";
    let followupResponse = "";

    // Loop until we get a valid answer or number of attempts exceeded
    while (fq !== null && attempts < 2) {
      if (fq !== "") {
        // Ask the followup question to the user
        await speakMessageAsync(fq, language, voice as SpeechSynthesisVoice);
      }

      // Get user response
      const listenConfig = {
        ...formConfig.listen,
        ...{
          maxAnswerLength: question.validation?.max_length,
        },
      };
      userResponse = await getUserResponseContinous(listenConfig);
      // userResponse = await getUserResponseAutoBreak(listenConfig);

      // Fill answer in text field in case of text fields
      if (inputRef && inputRef.current) {
        inputRef.current.value = userResponse;
      }

      // Run Rule validators
      const isValidAnswer = await checkValidators(question, userResponse);
      if (!isValidAnswer) {
        await speaki18nMessageAsync(
          geti18nMessage("validationFailed"),
          language,
          voice as SpeechSynthesisVoice,
        );
        continue;
      }

      // AI Evaluation
      const evaluationResult = await aiEvaluate(
        question,
        userResponse,
        language,
      );

      // Ask followup question if needed
      if (!evaluationResult) {
        fq = "";
        questionAnswer = userResponse;
      } else {
        fq = evaluationResult.followupQuestion;
        questionAnswer = evaluationResult.answer;

        followupResponse = questionAnswer;
        // followupResponse = evaluationResult.followupResponse ?? questionAnswer;
        console.log(`followupResponse: ${followupResponse}`);
      }

      if (inputRef && inputRef.current) {
        inputRef.current.value = questionAnswer;
      }

      attempts = attempts + 1;
    }

    // validate Answer
    await validateAnswerWithUser(question, questionAnswer, followupResponse);

    // Wait
    setIsWaiting(true);
    await delay(3000);
    setIsWaiting(false);

    // Submit if fine
    onAnswered(questionAnswer);
  };

  const validateAnswerWithUser = async (
    question: Question,
    answer: string,
    followupResponse: string,
  ) => {
    // await speaki18nMessageAsync(
    //   selectedAnswer,
    //   language,
    //   voice as SpeechSynthesisVoice,
    // );

    // Show final evaluated answer
    if (question.question_type == "multiple_choice") {
      setAnswer(answer);

      await speakMessageAsync(
        followupResponse,
        language,
        voice as SpeechSynthesisVoice,
      );
    } else if (
      question.question_type == "text" ||
      question.question_type == "number"
    ) {
      const isValidAnswer = await checkValidators(question, answer);

      if (isValidAnswer) {
        if (answer.length <= 150) {
          await speakMessageAsync(
            followupResponse,
            language,
            voice as SpeechSynthesisVoice,
          );
        }
      } else {
        // Not valid answer
      }
    }
  };

  const checkValidators = async (
    question: Question,
    answer: string,
  ): Promise<boolean> => {
    const validators = question.validation?.validators || [];

    let result: boolean = true;

    // run validators
    validators.forEach(async (v) => {
      if (v == "mobile") {
        result = validator.isMobilePhone(answer.replace(/ /g, ""));
      }

      // if (validator == "email") {
      //   result = isEmail(answer);
      // }
    });

    return result;
  };

  const startRecognition = () => {
    // if (recognitionRef.current) {
    //   recognitionRef.current.start();
    // }
  };

  const aiEvaluate = async (
    question: Question,
    userResponse: string,
    language: LanguageCode,
  ): Promise<EvaluationResponse> => {
    setIsEvaluating(true);

    const promptTemplate = process.env
      .NEXT_PUBLIC_FORM_EVALUATION_PROMPT as string;
    console.log(question);
    let options: string[] = [];

    const pvs: any = {
      "@language": language,
      "@question_type": question.question_type,
      "@question": extracti18nText(question.question_text, language),
    };

    let action: ActionRegistrationType = {
      name: "evaluateMcqResponse",
      description:
        "Evaluate the user's response for a question and return the most likely option.",
      parameters: [
        {
          name: "answer",
          type: "string",
          description: "Answer for the question",
          required: true,
        },
        {
          name: "isQuestionAnswered",
          type: "string",
          enum: ["fully", "partially", "no"],
          description: "Is question answered by the user ?",
          required: true,
        },
        {
          name: "followupResponse",
          type: "string",
          description:
            // "response to be communicated back when user answered the question correctly, which include 1-5 words along with the correct answer.For example: You have chosen <correct answer>, Nice <correct answer>, great, I am going ahead with <correct answer>, Dont ask any followup question, this is required when isQuestionAnswered is yes ",
            // "followup Respose to correct response, should be friendly with confirmation and the correct answer. Use 1-5 words along with the correct answer. For example: 'You have chosen <correct answer>,' 'Nice <correct answer>,' 'Great, I am going ahead with <correct answer>.' Do not ask any follow-up questions. This is required when isQuestionAnswered is yes.",
            `On receiving the user's answer, respond with a confirmation message in language ${language} that includes 1-5 words along with the correct answer. Examples: 'You have chosen <correct answer>', 'Hello <correct answer>', 'Nice choice with <correct answer>', 'Great, moving ahead with <correct answer>', 'Got it, <correct answer> it is', 'Perfect, <correct answer>,' 'Sounds good, <correct answer>', 'Excellent, <correct answer>', 'Alright <correct answer>', etc. Ensure no follow-up questions are asked when the answer is confirmed (isQuestionAnswered is yes).`,
          required: true,
        },
        {
          name: "followupQuestion",
          type: "string",
          description:
            "followup Question to be asked back to the user, this is required when isQuestionAnswered is partially or no",
          required: true,
        },
      ],
    };

    // Incase of mcq type of questions
    if (question.question_params?.options) {
      options = question.question_params?.options?.map((option) =>
        extracti18nText(option, language),
      ) as string[];

      pvs["@options"] = options.join(",");
      if (options?.length > 0) {
        action.parameters[0].enum = options;
      }
    }
    function evaluateMcqResponse(
      answer: string,
      isQuestionAnswered: string,
      followupResponse: string,
      followupQuestion: string,
    ) {
      console.log(
        `answer: ${answer}, ${isQuestionAnswered}, ${followupResponse}, ${followupQuestion}`,
      );

      if (isQuestionAnswered === "fully") {
        return {
          answer,
          followupResponse,
          followupQuestion: null,
        };
      }

      if (isQuestionAnswered !== "fully" && followupQuestion) {
        return { answer, followupResponse: null, followupQuestion };
      }

      throw new Error(
        "answer is not clear, and followup question is not provided",
      );
    }

    registerAction("evaluateMcqResponse", action, evaluateMcqResponse);

    // @ts-ignore
    const ttaResponse: TextToActionResponse = await textToAction(
      promptTemplate,
      userResponse,
      pvs,
      {
        scope1: "",
        scope2: "",
      } as EmbeddingScopeWithUserType,
      false,
      0,
    );
    unregisterAction("evaluateMcqResponse");

    setIsEvaluating(false);
    // e
    // if (!ttaResponse || ttaResponse.actionOutput) {
    //   throw new Error("Failed to get a valid response from textToAction");
    // }

    return ttaResponse.actionOutput;
  };

  const handleOptionClick = (option: string) => {
    setSelectedOption(option);
    // onAnswered();
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      // if (isLoading) return;

      e.preventDefault();
      // handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
      // onAnswered(e.target?.value as string);
    }
  };

  const renderMCQ = async (
    qRef: React.RefObject<Streamingi18nTextRef>,
    optionRefs: React.RefObject<Streamingi18nTextRef>[],
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

  return (
    <div className="p-2 bg-gray-500 dark:bg-gray-600 rounded-lg shadow-md max-w-3xl mx-auto">
      <Streamingi18nText
        ref={questionRef}
        auto={false}
        message={question.question_text}
        formConfig={formConfig}
        klasses={"font-medium text-3xl mb-4"}
      />

      {["text", "number"].includes(question.question_type) && (
        <div className="flex flex-col items-center mt-2">
          <TextareaAutosize
            autoComplete="off"
            ref={inputRef}
            name="message"
            disabled={!isQuestionSpoken}
            placeholder={!isListening ? "Enter your answer here" : "Listening"}
            className="rounded-lg border border-blue-500 max-h-24 px-4 py-3 bg-white dark:bg-gray-800 text-sm placeholder-gray-500 dark:placeholder-gray-400 disabled:cursor-not-allowed disabled:opacity-50 w-full flex items-center h-16 resize-none overflow-hidden focus:ring focus:ring-blue-300 focus:border-blue-500"
          />
        </div>
      )}

      {question.question_type === "multiple_choice" && (
        <VoiceQuestionOptions
          auto={false}
          question={question}
          language={language}
          formConfig={formConfig}
          optionRefs={optionRefs}
          handleOptionClick={handleOptionClick}
          useRadio={true}
          selected={answer ? [answer] : []}
        />
      )}

      <div className="mb-8 fixed bottom-0 left-0 right-0 p-2 bg-gray-500 dark:bg-gray-600 border-t border-gray-300 dark:border-gray-700">
        <div className="flex flex-col items-center space-y-2">
          <div className="transcript-container w-full flex items-center px-2 relative">
            <p className="transcript text-gray-800 dark:text-white mb-2 border-b border-gray-300 dark:border-gray-700 mx-auto">
              {/* <p>T: {transcript}</p>
              <p>FT: {finalTranscript}</p> */}
              {isWaiting
                ? "Loading next questions"
                : isListening
                  ? transcript
                  : finalTranscript}
            </p>
            {isListening && (
              <span className="counter absolute right-0 text-lg text-gray-800 dark:text-gray-200">
                {question.validation.max_length - transcript.length}
              </span>
            )}
          </div>

          <div className="flex justify-between items-center w-full max-w-3xl mx-auto space-x-2">
            <button
              onClick={onBack}
              className="px-2 py-1 bg-gray-600 dark:text-white rounded-lg shadow-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Back
            </button>
            <VoiceButtonWithStates
              currentStyle={{}}
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
                onClick={onSkip}
                className="px-2 py-1 bg-blue-600 dark:text-white rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                Skip
              </button>
            ) : (
              <button
                onClick={() => onAnswered(answer as string)}
                className="px-2 py-1 bg-green-600 dark:text-white rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceQuestion;
