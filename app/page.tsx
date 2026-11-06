import { askSamples } from "./_lib/samples";
import { AskClient } from "./ask-client";

export const dynamic = "force-dynamic";

export default function AskPage() {
  return (
    <>
      <h1>One question, answered from Tidewell&apos;s documents only</h1>
      <p className="lede">
        Cited searches Tidewell&apos;s 32 policy documents, drafts an answer, and marks the exact words that back every claim. If
        the documents don&apos;t say, it says so and sends the question to a human.
      </p>
      <AskClient samples={askSamples()} />
    </>
  );
}
