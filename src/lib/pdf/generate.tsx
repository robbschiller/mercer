import { renderToBuffer } from "@react-pdf/renderer";
import { ProposalDocument } from "./proposal-template";
import type { ProposalSnapshot } from "./types";

export async function generateProposalPdf(
  snapshot: ProposalSnapshot
): Promise<Buffer> {
  const buffer = await renderToBuffer(
    <ProposalDocument snapshot={snapshot} />
  );
  return Buffer.from(buffer);
}
