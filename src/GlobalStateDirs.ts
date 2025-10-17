
export type GlobalStateDirs = Record<
  string, Record<
    string, {
      languages: Record<string, number>;
      starred: boolean;
    }
  >
>;
