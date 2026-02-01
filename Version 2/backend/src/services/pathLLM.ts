import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function proposePath(input: {
  companyName: string;
  productCategory: string;
  candidateNodeIds: string[];
}) {
  const prompt = `Choose a plausible path using only these node IDs: ${input.candidateNodeIds.join(', ')}`;
  const response = await client.responses.create({
    model: 'gpt-4.1-mini',
    input: prompt,
  });
  return response.output_text;
}
