// yeh file Hugging Face ke saath communication handle karti hai.
// Dono kaam karti hai — text generation (LLM se baat karna) aur embeddings (text ko vectors me convert karna).
// Kyun zaroori hai: poore app ka AI brain isi file se chalta hai.
// Bina iske na analysis hoga, na resume improve hoga, na interview questions generate honge.

// Hugging Face ke API base URLs — yeh router endpoints hain jo model inference ke liye use hote hain.
// HF_ROUTER_BASE = Hugging Face ka main router URL, yeh internally correct model server pe route karta hai.
// Pehle api-inference.huggingface.co use hota tha, lekin Windows pe DNS fail ho raha tha, isliye router pe shift kiya.
const HF_ROUTER_BASE = "https://router.huggingface.co";

// Chat completions API ka URL — yeh OpenAI-compatible format me kaam karta hai.
// Matlab messages array bhejo (system, user, assistant), response me assistant ka reply aayega.
const HF_CHAT_API_BASE = `${HF_ROUTER_BASE}/v1`;

// Embeddings/feature-extraction API ka URL — text ko vector numbers me convert karta hai.
// Yeh vectors Pinecone me store hote hain aur semantic search ke liye use hote hain.
const HF_INFERENCE_API_BASE = `${HF_ROUTER_BASE}/hf-inference/models`;

// default LLM model — Qwen 2.5 7B use kar rahe hain, free tier pe available hai HF pe.
// Agar .env me LLM_MODEL set hai toh woh use hoga, nahi toh yeh default chalega.
const DEFAULT_LLM_MODEL = "Qwen/Qwen2.5-7B-Instruct";

// default embedding model — sentence-transformers ka all-mpnet-base-v2.
// Yeh text ko 768-dimensional vectors me convert karta hai. Pinecone index bhi 768 dimension ka hai.
// IMPORTANT: agar embedding model change karo toh Pinecone index ka dimension bhi change karna padega.
const DEFAULT_EMBEDDING_MODEL = "sentence-transformers/all-mpnet-base-v2";

// default embedding dimension — 768 hai kyunki all-mpnet-base-v2 model 768 dimensions return karta hai.
// Yeh Pinecone index dimension se match hona chahiye, nahi toh upsert fail hoga.
const DEFAULT_EMBEDDING_DIMENSION = 768;

// yeh function .env se Hugging Face API key nikaalta hai.
// 3 possible env variable names check karta hai — different tools different names use karte hain.
// Agar koi bhi nahi mila toh error throw karta hai — bina key ke HF API call nahi ho sakti.
function getHuggingFaceApiKey() {
  const apiKey =
    process.env.HUGGINGFACE_API_KEY ||
    process.env.HF_API_KEY ||
    process.env.HUGGINGFACEHUB_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Hugging Face API key is missing. Set HUGGINGFACE_API_KEY or HF_API_KEY in backend/.env"
    );
  }

  return apiKey;
}

// HF API ke liye HTTP headers banata hai.
// Authorization header me Bearer token daalte hain — yeh HF ko batata hai ki hum authorized hain.
// Content-Type JSON hai kyunki hum JSON body bhej rahe hain aur JSON response expect kar rahe hain.
function getHeaders() {
  return {
    Authorization: `Bearer ${getHuggingFaceApiKey()}`,
    "Content-Type": "application/json",
  };
}

// LangChain ke messages ka content normalize karta hai.
// Kyun zaroori hai: LangChain ke messages ka content kabhi string hota hai, kabhi array hota hai
// (jaise [{type: "text", text: "hello"}]), kabhi object hota hai.
// HF API ko plain string chahiye, toh yeh function sab formats ko string me convert karta hai.
function normalizeContent(content) {
  // agar content array hai toh har part ko string me convert karke join karo
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part; // pehle se string hai, as-is use karo
        if (part?.text) return part.text; // {text: "..."} format hai, text nikaal lo
        return JSON.stringify(part); // unknown format hai, JSON string bana do
      })
      .join("\n");
  }

  // agar array nahi hai toh simply String() se convert karo. null/undefined ke liye empty string.
  return String(content ?? "");
}

// message se role extract karta hai.
// LangChain ke messages me role alag alag jagah hota hai:
// - direct .role property (plain objects me)
// - ._getType() method (LangChain message classes me, jaise HumanMessage, SystemMessage)
// Default "user" return karta hai agar kuch nahi mila.
function getMessageRole(message) {
  if (message.role) return message.role;
  if (typeof message._getType === "function") return message._getType();
  return "user";
}

// LangChain ke role names ko HF API ke role names me convert karta hai.
// Kyun zaroori hai: LangChain "human" aur "ai" use karta hai,
// lekin HF API (OpenAI format) "user" aur "assistant" expect karta hai.
// Agar convert nahi karo toh HF API error dega ya wrong context assume karega.
function normalizeChatRole(role) {
  if (role === "human") return "user"; // LangChain ka "human" = HF ka "user"
  if (role === "ai") return "assistant"; // LangChain ka "ai" = HF ka "assistant"
  if (["system", "user", "assistant", "tool"].includes(role)) return role; // already correct format
  return "user"; // unknown role ke liye default "user" maano
}

// kisi bhi input format ko HF API-compatible messages array me convert karta hai.
// Input ho sakta hai: plain string, LangChain messages array, ya single message object.
// Output hamesha [{role: "user", content: "..."}, ...] format me hoga.
// Yeh isliye zaroori hai kyunki LangChain prompts alag format me aate hain lekin HF API ko
// standardized {role, content} array chahiye.
function inputToMessages(input) {
  // agar plain string hai toh ek user message bana do
  if (typeof input === "string") {
    return [
      {
        role: "user",
        content: input,
      },
    ];
  }

  // agar array hai toh directly use karo.
  // Agar LangChain prompt object hai toh .toChatMessages() se messages nikaal lo.
  // Warna single item ko array me wrap kar do.
  const messages = Array.isArray(input)
    ? input
    : typeof input?.toChatMessages === "function"
      ? input.toChatMessages()
      : [input];

  // har message ka role normalize karo (human→user, ai→assistant) aur content string banao
  return messages.map((message) => ({
    role: normalizeChatRole(getMessageRole(message)),
    content: normalizeContent(message.content),
  }));
}

// messages ko ek single prompt string me convert karta hai (fallback use case ke liye).
// Format: "SYSTEM:\n<content>\n\nHUMAN:\n<content>" etc.
// Yeh tab use hota jab API chat format support na kare aur raw text prompt chahiye.
function messagesToPrompt(input) {
  if (typeof input === "string") return input;

  const messages = Array.isArray(input)
    ? input
    : typeof input?.toChatMessages === "function"
      ? input.toChatMessages()
      : [input];

  return messages
    .map((message) => {
      const role = getMessageRole(message);
      const content = normalizeContent(message.content);
      return `${role.toUpperCase()}:\n${content}`; // "SYSTEM:\n..." format me convert
    })
    .join("\n\n"); // messages ke beech double newline daal do
}

// HF API ka response parse karta hai aur generated text extract karta hai.
// HF ka response format alag alag ho sakta hai depending on model aur endpoint:
// - data.generated_text (older inference API)
// - data[0].generated_text (batch format)
// - data.choices[0].message.content (OpenAI-compatible chat format — yeh humara main format hai)
// - data.choices[0].text (completions format)
// Yeh function saare formats handle karta hai taaki koi bhi model response aaye, text mil jaaye.
function parseGeneratedText(data, prompt = "") {
  const text =
    data?.generated_text ||
    data?.[0]?.generated_text ||
    data?.choices?.[0]?.message?.content ||
    data?.choices?.[0]?.text;

  if (typeof text !== "string") {
    throw new Error("Hugging Face response did not include generated text");
  }

  // kabhi kabhi model apne input prompt ko bhi output me include karta hai.
  // Agar response prompt se start ho raha hai toh prompt part hata do, sirf generated part return karo.
  return text.startsWith(prompt) ? text.slice(prompt.length).trim() : text.trim();
}

// network error ke liye readable error message banata hai.
// Jab HF API pe fetch fail ho (DNS, timeout, firewall) toh user ko samajh aaye ki problem kya hai.
// model name, host, aur underlying error cause sab include karta hai message me.
function buildNetworkErrorMessage({ model, host, error }) {
  const cause = error.cause;
  const causeMessage = [cause?.code, cause?.message]
    .filter(Boolean)
    .join(": ");

  return `Hugging Face network request failed for model "${model}"${
    causeMessage ? ` (${causeMessage})` : ""
  }. Check internet/VPN/proxy/firewall access to ${host}.`;
}

// HF ke Chat Completions API ko call karta hai — yeh humara MAIN LLM call hai.
// OpenAI-compatible format me request bhejta hai: model name, messages array, max_tokens, temperature.
// Response me model ka generated text aata hai.
// Yeh function har analysis, resume rewrite, aur interview question generation ke liye use hota hai.
async function requestHuggingFaceChat(model, messages, options = {}) {
  // API URL banao — env variable se override ho sakta hai, nahi toh default router URL
  const url = `${process.env.HF_CHAT_API_BASE || HF_CHAT_API_BASE}/chat/completions`;
  let response;

  try {
    // POST request bhejo HF API ko — model, messages, max_tokens, temperature ke saath
    response = await fetch(url, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        model,
        messages,
        // max_tokens 1400 se 3000 kiya hai kyunki naya expanded schema zyada detailed output deta hai.
        // 1400 pe AI truncate kar deta tha aur broken JSON aata tha.
        // Env variable se override ho sakta hai agar kisi specific case me alag value chahiye.
        max_tokens: Number(
          process.env.LLM_MAX_NEW_TOKENS || options.maxNewTokens || 3000
        ),
        // temperature 0.2 hai — low value matlab model zyada deterministic aur consistent rahega.
        // High temperature (0.8+) pe creative lekin unpredictable output aata hai.
        // Resume analysis ke liye low temperature better hai kyunki hume consistent, factual output chahiye.
        temperature: Number(
          process.env.LLM_TEMPERATURE || options.temperature || 0.2
        ),
      }),
    });
  } catch (error) {
    // agar fetch itself fail ho gaya (network/DNS error) toh readable message throw karo
    throw new Error(
      buildNetworkErrorMessage({
        model,
        host: new URL(url).host,
        error,
      })
    );
  }

  // response body ko JSON me parse karo. Agar parse fail ho toh empty object return karo.
  const data = await response.json().catch(() => ({}));

  // agar HTTP status 200 nahi hai (error response) toh error throw karo.
  // HF ke error message alag alag jagah ho sakte hain — data.error.message, data.error, data.message
  if (!response.ok) {
    const message =
      data.error?.message ||
      data.error ||
      data.message ||
      `Hugging Face chat request failed with ${response.status}`;
    throw new Error(message);
  }

  return data;
}

// HF ke Feature Extraction API ko call karta hai — yeh EMBEDDING generation ke liye hai.
// Text input dete hain, response me numbers ka array (vector) aata hai.
// Yeh vectors Pinecone me store hote hain — semantic search tab inhi vectors pe hoti hai.
// Jab user resume upload karta hai ya JD paste karta hai, toh text ke chunks ko vectors me convert karke
// Pinecone me store karte hain. Phir analysis ke waqt relevant chunks retrieve karte hain.
async function requestHuggingFaceFeatureExtraction(model, body) {
  // model path me special characters handle karo — "org/model-name" ko URL-safe banao
  const modelPath = model.split("/").map(encodeURIComponent).join("/");
  const baseUrl = process.env.HF_INFERENCE_API_BASE || HF_INFERENCE_API_BASE;
  const url = `${baseUrl}/${modelPath}/pipeline/feature-extraction`;
  let response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(
      buildNetworkErrorMessage({
        model,
        host: new URL(url).host,
        error,
      })
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data.error ||
      data.message ||
      `Hugging Face feature extraction request failed with ${response.status}`;
    throw new Error(message);
  }

  return data;
}

// MAIN EXPORTED FUNCTION — baaki saari files isi function ko call karti hain jab LLM se text generate karna ho.
// Input le sakta hai: plain string, LangChain messages, ya formatted prompt.
// Output: generated text string.
// Yeh function internally:
// 1. input ko HF-compatible messages format me convert karta hai
// 2. HF Chat API ko call karta hai
// 3. response se generated text extract karke return karta hai
export async function invokeTextModel(input, options = {}) {
  const model = process.env.LLM_MODEL || DEFAULT_LLM_MODEL; // kaun sa model use karna hai
  const messages = inputToMessages(input); // input ko standardized messages me convert karo
  const data = await requestHuggingFaceChat(model, messages, options); // HF API call karo

  return parseGeneratedText(data); // response se text nikaal ke return karo
}

// LangChain-compatible chat model wrapper.
// LangChain ke kuch tools .invoke() method expect karte hain jo {content: string} return kare.
// Yeh function woh wrapper provide karta hai — internally invokeTextModel use karta hai.
export function getChatModel() {
  return {
    invoke: async (input) => ({
      content: await invokeTextModel(input),
    }),
  };
}

// embedding model ka config return karta hai — model name aur expected dimension.
// Env variables se override ho sakta hai, nahi toh defaults use hote hain.
function getEmbeddingConfig() {
  return {
    model: process.env.EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL,
    dimension: Number(
      process.env.PINECONE_DIMENSION || DEFAULT_EMBEDDING_DIMENSION
    ),
  };
}

// multiple vectors ka average nikalta hai.
// Kyun zaroori hai: kabhi kabhi embedding API ek text ke liye multiple vectors return karta hai
// (jaise token-level embeddings). Hume ek single vector chahiye jo poore text ko represent kare.
// Toh saare vectors ka element-wise average le lete hain.
// Example: [[1,2,3], [4,5,6]] ka average = [2.5, 3.5, 4.5]
function averageVectors(vectors) {
  const length = vectors[0]?.length || 0;
  const totals = Array.from({ length }, () => 0); // zero-filled array banao

  // saare vectors ke corresponding elements ko add karo
  vectors.forEach((vector) => {
    vector.forEach((value, index) => {
      totals[index] += Number(value || 0);
    });
  });

  // total ko vector count se divide karo — average mil jayega
  return totals.map((value) => value / vectors.length);
}

// HF API ke embedding response se vector extract karta hai.
// HF ka response format inconsistent hota hai — kabhi flat array, kabhi nested array, kabhi doubly nested.
// Yeh function teeno cases handle karta hai:
// Case 1: [0.1, 0.2, ...] — direct flat vector (ideal case)
// Case 2: [[0.1, 0.2, ...], [0.3, 0.4, ...]] — token-level embeddings, average karo
// Case 3: [[[0.1, 0.2, ...], ...]] — extra nesting, pehle unwrap karo phir average karo
function extractEmbedding(data) {
  // Case 1 — flat array of numbers, directly return karo
  if (Array.isArray(data) && data.every((value) => typeof value === "number")) {
    return data;
  }

  // Case 2 — array of arrays, average le lo
  if (
    Array.isArray(data) &&
    Array.isArray(data[0]) &&
    data[0].every((value) => typeof value === "number")
  ) {
    return averageVectors(data);
  }

  // Case 3 — doubly nested array, pehle outer unwrap karo phir average lo
  if (
    Array.isArray(data) &&
    Array.isArray(data[0]) &&
    Array.isArray(data[0][0])
  ) {
    return averageVectors(data[0]);
  }

  // koi bhi format match nahi hua — error throw karo
  throw new Error("Hugging Face response did not include an embedding vector");
}

// ek text string ko embedding vector me convert karta hai.
// Process: text → HF Feature Extraction API → raw response → extractEmbedding → vector
// Dimension check bhi karta hai — agar returned vector ki dimension Pinecone se match nahi karti
// toh error throw karta hai (warna Pinecone upsert fail hoga).
async function embedText(text, config) {
  // text me newlines hata do — embedding models single-line text better handle karte hain
  const data = await requestHuggingFaceFeatureExtraction(config.model, {
    inputs: String(text || "").replace(/\n/g, " "),
    options: {
      wait_for_model: true, // agar model cold start me hai toh wait karo, error mat do
    },
  });
  const embedding = extractEmbedding(data);

  // dimension check — agar mismatch hai toh clear error do taaki developer ko pata chale
  if (embedding.length !== config.dimension) {
    throw new Error(
      `Embedding model "${config.model}" returned ${embedding.length} dimensions, but Pinecone expects ${config.dimension}. Update EMBEDDING_MODEL/PINECONE_DIMENSION or create a matching Pinecone index.`
    );
  }

  return embedding;
}

// MAIN EXPORTED EMBEDDING FUNCTION — baaki files (vectorStore.js) isi ko use karti hain.
// Do methods expose karta hai:
// 1. embedQuery(text) — ek text ko vector me convert karo (search query ke liye)
// 2. embedDocuments(texts) — multiple texts ko vectors me convert karo (indexing ke liye)
// Dono internally embedText() call karte hain.
export function getEmbeddingModel() {
  const config = getEmbeddingConfig();

  return {
    // ek query text ko vector me convert karo — Pinecone search ke liye use hota hai
    embedQuery: (text) => embedText(text, config),
    // multiple documents ko parallel me vectors me convert karo — bulk indexing ke liye
    embedDocuments: (documents) =>
      Promise.all(documents.map((document) => embedText(document, config))),
  };
}
