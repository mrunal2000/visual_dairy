import { useState } from "react";
import { AuthPanel } from "@/components/AuthPanel";
import { EntryComposer, type Draft } from "@/components/EntryComposer";
import { EntryTimeline } from "@/components/EntryTimeline";
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

  const hasEntries = entries.length > 0;
  const showJournal = !cloudEnabled || user;

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

  if (cloudEnabled && !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#FCFBF7] px-6 py-16">
        <h1 className="font-[family-name:var(--font-display)] text-lg leading-[22px] text-black">
          My Visual Journal
        </h1>
        <AuthPanel />
      </div>
    );
  }

  const busy = cloudEnabled && remoteLoading;

  return (
    <div className="min-h-screen bg-[#FCFBF7] text-black">
      {cloudEnabled ? (
        <div className="flex justify-end border-b border-black/[0.06] px-6 py-3">
          <button
            type="button"
            className="text-xs leading-[18px] tracking-[-0.02em] text-[#6B6B6B] underline decoration-[#6B6B6B]/30 underline-offset-[3px] hover:text-black"
            onClick={() => void signOut()}
          >
            Sign out
          </button>
        </div>
      ) : null}

      {showJournal && !busy ? (
        <>
          {hasEntries ? (
            <div className="mx-auto flex w-full min-w-0 max-w-[607px] flex-col items-center gap-[59px] px-6 pb-10 pt-10">
              <h1 className="font-[family-name:var(--font-display)] text-lg leading-[22px] text-black">
                My Visual Journal
              </h1>
              <div className="flex w-full min-w-0 flex-col items-stretch gap-10">
                <EntryTimeline
                  entries={entries}
                  onDelete={removeEntry}
                  onUpdateEntry={updateEntry}
                />
              </div>
            </div>
          ) : null}

          <EntryComposer
            draft={draft}
            onChange={setDraft}
            onSave={onSave}
            layout={hasEntries ? "footer" : "empty"}
          />
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
