import { Check, Copy, ExternalLink } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ForwardingSetupDocsProps {
  /** The SendGrid parse address emails must be forwarded to */
  parseAddress: string
  /** The public address customers write to */
  publicEmail?: string | null
}

const Step = ({
  index,
  title,
  children,
}: {
  index: number
  title: string
  children?: React.ReactNode
}) => (
  <li className="flex gap-3">
    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
      {index}
    </span>
    <div className="space-y-1">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {children ? <div className="text-xs text-muted-foreground space-y-1">{children}</div> : null}
    </div>
  </li>
)

export const ForwardingSetupDocs = ({ parseAddress, publicEmail }: ForwardingSetupDocsProps) => {
  const [copied, setCopied] = useState(false)
  const target = publicEmail || "your public address"

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(parseAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-foreground">Forwarding setup instructions</p>
        <p className="text-xs text-muted-foreground">
          Pick how <span className="font-medium text-foreground">{target}</span> is hosted, then
          follow the steps.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded bg-muted/50 px-2 py-1.5 font-mono text-xs">
          {parseAddress}
        </code>
        <Button variant="outline" size="sm" type="button" onClick={copy}>
          {copied ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      <Tabs defaultValue="gmail">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="gmail" className="text-xs">
            Gmail
          </TabsTrigger>
          <TabsTrigger value="group" className="text-xs">
            Google Group
          </TabsTrigger>
          <TabsTrigger value="workspace" className="text-xs">
            Workspace routing
          </TabsTrigger>
        </TabsList>

        {/* Personal / single mailbox forwarding */}
        <TabsContent value="gmail" className="mt-3">
          <p className="mb-2 text-xs text-muted-foreground">
            Use this when the address is a normal Gmail mailbox that one person signs into.
          </p>
          <ol className="space-y-3">
            <Step index={1} title="Open Gmail settings">
              <p>
                Sign in as {target} → gear icon → See all settings →{" "}
                <strong>Forwarding and POP/IMAP</strong>.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-1"
                type="button"
                onClick={() =>
                  window.open("https://mail.google.com/mail/u/0/#settings/fwdandpop", "_blank")
                }
              >
                <ExternalLink className="mr-2 h-3 w-3" />
                Open Gmail forwarding settings
              </Button>
            </Step>
            <Step index={2} title="Add a forwarding address">
              <p>
                Click <strong>Add a forwarding address</strong> and paste the parse address above.
              </p>
            </Step>
            <Step index={3} title="Confirm the verification email">
              <p>
                Google sends a confirmation link to the parse address. It arrives in the linked
                inbox in Support Hub — open it and click the link (or paste the confirmation code
                back into Gmail).
              </p>
            </Step>
            <Step index={4} title="Enable forwarding">
              <p>
                Select <strong>Forward a copy of incoming mail to</strong> and choose the parse
                address. Keep Gmail's copy in the inbox so nothing is lost.
              </p>
            </Step>
            <Step index={5} title="Turn off spam filtering surprises">
              <p>
                Add a filter (Settings → Filters) matching all mail with{" "}
                <strong>Never send it to Spam</strong> so support mail always forwards.
              </p>
            </Step>
            <Step index={6} title="Send a test email">
              <p>
                Email {target} from an outside address and confirm it appears in the linked inbox.
              </p>
            </Step>
          </ol>
        </TabsContent>

        {/* Google Group */}
        <TabsContent value="group" className="mt-3">
          <p className="mb-2 text-xs text-muted-foreground">
            Use this when the address is a Google Group (shared team alias). This is the recommended
            setup.
          </p>
          <ol className="space-y-3">
            <Step index={1} title="Open the group in Google Admin">
              <p>Directory → Groups → select {target}.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-1"
                type="button"
                onClick={() => window.open("https://admin.google.com/ac/groups", "_blank")}
              >
                <ExternalLink className="mr-2 h-3 w-3" />
                Open Google Admin groups
              </Button>
            </Step>
            <Step index={2} title="Add the parse address as a member">
              <p>
                Members → Add members → paste the parse address. Role: <strong>Member</strong>,
                subscription: <strong>Each email</strong>.
              </p>
            </Step>
            <Step index={3} title="Allow external members">
              <p>
                Group settings → <strong>Allow members outside your organization</strong> = On
                (required, the parse address is external).
              </p>
            </Step>
            <Step index={4} title="Allow external senders to post">
              <p>
                Access settings → Who can post → <strong>Anyone on the web</strong>, so customer
                emails reach the group.
              </p>
            </Step>
            <Step index={5} title="Do not moderate or bounce">
              <p>
                Turn off message moderation and spam moderation ("Skip the moderation queue"),
                otherwise mail is held instead of forwarded.
              </p>
            </Step>
            <Step index={6} title="Send a test email">
              <p>
                Email {target} from an outside address and confirm it lands in the linked inbox
                within a minute or two.
              </p>
            </Step>
          </ol>
        </TabsContent>

        {/* Workspace routing rule */}
        <TabsContent value="workspace" className="mt-3">
          <p className="mb-2 text-xs text-muted-foreground">
            Use this when the address must keep delivering to Google Workspace and you also want a
            copy sent to Support Hub — works for users, aliases and groups.
          </p>
          <ol className="space-y-3">
            <Step index={1} title="Open routing settings">
              <p>
                Google Admin → Apps → Google Workspace → <strong>Gmail</strong> →{" "}
                <strong>Routing</strong> → Configure.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-1"
                type="button"
                onClick={() =>
                  window.open("https://admin.google.com/ac/apps/gmail/routing", "_blank")
                }
              >
                <ExternalLink className="mr-2 h-3 w-3" />
                Open Gmail routing
              </Button>
            </Step>
            <Step index={2} title="Apply to inbound messages">
              <p>
                Name the rule (e.g. "Support Hub forwarding") and tick <strong>Inbound</strong>{" "}
                only.
              </p>
            </Step>
            <Step index={3} title="Match the envelope recipient">
              <p>
                Choose <strong>Only affect specific envelope recipients</strong> → Single recipient
                → enter <strong>{target}</strong>. This is your public address, not the parse
                address.
              </p>
            </Step>
            <Step index={4} title="Also deliver to the parse address">
              <p>
                Under "Also deliver to" → <strong>Add more recipients</strong> → Add → paste the
                parse address. Leave "Suppress bounces" off.
              </p>
            </Step>
            <Step index={5} title="Recommended extra options">
              <p>
                Tick <strong>Bypass spam filter for this message</strong> and{" "}
                <strong>Add X-Gm-Original-To header</strong> (helps routing and threading).
              </p>
              <p>
                Leave custom headers, subject prefix, envelope changes and "remove attachments"
                unchecked.
              </p>
            </Step>
            <Step index={6} title="Choose the address scope">
              <p>
                Under Options, select{" "}
                <strong>Perform this action on non-recognized and recognized addresses</strong>.
              </p>
            </Step>
            <Step index={7} title="Save and test">
              <p>
                Save the rule (it can take a few minutes to apply), then email {target} from outside
                and confirm it arrives in the linked inbox.
              </p>
            </Step>
          </ol>
        </TabsContent>
      </Tabs>
    </div>
  )
}
