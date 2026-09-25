/** Renders the admin-editable legal text: "# " heading, "## " subheading, "- " list item, other lines paragraphs. */
export default function LegalText({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) out.push(<ul key={out.length} className="mb-3 grid list-disc gap-1 pl-5">{list.map((l, i) => <li key={i}>{l}</li>)}</ul>);
    list = [];
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("- ")) { list.push(line.slice(2)); continue; }
    flush();
    if (!line) continue;
    if (line.startsWith("## ")) out.push(<h3 key={out.length} className="mb-2 mt-6 text-lg font-bold">{line.slice(3)}</h3>);
    else if (line.startsWith("# ")) out.push(<h1 key={out.length} className="mb-4 text-[clamp(26px,4vw,34px)] font-bold">{line.slice(2)}</h1>);
    else out.push(<p key={out.length} className="mb-3">{line}</p>);
  }
  flush();
  return <div className="text-[15px] text-secondary [&_h1]:text-ink [&_h3]:text-ink">{out}</div>;
}
