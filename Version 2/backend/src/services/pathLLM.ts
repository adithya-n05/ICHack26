import OpenAI from 'openai';

let client: OpenAI | null = null;

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY');
  }
  if (!client) {
    client = new OpenAI({ apiKey });
  }
  return client;
}

export async function proposePath(input: {
  companyName: string;
  productCategory: string;
  candidateNodeIds: string[];
}) {
  const prompt = `Choose a plausible path using only these node IDs: ${input.candidateNodeIds.join(', ')}`;
  const response = await getClient().responses.create({
    model: 'gpt-4.1-mini',
    input: prompt,
  });
  return response.output_text;
}
