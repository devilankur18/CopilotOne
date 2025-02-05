import { z } from "zod";
import { styled, css, keyframes } from "styled-components";
import {
  copilotStyleVoiceButtonSchema,
  type CopilotSyleThemeType,
  type CopilotStylePositionType,
  type CopilotSyleContainerType,
  type CopilotSyleTooltipType,
  type MessageRoleType,
  messageRoleEnum,
  copilotStyleKeyboardButtonSchema,
} from "@sugar-ai/core";
import { type FC } from "react";

const copilotVoiceButtonProps = z.object({
  button: copilotStyleVoiceButtonSchema,
  isprocessing: z.string(),
  ispermissiongranted: z.string(),
  islistening: z.string(),
});

const copilotKeyboardButtonProps = z.object({
  button: copilotStyleKeyboardButtonSchema.optional(),
});

type CopilotVoiceButtonPropsType = z.infer<typeof copilotVoiceButtonProps>;
type CopilotKeyboardButtonPropsType = z.infer<
  typeof copilotKeyboardButtonProps
>;

export const pulse = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
`;

export const sparkle = keyframes`
  0%, 100% {
    opacity: 0.5;
    transform: scale(1.1);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }`;

// export const CopilotContainer = styled.div<{
//   container: CopilotSyleContainerType;
//   position: CopilotStylePositionType;
// }>`

export const CopilotContainer: FC<{
  container: CopilotSyleContainerType;
  position: CopilotStylePositionType;
  children?: React.ReactNode;
  id: string;
  className: string;
  style: string;
}> = styled.div`
  position: fixed;
  ${({ container, position }) => {
    const positions =
      (position as CopilotStylePositionType) ||
      (container?.position as CopilotStylePositionType);

    switch (positions) {
      case "top-left":
        return css`
          top: 25px;
          left: 25px;
        `;
      case "top-right":
        return css`
          top: 25px;
          right: 25px;
        `;
      case "bottom-left":
        return css`
          bottom: 25px;
          left: 25px;
        `;
      case "bottom-right":
        return css`
          bottom: 25px;
          right: 25px;
        `;
      case "top-center":
        return css`
          top: 25px;
          left: 50%;
          transform: translateX(-50%);
        `;
      case "bottom-center":
        return css`
          bottom: 25px;
          left: 50%;
          transform: translateX(-50%);
        `;
      default:
        return ""; // If no position matches, default to an empty string
    }
  }}
  margin: ${({ container }) => container?.margin};
  width: fit-content;
  height: fit-content;
  z-index: 1000; /* Ensure the widget is above other elements */
`;

export const ChatMessage: FC<{
  container: CopilotSyleContainerType;
  position: CopilotStylePositionType;
}> = styled.div`
  position: fixed;
  width: 300px;
  max-height: calc(100vh - 120px);
  background-color: transparent;
  border-radius: 10px;
  animation-duration: 0.5s;
  animation-name: d;
  animation-fill-mode: forwards;
  overflow-y: auto;
  z-index: 1000; // Ensure the chat window is above most elements

  ${({ container, position }) => {
    const positions =
      (position as CopilotStylePositionType) ||
      (container?.position as CopilotStylePositionType);

    switch (positions) {
      case "top-left":
        return css`
          top: 95px;
          left: 20px;
        `;
      case "top-right":
        return css`
          top: 95px;
          right: 20px;
        `;
      case "bottom-left":
        return css`
          bottom: 95px;
          left: 20px;
        `;
      case "bottom-right":
        return css`
          bottom: 95px;
          right: 20px;
        `;
      case "top-center":
        return css`
          top: 70px;
          left: 50%;
          transform: translateX(-50%);
        `;
      case "bottom-center":
        return css`
          bottom: 70px;
          left: 50%;
          transform: translateX(-50%);
        `;
      default:
        return ""; // If no position matches, default to an empty string
    }
  }}
`;

export const VoiceButton: FC<CopilotVoiceButtonPropsType> = styled.button`
  background-color: ${({ button }) => button?.bgColor};
  color: ${({ button }) => button?.color};
  border: none;
  border-radius: 50%;
  width: ${({ button }) => button?.width};
  height: ${({ button }) => button?.height};
  cursor: pointer;
  box-shadow: rgba(0, 0, 0, 0.5) 0px 3px 12px;
  text-align: -webkit-center;
  text-align: -moz-center;
  cursor: ${({ isprocessing }) =>
    isprocessing === "true" ? "not-allowed" : "pointer"};
  opacity: ${({ isprocessing }) => (isprocessing === "true" ? "0.5" : "1")};
  ${({ islistening }) =>
    islistening === "true"
      ? css`
          animation: ${pulse} 1s infinite;
        `
      : css`
          // animation: ${sparkle} 3s ease-in-out 4s infinite;
        `}
`;

export const KeyboardButton: FC<CopilotKeyboardButtonPropsType> = styled.button`
  position: relative;
  background-color: ${({ button }) => button?.color};
  width: 40px;
  height: 40px;
  cursor: pointer;
  box-shadow: rgba(0, 0, 0, 0.5) 0px 3px 12px;
  text-align: -webkit-center;
  text-align: -moz-center;
  border-radius: 10px;
  margin-left: 10px;
  margin-right: 10px;
  bottom: 5px;
  border: unset;
`;

export const ButtonContainer: FC = styled.div``;

export const Message: FC<{
  theme: CopilotSyleThemeType;
  role?: string;
}> = styled.div`
  background-color: ${({ theme, role }) =>
    messageRoleEnum.options.includes(role as MessageRoleType)
      ? "white"
      : theme?.primaryColor};
  color: ${({ theme, role }) =>
    messageRoleEnum.options.includes(role as MessageRoleType)
      ? "black"
      : theme?.secondaryColor};
  font-size: ${({ theme }) => theme?.fontSize};
  font-family: ${({ theme }) => theme?.fontFamily};
  padding: 10px;
  margin-bottom: 5px;
  border-radius: 10px;
  border: 1px solid #ccc;
  box-shadow: 0 3px 10px 0 rgba(0, 0, 0, 0.2);
`;

const fadeInOut = keyframes`
  0% { opacity: 0; }
  20% { opacity: 1; }
  80% { opacity: 1; }
  100% { opacity: 0; }
`;

export const ToolTipContainer = styled(ChatMessage)<{
  config: CopilotSyleTooltipType;
}>`
  width: 200px;
  text-align: center;
  border: 1px solid #ccc;
  box-shadow: 0 3px 10px 0 rgba(0, 0, 0, 0.2);
  opacity: 0;

  animation: ${fadeInOut} ${(props) => props.config?.duration}s linear forwards;
  animation-fill-mode: forwards;
  animation-delay: 0.8s;
`;

export const TootTipMessage = styled(Message)`
  font-weight: 700;
  border: none;
  box-shadow: none;
  margin-bottom: 0px;
`;

// Wrapper component to contain input box and button
export const TextBoxContainer: FC<{
  container: CopilotSyleContainerType;
  position: CopilotStylePositionType;
}> = styled.div`
  position: fixed;
  right: 25px;

  margin: 0;
  z-index: 1000;
  // width: -webkit-fill-available;
  // max-width: 300px; // Adjust this as needed
  // width: -webkit-fill-available;
  width: 100%; // Defaults to full width
  padding-left: 20px;
  padding-right: 20px;
  @media (max-width: 768px) {
    width: 100%; /* Adjust width for smaller screens */
    max-width: unset;
  }
  ${({ container, position }) => {
    const positions =
      (position as CopilotStylePositionType) ||
      (container?.position as CopilotStylePositionType);
    switch (positions) {
      case "top-left":
      case "top-right":
      case "top-center":
        return css`
          top: 25px;
        `;
      case "bottom-right":
      case "bottom-left":
      case "bottom-center":
        return css`
          bottom: 25px;
        `;
      default:
        return ""; // If no position matches, default to an empty string
    }
  }}
`;

export const TextBox: FC<{ color: string }> = styled.input`
  padding: 15px 32px 15px 8px;
  border: 1px solid ${({ color }) => color};
  border-radius: 5px;
  outline: none;
  width: 100%;
  // width: -webkit-fill-available; // Only on small screens
  margin-left: 25px;
  @media (max-width: 768px) {
    width: 100%;
    margin-left: 25px;
  }
`;

// Styled button
export const TextBoxButton: FC<{ iskeyboard?: string }> = styled.button`
  position: absolute;
  top: 5px;
  right: 0;
  padding: 8px;
  border: none;
  border-radius: 0 5px 5px 0;
  color: #fff;
  cursor: pointer;
  outline: none;
  background: unset;
  ${({ iskeyboard }) =>
    iskeyboard === "true" &&
    css`
      top: 13px;
      right: 5px;
    `}
`;

// button, voice -> theme -> defaults

export const KeyboardEmptyContainer: FC = styled(KeyboardButton)`
  box-shadow: none;
  height: 0px;
  background: unset;
`;
