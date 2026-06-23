import { Document } from "@langchain/core/documents";
import { PineconeStore } from "@langchain/pinecone";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Pinecone } from "@pinecone-database/pinecone";
import { getEmbeddingModel } from "../config/ai.js";

const DEFAULT_INDEX = "alignai-knowledge";
const DEFAULT_CLOUD = "aws";
const DEFAULT_REGION = "us-east-1";
const DEFAULT_DIMENSION = 768;
const DEFAULT_METRIC = "cosine";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

let pineconeClient;
let pineconeIndex;
let pineconeIndexName;
let indexReadyPromise;

// Hinglish: Pinecone config ko runtime par read kar rahe hain, kyunki .env server start hote waqt load hota hai.
function getIndexName() {
  return process.env.PINECONE_INDEX || DEFAULT_INDEX;
}

function getTopK() {
  return Number(process.env.RAG_TOP_K || 6);
}

function getIndexCloud() {
  return process.env.PINECONE_CLOUD || DEFAULT_CLOUD;
}

function getIndexRegion() {
  return process.env.PINECONE_REGION || DEFAULT_REGION;
}

function getIndexDimension() {
  return Number(process.env.PINECONE_DIMENSION || DEFAULT_DIMENSION);
}

function getIndexMetric() {
  return process.env.PINECONE_METRIC || DEFAULT_METRIC;
}

function shouldAutoCreateIndex() {
  return process.env.PINECONE_AUTO_CREATE_INDEX !== "false";
}

function getPineconeApiKey() {
  const apiKey = process.env.PINECONE_API_KEY;

  if (!apiKey) {
    throw new Error("PINECONE_API_KEY is missing in backend/.env");
  }

  return apiKey;
}

function sanitizeIdPart(value = "") {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "_");
}

function buildChunkId(sourceType, sourceId, chunkIndex) {
  return [
    sanitizeIdPart(sourceType),
    sanitizeIdPart(sourceId),
    sanitizeIdPart(chunkIndex),
  ].join("__");
}

function buildNamespace(userId) {
  return `user-${sanitizeIdPart(userId)}`;
}

function getPineconeClient() {
  if (!pineconeClient) {
    // Hinglish: Pinecone client ko lazy initialize kar rahe hain taki startup par bina zarurat hit na ho.
    pineconeClient = new Pinecone({
      apiKey: getPineconeApiKey(),
    });
  }

  return pineconeClient;
}

async function ensureIndex() {
  if (!indexReadyPromise) {
    indexReadyPromise = (async () => {
      // Hinglish: pehle Pinecone dashboard wale indexes check karte hain, direct assume nahi karte.
      const client = getPineconeClient();
      const indexName = getIndexName();
      const expectedDimension = getIndexDimension();
      const indexList = await client.listIndexes();
      const existingIndex = indexList.indexes?.find(
        (index) => index.name === indexName
      );

      if (!existingIndex) {
        // Hinglish: index missing ho toh env flag ke according backend khud create kar sakta hai.
        if (!shouldAutoCreateIndex()) {
          throw new Error(
            `Pinecone index "${indexName}" was not found. Create it in Pinecone or enable PINECONE_AUTO_CREATE_INDEX.`
          );
        }

        console.log(
          `Creating Pinecone index "${indexName}" (${expectedDimension} dims, ${getIndexCloud()}/${getIndexRegion()})`
        );

        await client.createIndex({
          name: indexName,
          dimension: expectedDimension,
          metric: getIndexMetric(),
          spec: {
            serverless: {
              cloud: getIndexCloud(),
              region: getIndexRegion(),
            },
          },
          waitUntilReady: true,
          suppressConflicts: true,
        });
      }

      // Hinglish: existing/created index ki dimension aur ready status validate kar rahe hain.
      const description = await client.describeIndex(indexName);

      if (description.dimension && description.dimension !== expectedDimension) {
        throw new Error(
          `Pinecone index "${indexName}" has dimension ${description.dimension}, but this app expects ${expectedDimension}. Update PINECONE_DIMENSION or create a matching index for your embedding model.`
        );
      }

      if (description.status && description.status.ready === false) {
        throw new Error(
          `Pinecone index "${indexName}" exists but is not ready yet. Wait for it to finish initializing in Pinecone.`
        );
      }

      console.log(`Pinecone index "${indexName}" is ready`);
    })();
  }

  return indexReadyPromise;
}

async function getPineconeIndex() {
  await ensureIndex();

  const indexName = getIndexName();

  if (!pineconeIndex || pineconeIndexName !== indexName) {
    // Hinglish: same index object ko reuse karne se har request me naya object banane ki zarurat nahi padti.
    pineconeIndex = getPineconeClient().Index(indexName);
    pineconeIndexName = indexName;
  }

  return pineconeIndex;
}

async function getVectorStore(userId) {
  const index = await getPineconeIndex();

  return new PineconeStore(getEmbeddingModel(), {
    pineconeIndex: index,
    namespace: buildNamespace(userId),
  });
}

function buildFilter(sourceTypes = []) {
  if (!sourceTypes.length) {
    return undefined;
  }

  return {
    sourceType: {
      $in: sourceTypes,
    },
  };
}

function normalizeText(text = "") {
  return text.replace(/\s+/g, " ").trim();
}

export async function ingestKnowledgeSource({
  userId,
  sourceType,
  sourceId,
  title,
  text,
  metadata = {},
}) {
  if (!userId || !normalizeText(text)) {
    return { chunksIndexed: 0 };
  }

  const cleanedText = normalizeText(text);
  const rawDocuments = [
    new Document({
      pageContent: cleanedText,
      metadata: {
        sourceType,
        sourceId,
        title: title || `${sourceType}-${sourceId}`,
        ...metadata,
      },
    }),
  ];

  // Hinglish: ek source ko deterministic chunk ids ke saath index kar rahe hain taki old version replace ho sake.
  const splitDocuments = await splitter.splitDocuments(rawDocuments);
  const documentIds = splitDocuments.map((_, index) =>
    buildChunkId(sourceType, sourceId, index)
  );
  const enrichedDocuments = splitDocuments.map((doc, index) => {
    const chunkId = documentIds[index];

    return new Document({
      pageContent: doc.pageContent,
      metadata: {
        ...doc.metadata,
        chunkIndex: index,
        chunkId,
      },
    });
  });

  const namespace = buildNamespace(userId);

  // Skip deletion of old vectors - just add new ones (duplication is OK for now)
  // This avoids 404 errors from trying to delete non-existent vectors
  console.log(`Adding ${enrichedDocuments.length} chunks to namespace: ${namespace}`);

  const store = await getVectorStore(userId);
  await store.addDocuments(enrichedDocuments, { ids: documentIds });

  return {
    chunksIndexed: enrichedDocuments.length,
    namespace,
  };
}

export async function retrieveKnowledge({
  userId,
  query,
  limit = getTopK(),
  sourceTypes = [],
}) {
  if (!userId || !normalizeText(query)) {
    return [];
  }

  const store = await getVectorStore(userId);
  const results = await store.similaritySearchWithScore(
    normalizeText(query),
    limit,
    buildFilter(sourceTypes)
  );

  return results.map(([doc, score]) => ({
    text: doc.pageContent,
    score,
    metadata: doc.metadata || {},
  }));
}

export function formatRagContext(chunks = []) {
  if (!chunks.length) {
    return "No retrieved documents were found for this user and query.";
  }

  // Hinglish: retrieved chunks ko human-readable context block me convert karke prompt layer ko de rahe hain.
  return chunks
    .map((chunk, index) => {
      const title = chunk.metadata?.title || "Untitled";
      const sourceType = chunk.metadata?.sourceType || "unknown";
      const score =
        typeof chunk.score === "number" ? chunk.score.toFixed(4) : "n/a";

      return [
        `Context ${index + 1}`,
        `Source Type: ${sourceType}`,
        `Title: ${title}`,
        `Score: ${score}`,
        `Content: ${chunk.text}`,
      ].join("\n");
    })
    .join("\n\n");
}
