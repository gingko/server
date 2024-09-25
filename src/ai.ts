// @ts-ignore
import config from "../config.js";

type UserMessage = {"role": "user", "content": [{"type":"text", "text": string}]};

type InsertLocation = 'children' | 'below';

function userMessage(text: string) : UserMessage {
  return {"role": "user", "content": [{"type":"text", "text": text}]};
}

export function insertChildren(input : string) {
  return insert('children', input);
}

export function insertBelow(input : string) {
  return insert('below', input);
}

async function insert(insertLocation : InsertLocation, input : string) {
  const systemPrompt = 'You are an API for generating text in a structured document editor.'

  const toolName = insertLocation === 'children' ? 'insert-children' : 'insert-below';

  const toolDescription =
    insertLocation === 'children'
      ? 'Use the prompt marked PROMPT:INSERT_CHILDREN to generate text sections that will be children of that section. Use the rest of the document as context. Try to keep the number of generated sections to 2-5, and group related sections into one. Do not number the sections.'
      : 'Use the prompt marked PROMPT:INSERT_BELOW to generate text sections that will be added below that section. Use the rest of the document as context. Try to keep the number of generated sections to 2-5, and group related sections into one. Do not number the sections.';

  const toolInfo = {
    "tool_choice": {"type": "tool", "name": toolName},
    "tools": [
      { "name": toolName
        , "description": toolDescription
        , "input_schema": {"type": "object", "properties": {"output": {"type": "array", "items": {"type": "string"}}}}
      }
    ]
  }

  const msg = {
    model: "claude-3-5-sonnet-20240620",
    max_tokens: 4096,
    temperature: 0.5,
    system: systemPrompt,
    messages: [userMessage(input)],
    ...toolInfo
  };

  const req = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': config.ANTHROPIC_API_KEY
    },
    body: JSON.stringify(msg),
  };

  console.log('req', req);

  const response = await fetch('https://api.anthropic.com/v1/messages', req);

  const data = await response.json();

  if (data.stop_reason === 'tool_use') {
    return data.content[0].input.output;
  } else {
    throw new Error('Unexpected response from Anthropic', data);
  }
}