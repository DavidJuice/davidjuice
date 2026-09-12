export default function Dashboard() {
  return (
    <>
      <h1>Dashboard</h1>
      <p className="muted">
        Milestone 1 workflow: upload one Summary of Benefits, review the extracted facts
        against their source pages, then open the plan and ask questions.
      </p>
      <div className="notice">
        Internal research tool for licensed agents. Output is not CMS-approved marketing
        material and must not be presented to a beneficiary.
      </div>
      <h2>Workflow</h2>
      <ol>
        <li><a href="/documents/upload">Upload a Summary of Benefits PDF</a></li>
        <li><a href="/review">Approve, correct, or reject each extracted fact</a></li>
        <li><a href="/search">Search verified benefits across plans</a></li>
      </ol>
      <h2>Strict Evidence Mode</h2>
      <p className="muted">
        On by default. Only facts a reviewer has marked <b>verified</b> are used for
        structured answers, and any document-based answer without a citation is replaced
        with a refusal rather than an unsupported claim.
      </p>
    </>
  );
}
