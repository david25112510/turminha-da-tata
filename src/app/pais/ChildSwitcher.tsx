import Link from "next/link";

type Props = {
  basePath: string;
  activeChildId: string;
  guardianChildren: { childId: string; child: { fullName: string; preferredName: string | null } }[];
};

export function ChildSwitcher({ basePath, activeChildId, guardianChildren }: Props) {
  if (guardianChildren.length <= 1) return null;

  return (
    <div className="flex gap-2 flex-wrap">
      {guardianChildren.map((link) => (
        <Link
          key={link.childId}
          href={`${basePath}?childId=${link.childId}`}
          className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
            link.childId === activeChildId
              ? "bg-[#1FA787] text-white"
              : "bg-white text-[#6B5D4A] border border-[#ECE1CB]"
          }`}
        >
          {link.child.preferredName || link.child.fullName}
        </Link>
      ))}
    </div>
  );
}
