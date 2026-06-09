import { AskChat } from "@/components/ask-chat";

// Entity-scoped AI chat. Tag "units" (property/bid/lead/contact/company) and
// ask about them; answers are grounded in those records' live data. Runs in an
// offline mock until ANTHROPIC_API_KEY is set, after which real Claude answers.
export default function AskPage() {
  return <AskChat />;
}
