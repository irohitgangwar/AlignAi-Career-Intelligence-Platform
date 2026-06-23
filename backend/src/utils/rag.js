import {
  formatRagContext,
  ingestKnowledgeSource,
  retrieveKnowledge,
} from "./vectorStore.js";

export async function upsertKnowledgeChunks(input) {
  return ingestKnowledgeSource(input);
}

export async function retrieveRelevantChunks({
  userId,
  query,
  limit = 5,
  sourceTypes = [],
}) {
  return retrieveKnowledge({
    userId,
    query,
    limit,
    sourceTypes,
  });
}

export { formatRagContext };
