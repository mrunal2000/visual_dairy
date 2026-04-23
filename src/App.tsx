import { useState } from "react";
import { AuthPanel } from "@/components/AuthPanel";
import { EntryComposer, type Draft } from "@/components/EntryComposer";
import { EntryTimeline } from "@/components/EntryTimeline";
import {
  canWriteJournal,
  getPublicJournalUserId,
  isJournalTimelineReadOnly,
} from "@/lib/supabase";
import { useAuth } from "@/useAuth";
import { useJournal } from "@/useJournal";

function emptyDraft(): Draft {
  return {
    dateLabel: "",
    title: "",
    description: "",
    blocks: [],
  };
}

export function App() {
  const { user, loading: authLoading, cloudEnabled, signOut } = useAuth();
  const { entries, remoteLoading, addEntry, removeEntry, updateEntry } =
    useJournal(user?.id ?? null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [authOpen, setAuthOpen] = useState(false);

  const publicOwnerId = getPublicJournalUserId();
  const hasEntries = entries.length > 0;
  const canEdit = canWriteJournal(cloudEnabled, user?.id ?? null, publicOwnerId);
  const timelineReadOnly = isJournalTimelineReadOnly(
    cloudEnabled,
    user?.id ?? null,
    publicOwnerId,
  );
  const showJournal =
    !cloudEnabled || user || Boolean(publicOwnerId);

  const onSave = () => {
    addEntry({
      dateLabel: draft.dateLabel.trim(),
      title: draft.title.trim(),
      description: draft.description.trim(),
      blocks: draft.blocks.map((b) => ({ ...b })),
    });
    setDraft(emptyDraft());
  };

  if (cloudEnabled && authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FCFBF7] text-sm text-[#6B6B6B]">
        Loading…
      </div>
    );
  }

  if (cloudEnabled && !user && !publicOwnerId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#FCFBF7] px-6 py-16">
        <h1 className="font-[family-name:var(--font-display)] text-lg leading-[22px] text-black">
          My Visual Journal
        </h1>
        <p className="max-w-[360px] text-center text-sm leading-[18px] text-[#6B6B6B]">
          Set <code className="text-[13px] text-black/80">VITE_JOURNAL_PUBLIC_USER_ID</code>{" "}
          to your Supabase user UUID so visitors can read your journal without signing in,
          or sign in below to use the app privately.
        </p>
        <AuthPanel />
      </div>
    );
  }

  const busy = cloudEnabled && remoteLoading;

  return (
    <div className="min-h-screen bg-[#FCFBF7] text-black">
      {cloudEnabled ? (
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 border-b border-black/[0.06] px-6 py-3">
          {user ? (
            <>
              {publicOwnerId && user.id !== publicOwnerId ? (
                <span className="text-xs leading-[18px] tracking-[-0.02em] text-[#6B6B6B]">
                  Read-only with this account — only the journal owner can add or
                  edit.
                </span>
              ) : null}
              <button
                type="button"
                className="text-xs leading-[18px] tracking-[-0.02em] text-[#6B6B6B] underline decoration-[#6B6B6B]/30 underline-offset-[3px] hover:text-black"
                onClick={() => void signOut()}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <span className="text-xs leading-[18px] tracking-[-0.02em] text-[#6B6B6B]">
                Public view — no account needed. Sign in as the owner to add or
                edit.
              </span>
              <button
                type="button"
                className="text-xs leading-[18px] tracking-[-0.02em] text-[#6B6B6B] underline decoration-[#6B6B6B]/30 underline-offset-[3px] hover:text-black"
                aria-expanded={authOpen}
                onClick={() => setAuthOpen((o) => !o)}
              >
                {authOpen ? "Close" : "Sign in"}
              </button>
            </>
          )}
        </div>
      ) : null}

      {authOpen && cloudEnabled && !user ? (
        <div className="border-b border-black/[0.06] bg-[#FCFBF7] px-6 py-6">
          <AuthPanel />
        </div>
      ) : null}

      {showJournal && !busy ? (
        <>
          <div className="mx-auto flex w-full min-w-0 max-w-[607px] flex-col items-center gap-[59px] px-6 pb-10 pt-10">
            <h1 className="font-[family-name:var(--font-display)] text-lg leading-[22px] text-black">
              My Visual Journal
            </h1>
            {hasEntries ? (
              <div className="flex w-full min-w-0 flex-col items-stretch gap-10">
                <EntryTimeline
                  entries={entries}
                  readOnly={timelineReadOnly}
                  onDelete={removeEntry}
                  onUpdateEntry={updateEntry}
                />
              </div>
            ) : !canEdit ? (
              <p className="text-center text-sm leading-[18px] text-[#6B6B6B]">
                No entries yet.
              </p>
            ) : null}
          </div>

          {canEdit ? (
            <EntryComposer
              draft={draft}
              onChange={setDraft}
              onSave={onSave}
              layout={hasEntries ? "footer" : "empty"}
            />
          ) : null}
        </>
      ) : null}

      {showJournal && busy ? (
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-[#6B6B6B]">
          Loading your journal…
        </div>
      ) : null}
    </div>
  );
}
