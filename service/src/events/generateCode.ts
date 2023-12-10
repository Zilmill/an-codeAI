import { assemblePrompt } from './prompts';
import { streamingOpenAIResponses } from './llm';
import { mockComletion } from './mock';
import { Socket } from 'socket.io';
export interface IGenerateCodeParams {
  generationType: string;
  image: string;
  openAiApiKey: string;
  openAiBaseURL: string;
  screenshotOneApiKey: null;
  isImageGenerationEnabled: true;
  editorTheme?: string;
  generatedCodeConfig: string;
  isTermOfServiceAccepted?: boolean;
  accessCode?: boolean;
  resultImage?: string;
}
export async function streamGenerateCode(
  params: IGenerateCodeParams,
  socket: Socket,
) {
  function noticeHost(data) {
    socket.emit('generatecode', data);
  }
  const generated_code_config = params['generatedCodeConfig'];
  let prompt_messages;
  try {
    if (params['resultImage']) {
      prompt_messages = assemblePrompt(
        params['image'],
        generated_code_config,
        params['resultImage'],
      );
    } else {
      prompt_messages = assemblePrompt(params['image'], generated_code_config);
    }
  } catch (e) {
    console.log(e);
  }

  if (params['generationType'] === 'update') {
    const history = params['history'];
    history.forEach((item, index) => {
      prompt_messages.push({
        role: index % 2 === 0 ? 'assistant' : 'user',
        content: item,
      });
    });
  }

  let completion;
  const SHOULD_MOCK_AI_RESPONSE = params['mockAiResponse'];
  if (SHOULD_MOCK_AI_RESPONSE) {
    completion = await mockComletion((content) => {
      noticeHost({
        type: 'chunk',
        value: content,
      });
    });
  } else {
    try {
      completion = await streamingOpenAIResponses(
        prompt_messages,
        (content) => {
          noticeHost({
            type: 'chunk',
            value: content,
          });
        },
        {
          openAiApiKey: params.openAiApiKey,
          openAiBaseURL: params.openAiBaseURL,
        },
      );
    } catch (e) {
      console.log(e);
    }
  }
  const updated_html = completion;
  noticeHost({
    type: 'setCode',
    value: updated_html,
  });
  noticeHost({
    type: 'status',
    value: 'Code generation complete.',
  });

  return updated_html;
}