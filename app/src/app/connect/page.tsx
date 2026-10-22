import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { SITE_NAME } from "@/lib/brand";
import { siteUrl } from "@/lib/site-url";

// Setup steps for the public MCP server (app/mcp/route.ts). Dynamic so the
// endpoint shown is the deployment's own address, not the build container's.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/connect" },
  title: "Use Actively in your AI assistant",
  description: `Connect ${SITE_NAME} to Claude, ChatGPT, Codex, Cursor and other AI assistants to search products, read ingredient lists and check them against what you avoid.`,
};

function Code({ children }: { children: string }) {
  return <pre className="overflow-x-auto rounded-xl border bg-muted/50 p-3 text-xs leading-relaxed"><code>{children}</code></pre>;
}

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 rounded-2xl border bg-card p-4">
      <h2 className="text-lg font-medium">{title}</h2>
      <div className="space-y-2 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

export default function ConnectPage() {
  const url = `${siteUrl()}/mcp`;
  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-10">
      <PageHeader
        eyebrow="AI assistants"
        title={`Use ${SITE_NAME} in your AI assistant`}
        description={`Connect ${SITE_NAME} to the assistant you already use, and it can look things up in our catalog while you chat: find a product, read its ingredient list, or check a label against the ingredients and allergens you avoid.`}
      />

      <section className="space-y-2">
        <p className="text-sm text-muted-foreground">Every assistant below needs the same address:</p>
        <Code>{url}</Code>
        <p className="text-sm text-muted-foreground">
          No account or key is needed. It is read-only: your assistant can look things up, but it can&apos;t see or change your{" "}
          {SITE_NAME} profile or avoid list, so tell it what you avoid in the chat.
        </p>
      </section>

      <Step title="Claude (claude.ai, desktop and mobile)">
        <p>
          Open <strong className="text-foreground">Settings → Connectors</strong>, choose <strong className="text-foreground">Add custom connector</strong>,
          name it {SITE_NAME} and paste the address above. Then turn it on from the tools menu in a chat. Custom connectors depend on your Claude plan.
        </p>
      </Step>

      <Step title="Claude Code">
        <Code>{`claude mcp add --transport http actively ${url}`}</Code>
      </Step>

      <Step title="ChatGPT">
        <p>
          Where your plan allows custom connectors, open <strong className="text-foreground">Settings → Apps &amp; Connectors</strong>, turn on developer mode
          under Advanced, then create a connector with the address above and no authentication.
        </p>
      </Step>

      <Step title="Codex">
        <p>
          Add this to <code>~/.codex/config.toml</code>:
        </p>
        <Code>{`[mcp_servers.actively]\nurl = "${url}"`}</Code>
      </Step>

      <Step title="Cursor, Windsurf, Gemini CLI and others">
        <p>Most assistants that support MCP take a remote server address in their MCP settings file:</p>
        <Code>{`{\n  "mcpServers": {\n    "actively": { "url": "${url}" }\n  }\n}`}</Code>
        <p>
          VS Code uses <code>{`"servers": { "actively": { "type": "http", "url": "${url}" } }`}</code> in <code>.vscode/mcp.json</code>, and Gemini CLI
          calls the field <code>httpUrl</code>.
        </p>
      </Step>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">What it can do</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Search products</strong> by name, brand, ingredient or barcode, optionally leaving out anything with an
            ingredient you avoid.
          </li>
          <li>
            <strong className="text-foreground">Read a product&apos;s ingredients</strong>, with the free-from checks it passes and the contact allergens it lists.
          </li>
          <li>
            <strong className="text-foreground">Look up an ingredient</strong>: how common it is, whether it&apos;s a known contact allergen and what it
            cross-reacts with.
          </li>
          <li>
            <strong className="text-foreground">Check any ingredient list</strong> you paste, the same as our{" "}
            <Link href="/check" className="underline underline-offset-2">
              ingredient list checker
            </Link>
            .
          </li>
        </ul>
        <p className="text-sm text-muted-foreground">
          Try asking: &ldquo;Using {SITE_NAME}, find a fragrance-free moisturizer without lanolin&rdquo; or &ldquo;Check this ingredient list for
          methylisothiazolinone.&rdquo;
        </p>
      </section>

      <p className="text-xs text-muted-foreground">
        Answers come from published ingredient lists and are for education, not medical advice. Labels change, so if you have a known allergy, check
        the package and follow your clinician&apos;s advice. Lookups are rate-limited per person.
      </p>
    </div>
  );
}
