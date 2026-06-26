import { useAppStore } from '../store/appStore';
import { GROUP_LETTERS } from '../data/groups.mock';
import { GroupCard } from './GroupCard';

export function GroupsPanel() {
  const groups = useAppStore((s) => s.groups);

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {GROUP_LETTERS.map((l) => (
        <GroupCard key={l} group={groups[l]} />
      ))}
    </div>
  );
}
