import type { User } from "@/types/user";

type Props = {
  value?: number;
  users: User[];
  onChange: (value: number | undefined) => void;
  disabled?: boolean;
};

export default function AssigneeDropdown({
  value,
  users,
  onChange,
  disabled,
}: Props) {
  return (
    <select
      className="w-full rounded-lg border border-slate-300 px-3 py-2"
      value={value ?? ""}
      onChange={(e) => {
        const selected = e.target.value;
        onChange(selected ? Number(selected) : undefined);
      }}
      disabled={disabled}
    >
      <option value="">Pilih assignee</option>
      {users.map((user) => (
        <option key={user.id} value={user.id}>
          {user.name} ({user.email})
        </option>
      ))}
    </select>
  );
}
