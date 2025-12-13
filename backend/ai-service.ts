const hfToken = process.env.HF_API_TOKEN || process.env.HUGGINGFACE_API_KEY;
const hfModel =
  process.env.HF_MODEL || process.env.HUGGINGFACE_MODEL || "mistralai/Mistral-7B-Instruct-v0.2";
const hfFallbackModel = process.env.HF_FALLBACK_MODEL || "google/flan-t5-large";

function getInferenceModelPath(model: string) {
  return encodeURIComponent(model).replace(/%2F/g, "/");
}

async function hfRequest(model: string, prompt: string): Promise<string> {
  if (!hfToken) {
    throw new Error("Hugging Face API token is not configured (set HF_API_TOKEN)");
  }

  const modelPath = getInferenceModelPath(model);
  const res = await fetch(`https://api-inference.huggingface.co/models/${modelPath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hfToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 512,
        return_full_text: false,
      },
      options: {
        wait_for_model: true,
      },
    }),
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as any;
      if (typeof body?.error === "string") {
        detail = body.error;
      } else if (typeof body?.message === "string") {
        detail = body.message;
      }
    } catch {
      // ignore JSON parse errors and fall back to statusText
    }
    const err: any = new Error(`Hugging Face request failed (${res.status}): ${detail}`);
    err.status = res.status;
    throw err;
  }

  const data = (await res.json()) as any;

  if (Array.isArray(data)) {
    const generated = data?.[0]?.generated_text;
    if (typeof generated === "string") {
      return generated;
    }
  }

  if (typeof data?.generated_text === "string") {
    return data.generated_text;
  }

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(data?.choices) && typeof data.choices[0] === "string") {
    return data.choices[0] as string;
  }

  return typeof data === "string" ? data : JSON.stringify(data);
}

async function hfGenerate(prompt: string): Promise<string> {
  try {
    return await hfRequest(hfModel, prompt);
  } catch (error: any) {
    const status = error?.status;
    if (status === 403 || status === 404 || status === 410 || status === 503) {
      console.warn(
        `HF model '${hfModel}' failed (${status}). Falling back to '${hfFallbackModel}'.`,
      );
      return await hfRequest(hfFallbackModel, prompt);
    }
    throw error;
  }
}

async function generateJson<T = any>(instruction: string, input: string): Promise<T> {
  const prompt =
    instruction + "\n\nReturn only valid JSON, no extra text.\n\nINPUT:\n" + input;

  const text = (await hfGenerate(prompt)) || "{}";
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    console.error("Failed to parse Hugging Face JSON-style response", text, e);
    return {} as T;
  }
}

export interface SentimentAnalysis {
  sentiment: "positive" | "negative" | "neutral";
  score: number; // -1 to 1
  keywords: string[];
}

export interface QualityScore {
  score: number; // 1-10
  reasoning: string;
}

export interface FeedbackSummary {
  summary: string;
  strengths: string[];
  improvements: string[];
  overallSentiment: string;
}

export interface TeacherRecommendation {
  teacherId: string;
  score: number;
  reasoning: string;
}

export class AIService {
  /**
   * Analyze sentiment of feedback comment
   */
  async analyzeSentiment(comment: string): Promise<SentimentAnalysis> {
    if (!comment || comment.trim().length === 0) {
      return {
        sentiment: "neutral",
        score: 0,
        keywords: [],
      };
    }

    try {
      const instruction =
        "You are a sentiment analysis expert. Analyze the sentiment of student feedback about teachers. " +
        "Return a JSON object with: sentiment (\"positive\", \"negative\", or \"neutral\"), " +
        "score (number from -1 to 1), and keywords (array of 3-5 key words or phrases).";

      const result = await generateJson<{
        sentiment?: string;
        score?: number;
        keywords?: string[];
      }>(instruction, comment);

      return {
        sentiment:
          (result.sentiment as SentimentAnalysis["sentiment"]) || "neutral",
        score: typeof result.score === "number" ? result.score : 0,
        keywords: Array.isArray(result.keywords) ? result.keywords : [],
      };
    } catch (error) {
      console.error("Sentiment analysis error:", error);
      return {
        sentiment: "neutral",
        score: 0,
        keywords: [],
      };
    }
  }

  /**
   * Score feedback quality (helpfulness, detail, constructiveness)
   */
  async scoreFeedbackQuality(comment: string, rating: number): Promise<QualityScore> {
    if (!comment || comment.trim().length === 0) {
      return {
        score: 1,
        reasoning: "No comment provided",
      };
    }

    try {
      const instruction =
        "You are an education feedback quality assessor. Rate the quality and helpfulness of student feedback on a scale of 1-10. " +
        "Consider specificity, constructiveness, actionable insights, and clarity. " +
        "Return JSON with: score (number 1-10) and reasoning (brief explanation).";

      const result = await generateJson<{
        score?: number;
        reasoning?: string;
      }>(instruction, `Rating: ${rating}/5, Comment: ${comment}`);

      const rawScore = typeof result.score === "number" ? result.score : 5;
      const clamped = Math.min(10, Math.max(1, rawScore));

      return {
        score: clamped,
        reasoning: result.reasoning || "Average quality feedback",
      };
    } catch (error) {
      console.error("Quality scoring error:", error);
      return {
        score: 5,
        reasoning: "Unable to assess quality",
      };
    }
  }

  /**
   * Generate comprehensive summary of all feedback for a teacher
   */
  async generateFeedbackSummary(
    feedbackList: Array<{ rating: number; comment: string | null }>
  ): Promise<FeedbackSummary> {
    if (feedbackList.length === 0) {
      return {
        summary: "No feedback available yet.",
        strengths: [],
        improvements: [],
        overallSentiment: "neutral",
      };
    }

    const comments = feedbackList
      .filter((f) => f.comment && f.comment.trim().length > 0)
      .map((f) => `[Rating: ${f.rating}/5] ${f.comment}`)
      .join("\n");

    if (!comments) {
      return {
        summary: `Received ${feedbackList.length} ratings with no written comments.`,
        strengths: [],
        improvements: [],
        overallSentiment: "neutral",
      };
    }

    try {
      const instruction =
        "You are an educational analyst. Summarize student feedback for a teacher. " +
        "Return JSON with: summary (2-3 sentence overview), strengths (array of 3-5 key strengths), " +
        "improvements (array of 3-5 areas for improvement), overallSentiment (\"positive\", \"negative\", or \"mixed\").";

      const result = await generateJson<{
        summary?: string;
        strengths?: string[];
        improvements?: string[];
        overallSentiment?: string;
      }>(instruction, comments);

      return {
        summary: result.summary || "Summary unavailable",
        strengths: Array.isArray(result.strengths) ? result.strengths : [],
        improvements: Array.isArray(result.improvements)
          ? result.improvements
          : [],
        overallSentiment: result.overallSentiment || "neutral",
      };
    } catch (error) {
      console.error("Summary generation error:", error);
      return {
        summary: "Unable to generate summary at this time.",
        strengths: [],
        improvements: [],
        overallSentiment: "neutral",
      };
    }
  }

  /**
   * Recommend teachers based on student preferences
   */
  async recommendTeachers(
    studentPreferences: string,
    availableTeachers: Array<{
      id: string;
      name: string;
      department: string;
      subject: string;
      averageRating: number | null;
      bio: string | null;
    }>
  ): Promise<TeacherRecommendation[]> {
    if (availableTeachers.length === 0) {
      return [];
    }

    const teacherInfo = availableTeachers
      .map(
        (t) =>
          `ID: ${t.id}, Name: ${t.name}, Subject: ${t.subject}, Dept: ${t.department}, Rating: ${
            t.averageRating || "N/A"
          }, Bio: ${t.bio || "N/A"}`
      )
      .join("\n");

    try {
      const instruction =
        "You are a teacher recommendation system. Based on student preferences and the list of available teachers, " +
        "recommend the top 3 most suitable teachers. Return JSON with a \"recommendations\" array; each item has: " +
        "teacherId (string), score (number 0-100), reasoning (string).";

      const result = await generateJson<{
        recommendations?: TeacherRecommendation[];
      }>(
        instruction,
        `Student preferences: ${studentPreferences}\n\nAvailable teachers:\n${teacherInfo}`
      );

      return Array.isArray(result.recommendations)
        ? result.recommendations.slice(0, 3)
        : [];
    } catch (error) {
      console.error("Recommendation error:", error);
      return [];
    }
  }

  /**
   * Generate suggested reply templates for a given feedback comment
   */
  async generateReplyTemplates(comment: string): Promise<string[]> {
    if (!comment || comment.trim().length === 0) {
      return [];
    }

    try {
      const instruction =
        "You help teachers write short, polite, and professional replies to student feedback. " +
        "Given the student's comment, generate 2-3 different reply options that: " +
        "1) thank the student, 2) acknowledge their point, and 3) briefly mention an action or intention. " +
        "Return JSON with a single field 'templates' which is an array of reply strings.";

      const result = await generateJson<{
        templates?: string[];
      }>(instruction, comment);

      if (Array.isArray(result.templates)) {
        return result.templates.filter((t) => typeof t === "string" && t.trim().length > 0).slice(0, 3);
      }

      return [];
    } catch (error) {
      console.error("Reply template generation error:", error);
      return [];
    }
  }

  /**
   * Improve a student's feedback comment to be more clear, polite, and constructive
   */
  async improveFeedback(comment: string): Promise<string> {
    const original = (comment || "").trim();
    if (!original) {
      return original;
    }

    const instruction =
      "You are an assistant that rewrites student feedback about a lecture or teacher. " +
      "Keep the original meaning, but make the text more polite, clear, and constructive. " +
      "Do not add new complaints or compliments that were not there. Return only the rewritten feedback.";

    try {
      const prompt = instruction + "\n\nOriginal feedback:\n" + original + "\n\nImproved feedback:";
      const improved = await hfGenerate(prompt);
      const normalized = (improved || "").trim();
      if (!normalized) {
        // Fallback if the model responds with empty content
        return `Thank you for your feedback. ${original}`;
      }

      // If the model just echoes the same text, add a light-touch improvement wrapper
      if (normalized === original) {
        return `Thank you for your detailed feedback. ${original}`;
      }

      return normalized;
    } catch (error) {
      console.error("Improve feedback error:", error);
      // Ensure we still return something that looks slightly improved
      return `Thank you for your feedback. ${original}`;
    }
  }

  /**
   * Chatbot for answering common queries
   */
  async chatbot(
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }> = []
  ): Promise<string> {
    try {
      const historyText = conversationHistory
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n");

      const systemPrompt =
        "You are EduBot, a helpful assistant for the EduFeedback system - a lecture feedback platform. " +
        "You help students and teachers with: how to give feedback, how to view feedback, understanding ratings and analytics, navigation help, and teacher profile information. " +
        "Be concise, friendly, and helpful. If you don't know something, admit it.";

      const prompt =
        systemPrompt +
        "\n\nConversation so far (if any):\n" +
        (historyText ? historyText + "\n\n" : "") +
        "USER: " +
        userMessage +
        "\nASSISTANT:";

      const text = await hfGenerate(prompt);
      const trimmed = text.trim();
      return trimmed || "I'm sorry, I couldn't process that.";
    } catch (error) {
      console.error("Chatbot error:", error);
      const anyError = error as any;
      if (anyError?.code === "insufficient_quota" || anyError?.status === 429) {
        return "AI service is temporarily unavailable due to quota limits. Please contact the admin.";
      }

      return "I'm experiencing technical difficulties. Please try again later.";
    }
  }
}

export const aiService = new AIService();
