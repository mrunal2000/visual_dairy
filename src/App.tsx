import { useState } from "react";
import { EntryComposer, type Draft } from "@/components/EntryComposer";
import { EntryTimeline } from "@/components/EntryTimeline";
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
  const { entries, addEntry, removeEntry, updateEntry } = useJournal();
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const hasEntries = entries.length > 0;

  const onSave = () => {
    addEntry({
      dateLabel: draft.dateLabel.trim(),
      title: draft.title.trim(),
      description: draft.description.trim(),
      blocks: draft.blocks.map((b) => ({ ...b })),
    });
    setDraft(emptyDraft());
  };

  return (
    <div className="min-h-screen bg-[#FCFBF7] text-black">
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
    </div>
  );
}
