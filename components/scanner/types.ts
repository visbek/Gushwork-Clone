export type EngineResult = { appeared: boolean; snippet: string };
export type Category =
  | "informational"
  | "discovery"
  | "commercial"
  | "transactional";

export type PromptResult = {
  prompt: string;
  category: Category;
  gemini: EngineResult;
  claude: EngineResult;
  chatgpt: EngineResult;
  perplexity: EngineResult;
};

export type EngineInfo = { score: number; available: boolean };

export type BusinessProfile = {
  companyName: string;
  whatTheySell: string;
  industry: string;
  geography: string;
  businessModel: string;
};

export type ICP = {
  primaryBuyer: string;
  buyerLocation: string;
  buyerCompanySize: string;
  buyerPainPoint: string;
  buyerContext: string;
};

export type CategoryScore = { appeared: number; total: number };

export type ScanData = {
  overallScore: number;
  businessProfile: BusinessProfile;
  icp: ICP;
  engines: Record<"gemini" | "claude" | "chatgpt" | "perplexity", EngineInfo>;
  categoryScores: Record<Category, CategoryScore>;
  results: PromptResult[];
};

export type ScanStatus =
  | "idle"
  | "generating"
  | "scanning"
  | "done"
  | "error";

export type EngineState = "idle" | "scanning" | "analyzing" | "done";
