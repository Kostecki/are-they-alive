import { useCallback, useMemo } from "react";

import type { NormalizedCast } from "~/types";

import { calculateAge } from "~/utils/helpers";

export function useCastSorting(
  rawCast: NormalizedCast[],
  groupByStatus: boolean,
  sortBy: string,
  sortOrder: "asc" | "desc",
) {
  // Memoize the comparison function separately for better performance
  const compare = useCallback(
    (a: NormalizedCast, b: NormalizedCast) => {
      let result = 0;

      switch (sortBy) {
        case "appearance":
          result = (a.order ?? 0) - (b.order ?? 0);
          break;
        case "age": {
          const getAge = (member: NormalizedCast) => {
            if (!member.birthday) return 0;
            return calculateAge(member.birthday, member.deathday);
          };
          result = getAge(a) - getAge(b);
          break;
        }
        case "alphabetical":
          result = (a.name ?? "").localeCompare(b.name ?? "");
          break;
        case "death":
          if (a.deathday && b.deathday) {
            result =
              new Date(a.deathday).getTime() - new Date(b.deathday).getTime();
          } else if (a.deathday) {
            result = 1;
          } else if (b.deathday) {
            result = -1;
          } else {
            result = 0;
          }
          break;
        default:
          result = 0;
      }

      return sortOrder === "asc" ? result : -result;
    },
    [sortBy, sortOrder],
  );

  const castSections = useMemo(() => {
    if (!rawCast.length) return [];

    const getStatus = (member: NormalizedCast) => {
      if (member.deathday) return "Deceased";
      if (member.birthday) return "Alive";
      return "Unknown";
    };

    if (!groupByStatus) {
      return [{ title: "all", members: [...rawCast].sort(compare) }];
    }

    // Group by status
    const groups: Record<string, NormalizedCast[]> = {
      Alive: [],
      Deceased: [],
      Unknown: [],
    };

    rawCast.forEach((member) => {
      groups[getStatus(member)].push(member);
    });

    // Sort each group individually
    Object.keys(groups).forEach((status) => {
      groups[status].sort(compare);
    });

    return [
      { title: "Alive", members: groups.Alive },
      { title: "Deceased", members: groups.Deceased },
      { title: "Unknown", members: groups.Unknown },
    ].filter((section) => section.members.length > 0);
  }, [rawCast, groupByStatus, compare]);

  return castSections;
}
