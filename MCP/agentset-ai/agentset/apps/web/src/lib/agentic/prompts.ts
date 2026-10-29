export const GENERATE_QUERIES_PROMPT = `
Given a user question (or a chat history), list the appropriate search queries to find answers. 

There are two apis to use: keyword search and semantic search. You should return a maximum of 10 queries.

A good keyword search query contains one (or max two) words that are key to finding the result.

The results should be returned in the format: 
{"queries": [{"type": "keyword", "query": "..."}, ...]}
`;

export const EVALUATE_QUERIES_PROMPT = `
You are a research assistant, you will be provided with a chat history, and a list of sources, and you will need to evaluate if the sources are able to answer the user's question.

The result should be returned in the format:
{ "canAnswer": true | false }
`;
