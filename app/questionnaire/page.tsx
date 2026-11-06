import { questionnaireSample } from "../_lib/samples";
import { QuestionnaireClient } from "./questionnaire-client";

export const dynamic = "force-dynamic";

export default function QuestionnairePage() {
  return (
    <>
      <h1>Answer a whole questionnaire, then review what&apos;s flagged</h1>
      <p className="lede">
        Paste one question per line or upload a CSV with <span className="mono">question_id</span> and{" "}
        <span className="mono">question</span> columns. Each question is answered on its own, with no memory of the others.
      </p>
      <QuestionnaireClient sample={questionnaireSample()} />
    </>
  );
}
